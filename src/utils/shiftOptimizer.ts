// シフト最適化エンジン（局所探索: Hill Climbing）
import { parseISO, startOfWeek, endOfWeek, isWithinInterval } from 'date-fns'
import type {
  ShiftAssignment,
  Staff,
  HelpStaff,
  PreferredDayOff,
  TimeSlot,
  EvalResult,
  OptimizationConfig,
  OptimizerInput,
} from '../types'
import { DEFAULT_OPTIMIZATION_CONFIG, ALL_TIME_SLOTS } from '../types'

// ---------------------------------------------------------------------------
// 内部表現
// ---------------------------------------------------------------------------

/**
 * 最適化中の内部状態。
 * working[staffIndex][dateIndex]: そのスタッフがその日に出勤するか
 */
export interface InternalState {
  /** 出勤フラグ */
  working: boolean[][]
  /** スタッフID順（staffInfoのインデックスと対応） */
  staffIds: string[]
  /** 日付一覧（インデックスと対応） */
  dates: string[]
  /** スタッフごとの付加情報 */
  staffInfo: StaffInfo[]
}

/** 最適化で使うスタッフ単位の情報 */
interface StaffInfo {
  id: string
  isHelp: boolean
  usesParking: boolean
  /** 出勤可能な時間帯のインデックス（0=morning,1=afternoon,2=evening）*/
  availableSlotIndices: number[]
  /** 通常スタッフの週上限合計（期間内週数×週上限）。ヘルプは0 */
  weeklyCapacity: number
  /** 希望休の日付セット */
  preferredDayOffDates: Set<string>
  /** ヘルプスタッフの出勤可能日付セット（通常スタッフはnull） */
  availableDates: Set<string> | null
  /** 週ごとの最大出勤日数（通常スタッフのみ） */
  maxWeeklyShifts: number
}

/** evaluate() に渡すパラメータ（テスト用に分離） */
export interface EvaluateParams {
  working: boolean[][]
  isRegularStaff: boolean[]
  staffIsParking: boolean[]
  /** 期間内の週上限合計（通常スタッフのみ、ヘルプは任意） */
  weeklyCapacity: number[]
  /** staffSlots[i]: スタッフiの出勤可能スロットインデックスリスト */
  staffSlots: number[][]
  dates: string[]
  /** requiredCounts[dateIndex][slotIndex]: 必要人数 */
  requiredCounts: number[][]
}

// ---------------------------------------------------------------------------
// 評価関数
// ---------------------------------------------------------------------------

/**
 * 解の評価値を計算する。
 * 値が小さいほど良い解（isBetter で辞書式比較）。
 */
export function evaluate(params: EvaluateParams): EvalResult {
  const { working, isRegularStaff, staffIsParking, weeklyCapacity, staffSlots, dates, requiredCounts } = params
  const numStaff = working.length
  const numDates = dates.length
  const numSlots = 3

  // --- 評価基準1: 不足ピーク ---
  let shortfallPeak = 0
  for (let d = 0; d < numDates; d++) {
    for (let s = 0; s < numSlots; s++) {
      const required = requiredCounts[d][s]
      if (required <= 0) continue
      let assigned = 0
      for (let i = 0; i < numStaff; i++) {
        if (working[i][d] && staffSlots[i].includes(s)) {
          assigned++
        }
      }
      const shortfall = Math.max(0, required - assigned)
      if (shortfall > shortfallPeak) shortfallPeak = shortfall
    }
  }

  // --- 評価基準2: 公平性（残余容量の母分散）---
  // 通常スタッフのみ対象
  const regularResiduals: number[] = []
  for (let i = 0; i < numStaff; i++) {
    if (!isRegularStaff[i]) continue
    let workedDays = 0
    for (let d = 0; d < numDates; d++) {
      if (working[i][d]) workedDays++
    }
    regularResiduals.push(weeklyCapacity[i] - workedDays)
  }
  let fairnessVariance = 0
  if (regularResiduals.length > 0) {
    const mean = regularResiduals.reduce((a, b) => a + b, 0) / regularResiduals.length
    fairnessVariance =
      regularResiduals.reduce((acc, r) => acc + (r - mean) ** 2, 0) / regularResiduals.length
  }

  // --- 評価基準3: 駐車場ピーク ---
  let parkingPeak = 0
  for (let d = 0; d < numDates; d++) {
    let parkingCount = 0
    for (let i = 0; i < numStaff; i++) {
      if (working[i][d] && staffIsParking[i]) {
        parkingCount++
      }
    }
    if (parkingCount > parkingPeak) parkingPeak = parkingCount
  }

  return { shortfallPeak, fairnessVariance, parkingPeak }
}

