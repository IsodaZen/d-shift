// 自動シフト生成アルゴリズム（純関数）
import { parseISO, startOfWeek, endOfWeek, isWithinInterval } from 'date-fns'
import type { Staff, PreferredDayOff, ShiftAssignment, TimeSlot } from '../types'
import { ALL_TIME_SLOTS } from '../types'
import { assignParking } from './shiftUtils'

interface GenerateAutoShiftParams {
  periodDates: string[]
  staff: Staff[]
  dayOffs: PreferredDayOff[]
  getRequiredCount: (date: string, slot: TimeSlot) => number
  allParkingSpots: string[]
}

/** 指定日が含まれるISO週（月〜日）のアサイン数をカウントする */
function getWeeklyCount(staffId: string, date: string, assignments: ShiftAssignment[]): number {
  const target = parseISO(date)
  const weekStart = startOfWeek(target, { weekStartsOn: 1 })
  const weekEnd = endOfWeek(target, { weekStartsOn: 1 })
  return assignments.filter((a) => {
    if (a.staffId !== staffId) return false
    const d = parseISO(a.date)
    return isWithinInterval(d, { start: weekStart, end: weekEnd })
  }).length
}

/**
 * シフト作成期間の全日付に対して制約を満たすアサインセットを生成する。
 *
 * 強制制約（除外条件）:
 *   1. 希望休の日はアサインしない
 *   2. スタッフの出勤可能時間帯のみにアサインする
 *   3. 週上限出勤回数を超えない
 *
 * 優先順位: 週アサイン数の少ないスタッフを優先（ベストエフォート）
 */
export function generateAutoShift({
  periodDates,
  staff,
  dayOffs,
  getRequiredCount,
  allParkingSpots,
}: GenerateAutoShiftParams): ShiftAssignment[] {
  const result: ShiftAssignment[] = []

  for (const date of periodDates) {
    for (const slot of ALL_TIME_SLOTS) {
      const required = getRequiredCount(date, slot)
      if (required <= 0) continue

      // 強制制約でフィルタリング
      const eligible = staff.filter((s) => {
        // 希望休チェック
        if (dayOffs.some((d) => d.staffId === s.id && d.date === date)) return false
        // 出勤可能時間帯チェック
        if (!s.availableSlots.includes(slot)) return false
        // 週上限チェック（生成済みアサイン込みでカウント）
        const weekCount = getWeeklyCount(s.id, date, result)
        if (weekCount >= s.maxWeeklyShifts) return false
        return true
      })

      // 週アサイン数の少ない順にソート
      eligible.sort(
        (a, b) => getWeeklyCount(a.id, date, result) - getWeeklyCount(b.id, date, result),
      )

      // 必要人数分アサイン
      const toAssign = eligible.slice(0, required)
      for (const s of toAssign) {
        const parkingSpot = s.usesParking
          ? assignParking(date, allParkingSpots, result, s.id)
          : null

        result.push({
          id: crypto.randomUUID(),
          staffId: s.id,
          date,
          timeSlot: slot,
          parkingSpot,
        })
      }
    }
  }

  return result
}
