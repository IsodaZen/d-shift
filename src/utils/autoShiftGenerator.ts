// 自動シフト生成アルゴリズム（純関数）
import { parseISO, startOfWeek, endOfWeek, isWithinInterval } from 'date-fns'
import type { Staff, PreferredDayOff, ShiftAssignment, TimeSlot, HelpStaff } from '../types'


interface GenerateAutoShiftParams {
  periodDates: string[]
  staff: Staff[]
  dayOffs: PreferredDayOff[]
  getRequiredCount: (date: string, slot: TimeSlot) => number
  allParkingSpots: string[]
  helpStaff?: HelpStaff[]
}

/**
 * 指定日が含まれるISO週（月〜日）の出勤日数をカウントする。
 * 同一日に複数の時間帯にアサインされる場合も1出勤としてカウントする。
 */
function getWeeklyCount(staffId: string, date: string, assignments: ShiftAssignment[]): number {
  const target = parseISO(date)
  const weekStart = startOfWeek(target, { weekStartsOn: 1 })
  const weekEnd = endOfWeek(target, { weekStartsOn: 1 })
  const assignedDates = new Set(
    assignments
      .filter((a) => {
        if (a.staffId !== staffId) return false
        const d = parseISO(a.date)
        return isWithinInterval(d, { start: weekStart, end: weekEnd })
      })
      .map((a) => a.date),
  )
  return assignedDates.size
}

/**
 * ヘルプスタッフの期間全体でのアサイン回数（日数）をカウントする。
 */
function getPeriodCount(staffId: string, assignments: ShiftAssignment[]): number {
  const assignedDates = new Set(
    assignments.filter((a) => a.staffId === staffId).map((a) => a.date),
  )
  return assignedDates.size
}

/**
 * 候補スタッフを日付にアサインする共通処理。
 * remaining を破壊的に更新し、result にアサインを追加する。
 */
function assignCandidate(
  candidate: { id: string; availableSlots: TimeSlot[]; usesParking: boolean },
  date: string,
  remaining: Record<TimeSlot, number>,
  getRequiredCount: (date: string, slot: TimeSlot) => number,
  allParkingSpots: string[],
  result: ShiftAssignment[],
): boolean {
  // このスタッフの利用可能スロットのうち、まだ必要数が残っているスロットがあるか
  const hasNeeded = candidate.availableSlots.some(
    (slot) => getRequiredCount(date, slot) > 0 && remaining[slot] > 0,
  )
  if (!hasNeeded) return false

  // 駐車場が必要なスタッフは空き枠があるか事前確認
  const slotsToAssign = candidate.availableSlots.filter(
    (slot) => getRequiredCount(date, slot) > 0 && remaining[slot] > 0,
  )
  const usedAtAnySlot = new Set<string>(
    result
      .filter((a) => a.date === date && a.parkingSpot !== null && slotsToAssign.includes(a.timeSlot))
      .map((a) => a.parkingSpot as string),
  )
  const parkingSpot = candidate.usesParking
    ? (allParkingSpots.find((spot) => !usedAtAnySlot.has(spot)) ?? null)
    : null
  if (candidate.usesParking && parkingSpot === null) return false

  // 出勤させる: 必要人数>0かつ対応可能な全スロットにアサイン
  for (const slot of candidate.availableSlots) {
    if (getRequiredCount(date, slot) <= 0) continue
    result.push({
      id: crypto.randomUUID(),
      staffId: candidate.id,
      date,
      timeSlot: slot,
      parkingSpot,
    })
    remaining[slot]--
  }
  return true
}

/**
 * シフト作成期間の全日付に対して制約を満たすアサインセットを生成する。
 *
 * 強制制約（除外条件）:
 *   1. 希望休の日はアサインしない
 *   2. スタッフの出勤可能時間帯のみにアサインする
 *   3. 週上限出勤回数を超えない
 *   4. 出勤日には利用可能な全時間帯（必要人数>0）にアサインする
 *   5. 各時間帯の必要人数を超えるアサインをしない
 *      （ただし制約4により超過が避けられない場合は最小人数で許容）
 *
 * ヘルプスタッフ:
 *   - 通常スタッフで不足する場合のみアサインされる（二次的な候補）
 *   - availableDates に含まれる日付のみ対象
 *   - 週上限なし（availableDatesで出勤日を制御）
 *   - アサイン数の少ないヘルプスタッフを優先
 *
 * 優先順位: 週アサイン数の少ないスタッフを優先（ベストエフォート）
 */
export function generateAutoShift({
  periodDates,
  staff,
  dayOffs,
  getRequiredCount,
  allParkingSpots,
  helpStaff = [],
}: GenerateAutoShiftParams): ShiftAssignment[] {
  const result: ShiftAssignment[] = []

  for (const date of periodDates) {
    // 各スロットの残り必要人数
    const remaining: Record<TimeSlot, number> = {
      morning: getRequiredCount(date, 'morning'),
      afternoon: getRequiredCount(date, 'afternoon'),
      evening: getRequiredCount(date, 'evening'),
    }

    // --- 通常スタッフ ---
    const candidates = staff.filter((s) => {
      if (dayOffs.some((d) => d.staffId === s.id && d.date === date)) return false
      const weekCount = getWeeklyCount(s.id, date, result)
      if (weekCount >= s.maxWeeklyShifts) return false
      return true
    })

    candidates.sort(
      (a, b) => getWeeklyCount(a.id, date, result) - getWeeklyCount(b.id, date, result),
    )

    for (const s of candidates) {
      assignCandidate(s, date, remaining, getRequiredCount, allParkingSpots, result)
    }

    // --- ヘルプスタッフ（通常スタッフで不足する場合のみ） ---
    const hasShortage = Object.values(remaining).some((r) => r > 0)
    if (hasShortage && helpStaff.length > 0) {
      const helpCandidates = helpStaff.filter((hs) => hs.availableDates.includes(date))

      // アサイン数（期間全体）の少ない順にソート
      helpCandidates.sort(
        (a, b) => getPeriodCount(a.id, result) - getPeriodCount(b.id, result),
      )

      for (const hs of helpCandidates) {
        assignCandidate(hs, date, remaining, getRequiredCount, allParkingSpots, result)
      }
    }
  }

  return result
}