/**
 * 辞書式比較で candidate が current より良いか判定する。
 * 良い = 値が小さい（小さい方が優先）
 */
export function isBetter(candidate: EvalResult, current: EvalResult): boolean {
  if (candidate.shortfallPeak !== current.shortfallPeak) {
    return candidate.shortfallPeak < current.shortfallPeak
  }
  if (candidate.fairnessVariance !== current.fairnessVariance) {
    return candidate.fairnessVariance < current.fairnessVariance
  }
  return candidate.parkingPeak < current.parkingPeak
}

// ---------------------------------------------------------------------------
// 制約チェック
// ---------------------------------------------------------------------------

/** 週内の出勤日数を返す */
function getWeeklyWorkCount(
  staffIndex: number,
  dateIndex: number,
  working: boolean[][],
  dates: string[],
): number {
  const target = parseISO(dates[dateIndex])
  const weekStart = startOfWeek(target, { weekStartsOn: 1 })
  const weekEnd = endOfWeek(target, { weekStartsOn: 1 })
  let count = 0
  for (let d = 0; d < dates.length; d++) {
    if (working[staffIndex][d]) {
      const dt = parseISO(dates[d])
      if (isWithinInterval(dt, { start: weekStart, end: weekEnd })) {
        count++
      }
    }
  }
  return count
}

/** 対象日の駐車場利用スタッフ数を返す */
function getParkingCountForDate(
  dateIndex: number,
  working: boolean[][],
  staffInfo: StaffInfo[],
): number {
  let count = 0
  for (let i = 0; i < working.length; i++) {
    if (working[i][dateIndex] && staffInfo[i].usesParking) count++
  }
  return count
}

/**
 * Toggle ON の制約チェック（休み → 出勤）
 * @returns true なら操作可能
 */
export function isValidToggleOn(
  staffIndex: number,
  dateIndex: number,
  state: InternalState,
  totalParkingSpots: number,
  lockedWorking: boolean[][],
): boolean {
  const { working, staffInfo, dates } = state
  const info = staffInfo[staffIndex]
  const date = dates[dateIndex]

  // 既に出勤中なら操作不要
  if (working[staffIndex][dateIndex]) return false

  // 固定アサインがある場合は変更不可（lockedWorking がtrueなら既出勤で変更対象外）
  if (lockedWorking[staffIndex][dateIndex]) return false

  // 希望休チェック
  if (info.preferredDayOffDates.has(date)) return false

  // ヘルプスタッフのavailableDatesチェック
  if (info.isHelp && info.availableDates !== null && !info.availableDates.has(date)) return false

  // 週上限チェック（通常スタッフのみ）
  if (!info.isHelp) {
    const weekCount = getWeeklyWorkCount(staffIndex, dateIndex, working, dates)
    if (weekCount >= info.maxWeeklyShifts) return false
  }

  // 駐車場チェック
  if (info.usesParking) {
    const currentParkingCount = getParkingCountForDate(dateIndex, working, staffInfo)
    if (currentParkingCount >= totalParkingSpots) return false
  }

  return true
}

/**
 * Toggle OFF の制約チェック（出勤 → 休み）
 * @returns true なら操作可能
 */
export function isValidToggleOff(
  staffIndex: number,
  dateIndex: number,
  state: InternalState,
  lockedWorking: boolean[][],
): boolean {
  const { working } = state

  // 出勤していなければ操作不要
  if (!working[staffIndex][dateIndex]) return false

  // 固定アサインは変更不可
  if (lockedWorking[staffIndex][dateIndex]) return false

  return true
}

/**
 * Swap の制約チェック（同一日でスタッフを入れ替え）
 * workingOnIndex: 出勤中のスタッフ
 * workingOffIndex: 休みのスタッフ
 * @returns true なら操作可能
 */
