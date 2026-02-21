// 自動シフト生成アルゴリズム（純関数）
import { parseISO, startOfWeek, endOfWeek, isWithinInterval } from 'date-fns'
import type { Staff, PreferredDayOff, ShiftAssignment, TimeSlot } from '../types'


interface GenerateAutoShiftParams {
  periodDates: string[]
  staff: Staff[]
  dayOffs: PreferredDayOff[]
  getRequiredCount: (date: string, slot: TimeSlot) => number
  allParkingSpots: string[]
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
    // 各スロットの残り必要人数
    const remaining: Record<TimeSlot, number> = {
      morning: getRequiredCount(date, 'morning'),
      afternoon: getRequiredCount(date, 'afternoon'),
      evening: getRequiredCount(date, 'evening'),
    }

    // 強制制約でフィルタリング（希望休・週上限）
    const candidates = staff.filter((s) => {
      if (dayOffs.some((d) => d.staffId === s.id && d.date === date)) return false
      const weekCount = getWeeklyCount(s.id, date, result)
      if (weekCount >= s.maxWeeklyShifts) return false
      return true
    })

    // 週アサイン数の少ない順にソート
    candidates.sort(
      (a, b) => getWeeklyCount(a.id, date, result) - getWeeklyCount(b.id, date, result),
    )

    // 各候補スタッフについて「この日に出勤させるか」を判定
    for (const s of candidates) {
      // このスタッフの利用可能スロットのうち、まだ必要数が残っているスロットがあるか（制約5）
      const hasNeeded = s.availableSlots.some(
        (slot) => getRequiredCount(date, slot) > 0 && remaining[slot] > 0,
      )
      if (!hasNeeded) continue // 全スロットが充足済み → スキップ

      // 駐車場が必要なスタッフは空き枠があるか事前確認（強制制約）
      // このスタッフがアサインされる全時間帯で共通して空いている枠を探す
      // （異なる時間帯で同じ枠が使われていると、同一スタッフでも全スロット分が確保できない）
      const slotsToAssign = s.availableSlots.filter(
        (slot) => getRequiredCount(date, slot) > 0 && remaining[slot] > 0,
      )
      const usedAtAnySlot = new Set<string>(
        result
          .filter((a) => a.date === date && a.parkingSpot !== null && slotsToAssign.includes(a.timeSlot))
          .map((a) => a.parkingSpot as string),
      )
      const parkingSpot = s.usesParking
        ? (allParkingSpots.find((spot) => !usedAtAnySlot.has(spot)) ?? null)
        : null
      if (s.usesParking && parkingSpot === null) continue // 駐車場不足 → アサイン除外

      // 出勤させる: 必要人数>0かつ対応可能な全スロットにアサイン（制約4）
      for (const slot of s.availableSlots) {
        if (getRequiredCount(date, slot) <= 0) continue // 必要人数0のスロットはスキップ

        result.push({
          id: crypto.randomUUID(),
          staffId: s.id,
          date,
          timeSlot: slot,
          parkingSpot,
        })
        remaining[slot]--
      }
    }
  }

  return result
}
