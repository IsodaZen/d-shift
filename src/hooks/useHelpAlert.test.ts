import { describe, it, expect } from 'vitest'
import { renderHook } from '@testing-library/react'
import { useHelpAlert } from './useHelpAlert'
import type { Staff, ShiftAssignment, PreferredDayOff, ShiftSlotConfig, HelpStaff } from '../types'

// --- spec: help-staff-alert ---

const makeStaff = (id: string, availableSlots: Staff['availableSlots'] = ['morning']): Staff => ({
  id,
  name: `スタッフ${id}`,
  maxWeeklyShifts: 5,
  availableSlots,
  usesParking: false,
})

const makeAssignment = (staffId: string, date: string, timeSlot: ShiftAssignment['timeSlot']): ShiftAssignment => ({
  id: `${staffId}-${date}-${timeSlot}`,
  staffId,
  date,
  timeSlot,
  parkingSpot: null,
})

const makeConfig = (date: string, timeSlot: ShiftSlotConfig['timeSlot'], requiredCount: number): ShiftSlotConfig => ({
  date,
  timeSlot,
  requiredCount,
})

describe('useHelpAlert', () => {
  const dates = ['2025-01-06']
  const staff = [makeStaff('s1'), makeStaff('s2'), makeStaff('s3')]

  it('希望休により必要人数を下回る場合を検出する', () => {
    // spec: 希望休により必要人数を下回る場合を検出する
    const configs: ShiftSlotConfig[] = [makeConfig('2025-01-06', 'morning', 3)]
    const dayOffs: PreferredDayOff[] = [
      { id: 'd1', staffId: 's1', date: '2025-01-06' },
      { id: 'd2', staffId: 's2', date: '2025-01-06' },
      // s3のみ出勤可能 → 必要3名に対し実質1名 → 不足
    ]

    const { result } = renderHook(() =>
      useHelpAlert(dates, staff, [], dayOffs, configs),
    )

    expect(result.current).toHaveLength(1)
    expect(result.current[0].timeSlot).toBe('morning')
    expect(result.current[0].shortage).toBe(2)
  })

  it('必要人数を満たしている場合はアラートが発生しない', () => {
    // spec: 必要人数を満たしている場合は検出されない
    const configs: ShiftSlotConfig[] = [makeConfig('2025-01-06', 'morning', 2)]
    const assignments = [
      makeAssignment('s1', '2025-01-06', 'morning'),
      makeAssignment('s2', '2025-01-06', 'morning'),
    ]

    const { result } = renderHook(() =>
      useHelpAlert(dates, staff, assignments, [], configs),
    )

    expect(result.current).toHaveLength(0)
  })

  it('不足人数が正確に計算される', () => {
    // spec: 不足人数が正確に表示される（必要3名、出勤可能1名 → 不足2）
    // s1, s2が希望休 → 出勤可能はs3のみ(1名) → 不足2
    const configs: ShiftSlotConfig[] = [makeConfig('2025-01-06', 'morning', 3)]
    const dayOffs: PreferredDayOff[] = [
      { id: 'd1', staffId: 's1', date: '2025-01-06' },
      { id: 'd2', staffId: 's2', date: '2025-01-06' },
    ]
    const assignments = [makeAssignment('s3', '2025-01-06', 'morning')]

    const { result } = renderHook(() =>
      useHelpAlert(dates, staff, assignments, dayOffs, configs),
    )

    expect(result.current[0].requiredCount).toBe(3)
    expect(result.current[0].assignedCount).toBe(1)
    expect(result.current[0].shortage).toBe(2)
  })

  it('必要人数が0の時間帯はアラートを発生させない', () => {
    // requiredCount=0 は「設定なし」とみなし、アラート対象外
    const configs: ShiftSlotConfig[] = [makeConfig('2025-01-06', 'morning', 0)]

    const { result } = renderHook(() =>
      useHelpAlert(dates, staff, [], [], configs),
    )

    expect(result.current).toHaveLength(0)
  })

  it('出勤不可時間帯のスタッフは利用可能人数に含めない', () => {
    // 午後が出勤不可のスタッフだけのチームで、午後に必要人数あり
    const afternoonStaff = [makeStaff('s1', ['morning'])] // 午後は不可
    const configs: ShiftSlotConfig[] = [makeConfig('2025-01-06', 'afternoon', 1)]

    const { result } = renderHook(() =>
      useHelpAlert(dates, afternoonStaff, [], [], configs),
    )

    // s1は午後出勤不可 → 実質0名 → 不足1
    expect(result.current).toHaveLength(1)
    expect(result.current[0].shortage).toBe(1)
  })

  it('複数日・複数時間帯のアラートをまとめて返す', () => {
    const multiDates = ['2025-01-06', '2025-01-07']
    const configs: ShiftSlotConfig[] = [
      makeConfig('2025-01-06', 'morning', 2),
      makeConfig('2025-01-07', 'afternoon', 1),
    ]
    const singleStaff = [makeStaff('s1', ['morning', 'afternoon'])]
    const dayOffs: PreferredDayOff[] = [
      { id: 'd1', staffId: 's1', date: '2025-01-06' }, // 6日は希望休
    ]

    const { result } = renderHook(() =>
      useHelpAlert(multiDates, singleStaff, [], dayOffs, configs),
    )

    // 6日午前: s1が休み → 不足
    // 7日午後: s1は出勤可能 → アサインなしだが s1が出勤可能なので不足はある
    const alertDates = result.current.map((a) => `${a.date}-${a.timeSlot}`)
    expect(alertDates).toContain('2025-01-06-morning')
  })

  // --- spec: help-staff-alert（ヘルプスタッフ考慮） ---
  describe('ヘルプスタッフ考慮', () => {
    const makeHelpStaff = (
      id: string,
      availableSlots: HelpStaff['availableSlots'],
      availableDates: string[],
    ): HelpStaff => ({
      id,
      name: `ヘルプ${id}`,
      availableSlots,
      availableDates,
      usesParking: false,
    })

    it('稼働可能なヘルプスタッフがいる場合、不足人数から差し引かれる', () => {
      // 通常スタッフ1人（希望休で不在）、必要2人、ヘルプスタッフ1人稼働可能
      const configs: ShiftSlotConfig[] = [makeConfig('2025-01-06', 'morning', 2)]
      const helpStaff = [makeHelpStaff('hs1', ['morning'], ['2025-01-06'])]
      const dayOffs: PreferredDayOff[] = [
        { id: 'd1', staffId: 's1', date: '2025-01-06' },
        { id: 'd2', staffId: 's2', date: '2025-01-06' },
      ]

      const { result } = renderHook(() =>
        useHelpAlert(dates, staff, [], dayOffs, configs, helpStaff),
      )

      // 通常スタッフ出勤可能: s3の1人、ヘルプスタッフ: hs1の1人 → 合計2人 = 必要2人 → 不足0
      expect(result.current).toHaveLength(0)
    })

    it('ヘルプスタッフだけで不足を補える場合、アラートは表示されない', () => {
      // 通常スタッフ全員希望休、ヘルプスタッフが不足を完全にカバー
      const singleStaff = [makeStaff('s1', ['morning'])]
      const configs: ShiftSlotConfig[] = [makeConfig('2025-01-06', 'morning', 1)]
      const dayOffs: PreferredDayOff[] = [
        { id: 'd1', staffId: 's1', date: '2025-01-06' },
      ]
      const helpStaff = [makeHelpStaff('hs1', ['morning'], ['2025-01-06'])]

      const { result } = renderHook(() =>
        useHelpAlert(dates, singleStaff, [], dayOffs, configs, helpStaff),
      )

      expect(result.current).toHaveLength(0)
    })

    it('ヘルプスタッフでも不足する場合、残りの不足人数がアラートに表示される', () => {
      // 通常スタッフ全員希望休、必要3人、ヘルプスタッフ1人
      const configs: ShiftSlotConfig[] = [makeConfig('2025-01-06', 'morning', 3)]
      const dayOffs: PreferredDayOff[] = [
        { id: 'd1', staffId: 's1', date: '2025-01-06' },
        { id: 'd2', staffId: 's2', date: '2025-01-06' },
        { id: 'd3', staffId: 's3', date: '2025-01-06' },
      ]
      const helpStaff = [makeHelpStaff('hs1', ['morning'], ['2025-01-06'])]

      const { result } = renderHook(() =>
        useHelpAlert(dates, staff, [], dayOffs, configs, helpStaff),
      )

      // 通常0人 + ヘルプ1人 = 1人、必要3人 → 不足2
      expect(result.current).toHaveLength(1)
      expect(result.current[0].shortage).toBe(2)
    })

    it('稼働可能日付に含まれないヘルプスタッフはカウントされない', () => {
      // ヘルプスタッフのavailableDatesに日付が含まれない
      const configs: ShiftSlotConfig[] = [makeConfig('2025-01-06', 'morning', 2)]
      const dayOffs: PreferredDayOff[] = [
        { id: 'd1', staffId: 's1', date: '2025-01-06' },
        { id: 'd2', staffId: 's2', date: '2025-01-06' },
      ]
      const helpStaff = [makeHelpStaff('hs1', ['morning'], ['2025-01-07'])] // 別の日のみ

      const { result } = renderHook(() =>
        useHelpAlert(dates, staff, [], dayOffs, configs, helpStaff),
      )

      // ヘルプスタッフは1/7のみ稼働可能、1/6は対象外 → 通常1人のみ、不足1
      expect(result.current).toHaveLength(1)
      expect(result.current[0].shortage).toBe(1)
    })
  })
})