export function isValidSwap(
  workingOnIndex: number,
  workingOffIndex: number,
  dateIndex: number,
  state: InternalState,
  totalParkingSpots: number,
  lockedWorking: boolean[][],
): boolean {
  const { working } = state

  // 状態確認
  if (!working[workingOnIndex][dateIndex]) return false
  if (working[workingOffIndex][dateIndex]) return false

  // 両方の固定チェック
  if (lockedWorking[workingOnIndex][dateIndex]) return false
  if (lockedWorking[workingOffIndex][dateIndex]) return false

  // workingOffIndex を出勤させる制約チェック
  // ただし駐車場は workingOnIndex が休むので、利用数は変わらない場合と変わる場合がある
  const { staffInfo, dates } = state
  const offInfo = staffInfo[workingOffIndex]
  const date = dates[dateIndex]

  // 希望休
  if (offInfo.preferredDayOffDates.has(date)) return false

  // ヘルプスタッフのavailableDates
  if (offInfo.isHelp && offInfo.availableDates !== null && !offInfo.availableDates.has(date)) return false

  // 週上限（通常スタッフのみ）
  if (!offInfo.isHelp) {
    const weekCount = getWeeklyWorkCount(workingOffIndex, dateIndex, working, dates)
    if (weekCount >= offInfo.maxWeeklyShifts) return false
  }

  // 駐車場: workingOnIndex が休み、workingOffIndex が出勤
  // onIndex が駐車場を使っていなくて、offIndex が駐車場を使う場合のみ枠チェックが必要
  const onInfo = staffInfo[workingOnIndex]
  if (!onInfo.usesParking && offInfo.usesParking) {
    const currentParkingCount = getParkingCountForDate(dateIndex, working, staffInfo)
    if (currentParkingCount >= totalParkingSpots) return false
  }

  return true
}

/**
 * Move の制約チェック（出勤日を別日に移動）
 * fromDateIndex: 移動元（出勤中）
 * toDateIndex: 移動先（休み）
 */
export function isValidMove(
  staffIndex: number,
  fromDateIndex: number,
  toDateIndex: number,
  state: InternalState,
  totalParkingSpots: number,
  lockedWorking: boolean[][],
): boolean {
  const { working } = state

  // 移動元は出勤中、移動先は休み
  if (!working[staffIndex][fromDateIndex]) return false
  if (working[staffIndex][toDateIndex]) return false

  // 移動元の固定チェック（固定なら移動不可）
  if (lockedWorking[staffIndex][fromDateIndex]) return false
  if (lockedWorking[staffIndex][toDateIndex]) return false

  const { staffInfo, dates } = state
  const info = staffInfo[staffIndex]
  const toDate = dates[toDateIndex]

  // 希望休チェック
  if (info.preferredDayOffDates.has(toDate)) return false

  // ヘルプスタッフのavailableDates
  if (info.isHelp && info.availableDates !== null && !info.availableDates.has(toDate)) return false

  // 週上限（通常スタッフのみ）
  // 移動先の週で上限チェック
  if (!info.isHelp) {
    // 移動元を仮に外した状態でカウント（同週内の移動は出勤数が変わらない）
    const fromDate = dates[fromDateIndex]
    const fromWeekStart = startOfWeek(parseISO(fromDate), { weekStartsOn: 1 })
    const fromWeekEnd = endOfWeek(parseISO(fromDate), { weekStartsOn: 1 })
    const toWeekStart = startOfWeek(parseISO(toDate), { weekStartsOn: 1 })
    const toWeekEnd = endOfWeek(parseISO(toDate), { weekStartsOn: 1 })

    const sameWeek = fromWeekStart.getTime() === toWeekStart.getTime()

    if (!sameWeek) {
      // 移動先週の現在の出勤数
      let toWeekCount = 0
      for (let d = 0; d < dates.length; d++) {
        if (working[staffIndex][d] && d !== fromDateIndex) {
          const dt = parseISO(dates[d])
          if (isWithinInterval(dt, { start: toWeekStart, end: toWeekEnd })) {
            toWeekCount++
          }
        }
      }
      if (toWeekCount >= info.maxWeeklyShifts) return false
    }
    // 同週内の移動の場合、出勤数は変わらないため上限を超えない
    void fromWeekEnd // suppress unused warning
  }

  // 駐車場チェック（移動先の日）
  if (info.usesParking) {
    const toParkingCount = getParkingCountForDate(toDateIndex, working, staffInfo)
    // 移動元と移動先が別日なので、移動元から駐車場が空く
    // ただし移動先の駐車場が満杯かチェック
    if (toParkingCount >= totalParkingSpots) return false
  }

  return true
}

