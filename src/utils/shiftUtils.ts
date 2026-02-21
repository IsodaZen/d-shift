// タスク7.1〜7.3: シフト割り当てユーティリティ
import type { ShiftAssignment, Staff, TimeSlot } from '../types'
import { startOfWeek, endOfWeek, isWithinInterval, parseISO } from 'date-fns'

/**
 * タスク7.1: 駐車場自動割り当て（時間帯ベース）
 * 同一スタッフ・同一日に既存の枠があればそれを再利用し、なければ同一日・同一時間帯で空いているA優先の枠を割り当てる
 */
export function assignParking(
  date: string,
  timeSlot: TimeSlot,
  allSpots: string[],
  existingAssignments: ShiftAssignment[],
  staffId?: string,
): string | null {
  // 同一スタッフ・同一日に既存の駐車場割り当てがあれば再利用する（時間帯にかかわらず）
  if (staffId !== undefined) {
    const existing = existingAssignments.find(
      (a) => a.staffId === staffId && a.date === date && a.parkingSpot !== null,
    )
    if (existing) return existing.parkingSpot
  }

  // 同一日・同一時間帯に使用中の枠のみを「使用中」とみなす
  const usedSpots = existingAssignments
    .filter((a) => a.date === date && a.timeSlot === timeSlot && a.parkingSpot !== null)
    .map((a) => a.parkingSpot as string)

  const freeSpot = allSpots.find((spot) => !usedSpots.includes(spot))
  return freeSpot ?? null
}

/**
 * タスク7.2: 週上限出勤日数チェック
 * staffId + 対象日 → その週のユニーク出勤日数を返す
 * 同一日に複数時間帯（AM/PM/夕方）があっても1日分としてカウントする
 */
export function getWeeklyAssignmentCount(
  staffId: string,
  date: string,
  assignments: ShiftAssignment[],
): number {
  const target = parseISO(date)
  const weekStart = startOfWeek(target, { weekStartsOn: 1 })
  const weekEnd = endOfWeek(target, { weekStartsOn: 1 })

  const datesInWeek = assignments
    .filter((a) => {
      if (a.staffId !== staffId) return false
      const d = parseISO(a.date)
      return isWithinInterval(d, { start: weekStart, end: weekEnd })
    })
    .map((a) => a.date)

  return new Set(datesInWeek).size
}

/**
 * タスク7.3: 出勤可能時間帯チェック
 * staffId + timeSlot → 出勤可能かどうかを返す
 */
export function isAvailableSlot(staff: Staff, timeSlot: TimeSlot): boolean {
  return staff.availableSlots.includes(timeSlot)
}
