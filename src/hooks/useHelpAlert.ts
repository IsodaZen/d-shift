// タスク10.1: useHelpAlert フック
import { useMemo } from 'react'
import type { ShiftAssignment, PreferredDayOff, ShiftSlotConfig, Staff, TimeSlot } from '../types'
import { ALL_TIME_SLOTS } from '../types'

export interface HelpAlertInfo {
  date: string
  timeSlot: TimeSlot
  requiredCount: number
  assignedCount: number
  shortage: number
}

export function useHelpAlert(
  dates: string[],
  staff: Staff[],
  assignments: ShiftAssignment[],
  dayOffs: PreferredDayOff[],
  configs: ShiftSlotConfig[],
): HelpAlertInfo[] {
  return useMemo(() => {
    const alerts: HelpAlertInfo[] = []

    for (const date of dates) {
      for (const timeSlot of ALL_TIME_SLOTS) {
        const config = configs.find((c) => c.date === date && c.timeSlot === timeSlot)
        const requiredCount = config?.requiredCount ?? 0
        if (requiredCount === 0) continue

        // その日・時間帯にアサインされているスタッフ数
        const assignedCount = assignments.filter(
          (a) => a.date === date && a.timeSlot === timeSlot,
        ).length

        // 希望休で休む予定のスタッフは除外して、出勤可能人数を計算
        const availableStaff = staff.filter(
          (s) =>
            s.availableSlots.includes(timeSlot) &&
            !dayOffs.some((d) => d.staffId === s.id && d.date === date),
        )

        // 不足判定: 希望休・出勤不可時間帯を除いた「出勤可能人数」が必要人数を下回るかで判定
        const shortage = requiredCount - availableStaff.length

        if (shortage > 0) {
          alerts.push({ date, timeSlot, requiredCount, assignedCount, shortage })
        }
      }
    }

    return alerts
  }, [dates, staff, assignments, dayOffs, configs])
}