// ---------------------------------------------------------------------------
// 近傍操作
// ---------------------------------------------------------------------------

type Operation =
  | { type: 'toggleOn'; staffIndex: number; dateIndex: number }
  | { type: 'toggleOff'; staffIndex: number; dateIndex: number }
  | { type: 'swap'; onStaffIndex: number; offStaffIndex: number; dateIndex: number }
  | { type: 'move'; staffIndex: number; fromDateIndex: number; toDateIndex: number }

/**
 * ランダムな近傍操作を生成する。
 * 制約に違反する操作は null を返す。
 * random: 0〜1 の乱数（テスト用にDI可能）
 */
export function generateNeighbor(
  state: InternalState,
  totalParkingSpots: number,
  lockedWorking: boolean[][],
  random: () => number = Math.random,
): Operation | null {
  const numStaff = state.working.length
  const numDates = state.dates.length

  const opType = Math.floor(random() * 4)

  if (opType === 0) {
    // Toggle ON: ランダムにスタッフ・日付を選んで出勤に変更
    const staffIndex = Math.floor(random() * numStaff)
    const dateIndex = Math.floor(random() * numDates)
    if (isValidToggleOn(staffIndex, dateIndex, state, totalParkingSpots, lockedWorking)) {
      return { type: 'toggleOn', staffIndex, dateIndex }
    }
  } else if (opType === 1) {
    // Toggle OFF: ランダムに出勤中のスタッフ・日付を選んで休みに変更
    const staffIndex = Math.floor(random() * numStaff)
    const dateIndex = Math.floor(random() * numDates)
    if (isValidToggleOff(staffIndex, dateIndex, state, lockedWorking)) {
      return { type: 'toggleOff', staffIndex, dateIndex }
    }
  } else if (opType === 2) {
    // Swap: 同一日で出勤中と休みのスタッフを入れ替え
    const dateIndex = Math.floor(random() * numDates)
    const onStaffIndex = Math.floor(random() * numStaff)
    const offStaffIndex = Math.floor(random() * numStaff)
    if (
      onStaffIndex !== offStaffIndex &&
      isValidSwap(onStaffIndex, offStaffIndex, dateIndex, state, totalParkingSpots, lockedWorking)
    ) {
      return { type: 'swap', onStaffIndex, offStaffIndex, dateIndex }
    }
  } else {
    // Move: スタッフの出勤日を別の日に移動
    const staffIndex = Math.floor(random() * numStaff)
    const fromDateIndex = Math.floor(random() * numDates)
    const toDateIndex = Math.floor(random() * numDates)
    if (
      fromDateIndex !== toDateIndex &&
      isValidMove(staffIndex, fromDateIndex, toDateIndex, state, totalParkingSpots, lockedWorking)
    ) {
      return { type: 'move', staffIndex, fromDateIndex, toDateIndex }
    }
  }

  return null
}

/**
 * 操作を状態に適用する（破壊的更新）。
 */
export function applyOperation(state: InternalState, op: Operation): void {
  const { working } = state
  if (op.type === 'toggleOn') {
    working[op.staffIndex][op.dateIndex] = true
  } else if (op.type === 'toggleOff') {
    working[op.staffIndex][op.dateIndex] = false
  } else if (op.type === 'swap') {
    working[op.onStaffIndex][op.dateIndex] = false
    working[op.offStaffIndex][op.dateIndex] = true
  } else if (op.type === 'move') {
    working[op.staffIndex][op.fromDateIndex] = false
    working[op.staffIndex][op.toDateIndex] = true
  }
}

/**
 * 操作を状態から取り消す（破壊的更新）。
 */
export function undoOperation(state: InternalState, op: Operation): void {
  const { working } = state
  if (op.type === 'toggleOn') {
    working[op.staffIndex][op.dateIndex] = false
  } else if (op.type === 'toggleOff') {
    working[op.staffIndex][op.dateIndex] = true
  } else if (op.type === 'swap') {
    working[op.onStaffIndex][op.dateIndex] = true
    working[op.offStaffIndex][op.dateIndex] = false
  } else if (op.type === 'move') {
    working[op.staffIndex][op.fromDateIndex] = true
    working[op.staffIndex][op.toDateIndex] = false
  }
}

