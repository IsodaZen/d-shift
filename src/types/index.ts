// タスク2.1〜2.6: 型定義

export type TimeSlot = 'morning' | 'afternoon' | 'evening'

export const TIME_SLOT_LABELS: Record<TimeSlot, string> = {
  morning: '午前',
  afternoon: '午後',
  evening: '夕方',
}

export const ALL_TIME_SLOTS: TimeSlot[] = ['morning', 'afternoon', 'evening']

export interface Staff {
  id: string
  name: string
  maxWeeklyShifts: number
  availableSlots: TimeSlot[]
  usesParking: boolean
}

export interface ShiftSlotConfig {
  date: string // YYYY-MM-DD
  timeSlot: TimeSlot
  requiredCount: number
}

export interface PreferredDayOff {
  id: string
  staffId: string
  date: string // YYYY-MM-DD
}

export interface ShiftAssignment {
  id: string
  staffId: string
  date: string // YYYY-MM-DD
  timeSlot: TimeSlot
  parkingSpot: string | null // 例: "A1", "B1", null
  isLocked: boolean
}

export interface ParkingSlotType {
  type: 'A' | 'B'
  count: number
}

export interface ParkingConfig {
  slots: ParkingSlotType[]
}

export type DayCategory = 'weekday' | 'saturday' | 'sunday' | 'holiday'

export interface ShiftPeriod {
  startDate: string // YYYY-MM-DD
  endDate: string   // YYYY-MM-DD
}

export const DEFAULT_SHIFT_SLOT_COUNTS: Record<DayCategory, Record<TimeSlot, number>> = {
  weekday: { morning: 6, afternoon: 6, evening: 1 },
  saturday: { morning: 2, afternoon: 2, evening: 0 },
  sunday: { morning: 0, afternoon: 0, evening: 0 },
  holiday: { morning: 0, afternoon: 0, evening: 0 },
}

export interface HelpStaff {
  id: string
  name: string
  availableSlots: TimeSlot[]
  availableDates: string[] // YYYY-MM-DD
  usesParking: boolean
}

export const DEFAULT_PARKING_CONFIG: ParkingConfig = {
  slots: [
    { type: 'A', count: 4 },
    { type: 'B', count: 1 },
  ],
}

// --- 最適化エンジン関連の型定義 ---

/** 最適化エンジンの設定パラメータ */
export interface OptimizationConfig {
  /** 最大反復回数 */
  maxIterations: number
  /** 改善なしで早期終了するまでの連続反復回数 */
  noImprovementLimit: number
  /** 時間制限（ミリ秒） */
  timeLimitMs: number
}

/** デフォルトの最適化設定 */
export const DEFAULT_OPTIMIZATION_CONFIG: OptimizationConfig = {
  maxIterations: 20000,
  noImprovementLimit: 1000,
  timeLimitMs: 10000,
}

/** 辞書式比較に使用する評価結果（値が小さいほど良い） */
export interface EvalResult {
  /** 評価基準1: 全(日,時間帯)の最大不足人数 */
  shortfallPeak: number
  /** 評価基準2: 全(日,時間帯)の不足人数合計（Σ max(0, requiredCount - アサイン人数)、requiredCount>0のペアのみ） */
  shortfallTotal: number
  /** 評価基準3: 全(日,時間帯)の超過人数合計（Σ max(0, アサイン人数 - requiredCount)、requiredCount>0のペアのみ） */
  excessTotal: number
  /** 評価基準4: ヘルプスタッフが出勤している（スタッフ,日付）ペアの合計数 */
  helpStaffTotal: number
  /** 評価基準5: 通常スタッフの残余容量の母分散 */
  fairnessVariance: number
  /** 評価基準6: 各日の駐車場利用スタッフ数の最大値 */
  parkingPeak: number
}

/** 最適化エンジンへの入力 */
export interface OptimizerInput {
  /** グリーディ生成で得た初期解 */
  initialAssignments: ShiftAssignment[]
  /** 通常スタッフ一覧 */
  staff: Staff[]
  /** ヘルプスタッフ一覧 */
  helpStaff: HelpStaff[]
  /** 希望休一覧 */
  dayOffs: PreferredDayOff[]
  /** 最適化対象の日付一覧（YYYY-MM-DD、昇順） */
  periodDates: string[]
  /** 日付・時間帯ごとの必要人数取得関数 */
  getRequiredCount: (date: string, slot: TimeSlot) => number
  /** 駐車場スポットの合計数 */
  totalParkingSpots: number
  /** 最適化設定（省略時はデフォルト値を使用） */
  config?: Partial<OptimizationConfig>
}

/** Web Workerからメインスレッドへのメッセージ */
export type WorkerMessage =
  | { type: 'progress'; progress: number }
  | { type: 'result'; assignments: ShiftAssignment[] }
  | { type: 'error'; message: string }
