// タスク10.1: useHelpAlert フック
import { useMemo } from 'react'
import type { ShiftAssignment, PreferredDayOff, ShiftSlotConfig, Staff, TimeSlot, HelpStaff } from '../types'
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
  helpStaff: HelpStaff[] = [],
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
        const availableRegularStaff = staff.filter(
          (s) =>
            s.availableSlots.includes(timeSlot) &&
            !dayOffs.some((d) => d.staffId === s.id && d.date === date),
        )

        // 稼働可能なヘルプスタッフを計算（稼働可能日付 AND 出勤可能時間帯）
        const availableHelpStaff = helpStaff.filter(
          (hs) =>
            hs.availableDates.includes(date) &&
            hs.availableSlots.includes(timeSlot),
        )

        // 不足判定: 通常スタッフ + ヘルプスタッフの合計が必要人数を下回るかで判定
        const totalAvailable = availableRegularStaff.length + availableHelpStaff.length
        const shortage = requiredCount - totalAvailable

        if (shortage > 0) {
          alerts.push({ date, timeSlot, requiredCount, assignedCount, shortage })
        }
      }
    }

    return alerts
  }, [dates, staff, assignments, dayOffs, configs, helpStaff])
}