// ---------------------------------------------------------------------------
// 初期解 ↔ 内部表現の変換
// ---------------------------------------------------------------------------

/**
 * OptimizerInput から内部表現 InternalState と評価パラメータを生成する。
 * また固定アサイン（isLocked=true）に対応する lockedWorking も生成する。
 */
export function toInternalState(input: OptimizerInput): {
  state: InternalState
  lockedWorking: boolean[][]
  evalParams: Omit<EvaluateParams, 'working'>
} {
  const { initialAssignments, staff, helpStaff, dayOffs, periodDates, getRequiredCount } = input

  // 全スタッフリスト（通常 + ヘルプ）
  const allStaffEntries: StaffInfo[] = [
    ...staff.map((s) => {
      // 期間内の週数を計算して週上限合計を求める
      const weeks = getDistinctWeeks(periodDates)
      const weeklyCapacity = weeks * s.maxWeeklyShifts
      const preferredDayOffDates = new Set(
        dayOffs.filter((d) => d.staffId === s.id).map((d) => d.date),
      )
      return {
        id: s.id,
        isHelp: false,
        usesParking: s.usesParking,
        availableSlotIndices: s.availableSlots.map((slot) => ALL_TIME_SLOTS.indexOf(slot)),
        weeklyCapacity,
        preferredDayOffDates,
        availableDates: null,
        maxWeeklyShifts: s.maxWeeklyShifts,
      } satisfies StaffInfo
    }),
    ...helpStaff.map((hs) => {
      const preferredDayOffDates = new Set(
        dayOffs.filter((d) => d.staffId === hs.id).map((d) => d.date),
      )
      return {
        id: hs.id,
        isHelp: true,
        usesParking: hs.usesParking,
        availableSlotIndices: hs.availableSlots.map((slot) => ALL_TIME_SLOTS.indexOf(slot)),
        weeklyCapacity: 0,
        preferredDayOffDates,
        availableDates: new Set(hs.availableDates),
        maxWeeklyShifts: 0,
      } satisfies StaffInfo
    }),
  ]

  const staffIds = allStaffEntries.map((s) => s.id)
  const numStaff = allStaffEntries.length
  const numDates = periodDates.length

  // working: initialAssignments から初期化
  const working: boolean[][] = Array.from({ length: numStaff }, () => Array(numDates).fill(false))
  const lockedWorking: boolean[][] = Array.from({ length: numStaff }, () =>
    Array(numDates).fill(false),
  )

  for (const a of initialAssignments) {
    const si = staffIds.indexOf(a.staffId)
    const di = periodDates.indexOf(a.date)
    if (si === -1 || di === -1) continue
    working[si][di] = true
    if (a.isLocked) {
      lockedWorking[si][di] = true
    }
  }

  // 評価パラメータ
  const isRegularStaff = allStaffEntries.map((s) => !s.isHelp)
  const staffIsParking = allStaffEntries.map((s) => s.usesParking)
  const weeklyCapacity = allStaffEntries.map((s) => s.weeklyCapacity)
  const staffSlots = allStaffEntries.map((s) => s.availableSlotIndices)
  const requiredCounts: number[][] = periodDates.map((date) =>
    ALL_TIME_SLOTS.map((slot) => getRequiredCount(date, slot)),
  )

  const state: InternalState = {
    working,
    staffIds,
    dates: periodDates,
    staffInfo: allStaffEntries,
  }

  const evalParams: Omit<EvaluateParams, 'working'> = {
    isRegularStaff,
    staffIsParking,
    weeklyCapacity,
    staffSlots,
    dates: periodDates,
    requiredCounts,
  }

  return { state, lockedWorking, evalParams }
}

/**
 * 期間内の異なるISO週数を返す（月〜日）
 */
function getDistinctWeeks(dates: string[]): number {
  const weeks = new Set<string>()
  for (const date of dates) {
    const d = parseISO(date)
    const ws = startOfWeek(d, { weekStartsOn: 1 })
    weeks.add(ws.toISOString())
  }
  return Math.max(1, weeks.size)
}

/**
 * InternalState を ShiftAssignment[] に変換する。
 * 元の initialAssignments にある parkingSpot / isLocked を保持しつつ、
 * working に基づいてアサインを再構築する。
 */
export function toAssignments(
  state: InternalState,
  input: OptimizerInput,
  allParkingSpots: string[],
): ShiftAssignment[] {
  const { working, staffIds, dates, staffInfo } = state
  const { initialAssignments } = input
  const result: ShiftAssignment[] = []

  for (let d = 0; d < dates.length; d++) {
    const date = dates[d]
    const usedSpots = new Set<string>()

    // 固定アサインは元のデータをそのまま使う
    for (const a of initialAssignments) {
      if (a.date !== date || !a.isLocked) continue
      result.push({ ...a })
      if (a.parkingSpot) usedSpots.add(a.parkingSpot)
    }

    // 最適化後の出勤スタッフに対してアサインを生成
    for (let i = 0; i < working.length; i++) {
      if (!working[i][d]) continue

      const info = staffInfo[i]
      const staffId = staffIds[i]

      // 固定アサインのあるスタッフは既に追加済み
      if (initialAssignments.some((a) => a.staffId === staffId && a.date === date && a.isLocked)) {
        continue
      }

      // 駐車場スポット割り当て
      const parkingSpot = info.usesParking
        ? (allParkingSpots.find((spot) => !usedSpots.has(spot)) ?? null)
        : null
      if (info.usesParking && parkingSpot !== null) {
        usedSpots.add(parkingSpot)
      }

      // 利用可能なスロットにアサインを生成
      for (const slotIndex of info.availableSlotIndices) {
        const timeSlot = ALL_TIME_SLOTS[slotIndex]
        // 必要人数が0のスロットにはアサインしない
        if (input.getRequiredCount(date, timeSlot) <= 0) continue
        result.push({
          id: crypto.randomUUID(),
          staffId,
          date,
          timeSlot,
          parkingSpot,
          isLocked: false,
        })
      }
    }
  }

  return result
}

// ---------------------------------------------------------------------------
// メイン: 最適化エンジン
// ---------------------------------------------------------------------------

/** プログレスコールバック（0〜100） */
export type ProgressCallback = (progress: number) => void

/**
 * Hill Climbing 最適化エンジン。
 * グリーディ生成結果（initialAssignments）を入力として、
 * 局所探索で改善した ShiftAssignment[] を返す。
 */
export function optimizeShift(
  input: OptimizerInput,
  allParkingSpots: string[],
  onProgress?: ProgressCallback,
): ShiftAssignment[] {
  const config: OptimizationConfig = {
    ...DEFAULT_OPTIMIZATION_CONFIG,
    ...input.config,
  }

  const { state, lockedWorking, evalParams } = toInternalState(input)

  // 評価関数のラッパー
  const evalState = (): EvalResult =>
    evaluate({ working: state.working, ...evalParams })

  // 初期評価
  let bestEval = evalState()
  let bestWorking = state.working.map((row) => [...row])

  let noImprovementCount = 0
  const startTime = Date.now()
  let lastProgressReport = 0

  for (let iter = 0; iter < config.maxIterations; iter++) {
    // 終了条件チェック
    if (noImprovementCount >= config.noImprovementLimit) break
    if (Date.now() - startTime >= config.timeLimitMs) break

    // プログレス通知（100回ごと）
    const progress = Math.min(100, Math.floor((iter / config.maxIterations) * 100))
    if (progress !== lastProgressReport && iter % 100 === 0) {
      onProgress?.(progress)
      lastProgressReport = progress
    }

    // 近傍操作を生成
    const op = generateNeighbor(state, input.totalParkingSpots, lockedWorking)
    if (!op) {
      noImprovementCount++
      continue
    }

    // 操作を適用して評価
    applyOperation(state, op)
    const newEval = evalState()

    if (isBetter(newEval, bestEval)) {
      // 改善: 最良解を更新
      bestEval = newEval
      bestWorking = state.working.map((row) => [...row])
      noImprovementCount = 0
    } else {
      // 改善なし: 操作を取り消す
      undoOperation(state, op)
      noImprovementCount++
    }
  }

  // 最良解を状態に反映
  for (let i = 0; i < state.working.length; i++) {
    state.working[i] = bestWorking[i]
  }

  onProgress?.(100)

  return toAssignments(state, input, allParkingSpots)
}

// ---------------------------------------------------------------------------
// ヘルパーエクスポート（テスト用）
// ---------------------------------------------------------------------------

export type { StaffInfo, Operation }
