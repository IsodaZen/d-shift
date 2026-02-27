// --- spec: shift-optimization / 制約チェック ---
import { describe, it, expect } from 'vitest'
import {
  isValidToggleOn,
  isValidToggleOff,
  isValidSwap,
  isValidMove,
  toInternalState,
} from './shiftOptimizer'
import type { Staff, HelpStaff, PreferredDayOff, ShiftAssignment } from '../types'

// テスト用ヘルパー
const makeStaff = (overrides: Partial<Staff> & { id: string }): Staff => ({
  name: 'テストスタッフ',
  maxWeeklyShifts: 5,
  availableSlots: ['morning', 'afternoon'],
  usesParking: false,
  ...overrides,
})

const makeHelpStaff = (overrides: Partial<HelpStaff> & { id: string }): HelpStaff => ({
  name: 'ヘルプ',
  availableSlots: ['morning'],
  availableDates: [],
  usesParking: false,
  ...overrides,
})

const makeAssignment = (
  overrides: Partial<ShiftAssignment> & { staffId: string; date: string },
): ShiftAssignment => ({
  id: crypto.randomUUID(),
  timeSlot: 'morning',
  parkingSpot: null,
  isLocked: false,
  ...overrides,
})

// 5日間、スタッフ1人のシンプルな状態を作る
function makeSimpleState(
  staffOverride: Partial<Staff> = {},
  working0: boolean[] = [false, false, false, false, false],
) {
  const staff = [makeStaff({ id: 's1', ...staffOverride })]
  const dates = ['2025-01-06', '2025-01-07', '2025-01-08', '2025-01-09', '2025-01-10']
  const assignments = working0
    .map((w, i) =>
      w
        ? makeAssignment({ staffId: 's1', date: dates[i], timeSlot: 'morning' })
        : null,
    )
    .filter(Boolean) as ShiftAssignment[]

  const { state, lockedWorking } = toInternalState({
    initialAssignments: assignments,
    staff,
    helpStaff: [],
    dayOffs: [],
    periodDates: dates,
    getRequiredCount: () => 1,
    totalParkingSpots: 5,
  })
  return { state, lockedWorking, dates }
}

describe('isValidToggleOn', () => {
  it('休みのスタッフを出勤させられる（基本）', () => {
    const { state, lockedWorking } = makeSimpleState({}, [false, false, false, false, false])
    expect(isValidToggleOn(0, 0, state, 5, lockedWorking)).toBe(true)
  })

  it('既に出勤中のスタッフには適用できない', () => {
    const { state, lockedWorking } = makeSimpleState({}, [true, false, false, false, false])
    expect(isValidToggleOn(0, 0, state, 5, lockedWorking)).toBe(false)
  })

  it('希望休の日には出勤させられない', () => {
    const staff = [makeStaff({ id: 's1' })]
    const dates = ['2025-01-06', '2025-01-07', '2025-01-08', '2025-01-09', '2025-01-10']
    const dayOffs: PreferredDayOff[] = [{ id: 'd1', staffId: 's1', date: '2025-01-06' }]
    const { state, lockedWorking } = toInternalState({
      initialAssignments: [],
      staff,
      helpStaff: [],
      dayOffs,
      periodDates: dates,
      getRequiredCount: () => 1,
      totalParkingSpots: 5,
    })
    expect(isValidToggleOn(0, 0, state, 5, lockedWorking)).toBe(false)
  })

  it('週上限に達しているスタッフは出勤させられない', () => {
    // 月〜金の5日間、週上限3日、すでに3日出勤
    const staff = [makeStaff({ id: 's1', maxWeeklyShifts: 3 })]
    const dates = ['2025-01-06', '2025-01-07', '2025-01-08', '2025-01-09', '2025-01-10']
    const assignments = [
      makeAssignment({ staffId: 's1', date: '2025-01-06', timeSlot: 'morning' }),
      makeAssignment({ staffId: 's1', date: '2025-01-07', timeSlot: 'morning' }),
      makeAssignment({ staffId: 's1', date: '2025-01-08', timeSlot: 'morning' }),
    ]
    const { state, lockedWorking } = toInternalState({
      initialAssignments: assignments,
      staff,
      helpStaff: [],
      dayOffs: [],
      periodDates: dates,
      getRequiredCount: () => 1,
      totalParkingSpots: 5,
    })
    // 9日目（index=3）への Toggle ON は週上限超えで不可
    expect(isValidToggleOn(0, 3, state, 5, lockedWorking)).toBe(false)
  })

  it('駐車場が満杯の日に駐車場利用スタッフは出勤させられない', () => {
    const staff = [
      makeStaff({ id: 's1', usesParking: true }),
      makeStaff({ id: 's2', usesParking: true }),
    ]
    const dates = ['2025-01-06']
    // s2 が出勤中で駐車場1台を使用
    const assignments = [makeAssignment({ staffId: 's2', date: '2025-01-06', timeSlot: 'morning' })]
    const { state, lockedWorking } = toInternalState({
      initialAssignments: assignments,
      staff,
      helpStaff: [],
      dayOffs: [],
      periodDates: dates,
      getRequiredCount: () => 2,
      totalParkingSpots: 1, // 枠1台
    })
    // s1（index=0）への Toggle ON: 駐車場が満杯（1台使用中、枠1台）
    expect(isValidToggleOn(0, 0, state, 1, lockedWorking)).toBe(false)
  })

  it('固定アサインのスタッフには適用できない', () => {
    const staff = [makeStaff({ id: 's1' })]
    const dates = ['2025-01-06']
    // s1が固定アサインで出勤中 → Toggle ONは「既出勤」で弾かれる
    const assignments = [makeAssignment({ staffId: 's1', date: '2025-01-06', isLocked: true, timeSlot: 'morning' })]
    const { state, lockedWorking } = toInternalState({
      initialAssignments: assignments,
      staff,
      helpStaff: [],
      dayOffs: [],
      periodDates: dates,
      getRequiredCount: () => 1,
      totalParkingSpots: 5,
    })
    // 既出勤なので Toggle ON 不可
    expect(isValidToggleOn(0, 0, state, 5, lockedWorking)).toBe(false)
  })

  it('ヘルプスタッフのavailableDatesに含まれない日には出勤させられない', () => {
    const helpStaff = [makeHelpStaff({ id: 'h1', availableDates: ['2025-01-07'] })]
    const dates = ['2025-01-06', '2025-01-07']
    const { state, lockedWorking } = toInternalState({
      initialAssignments: [],
      staff: [],
      helpStaff,
      dayOffs: [],
      periodDates: dates,
      getRequiredCount: () => 1,
      totalParkingSpots: 5,
    })
    // ヘルプスタッフh1（index=0）はavailableDates=['2025-01-07']
    // 0日目（2025-01-06）への Toggle ON は不可
    expect(isValidToggleOn(0, 0, state, 5, lockedWorking)).toBe(false)
    // 1日目（2025-01-07）への Toggle ON は可能
    expect(isValidToggleOn(0, 1, state, 5, lockedWorking)).toBe(true)
  })
})

describe('isValidToggleOff', () => {
  it('出勤中のスタッフを休みにできる（基本）', () => {
    const { state, lockedWorking } = makeSimpleState({}, [true, false, false, false, false])
    expect(isValidToggleOff(0, 0, state, lockedWorking)).toBe(true)
  })

  it('休み中のスタッフには適用できない', () => {
    const { state, lockedWorking } = makeSimpleState({}, [false, false, false, false, false])
    expect(isValidToggleOff(0, 0, state, lockedWorking)).toBe(false)
  })

  it('固定アサインのスタッフは休みにできない', () => {
    const staff = [makeStaff({ id: 's1' })]
    const dates = ['2025-01-06']
    const assignments = [makeAssignment({ staffId: 's1', date: '2025-01-06', isLocked: true, timeSlot: 'morning' })]
    const { state, lockedWorking } = toInternalState({
      initialAssignments: assignments,
      staff,
      helpStaff: [],
      dayOffs: [],
      periodDates: dates,
      getRequiredCount: () => 1,
      totalParkingSpots: 5,
    })
    expect(isValidToggleOff(0, 0, state, lockedWorking)).toBe(false)
  })
})

describe('isValidSwap', () => {
  it('出勤中と休みのスタッフを入れ替えられる（基本）', () => {
    const staff = [makeStaff({ id: 's1' }), makeStaff({ id: 's2' })]
    const dates = ['2025-01-06']
    const assignments = [makeAssignment({ staffId: 's1', date: '2025-01-06', timeSlot: 'morning' })]
    const { state, lockedWorking } = toInternalState({
      initialAssignments: assignments,
      staff,
      helpStaff: [],
      dayOffs: [],
      periodDates: dates,
      getRequiredCount: () => 1,
      totalParkingSpots: 5,
    })
    // s1(index=0)が出勤中、s2(index=1)が休み → Swap可能
    expect(isValidSwap(0, 1, 0, state, 5, lockedWorking)).toBe(true)
  })

  it('固定アサインのあるスタッフはSwap不可', () => {
    const staff = [makeStaff({ id: 's1' }), makeStaff({ id: 's2' })]
    const dates = ['2025-01-06']
    const assignments = [makeAssignment({ staffId: 's1', date: '2025-01-06', isLocked: true, timeSlot: 'morning' })]
    const { state, lockedWorking } = toInternalState({
      initialAssignments: assignments,
      staff,
      helpStaff: [],
      dayOffs: [],
      periodDates: dates,
      getRequiredCount: () => 1,
      totalParkingSpots: 5,
    })
    // s1がロック → Swap不可
    expect(isValidSwap(0, 1, 0, state, 5, lockedWorking)).toBe(false)
  })

  it('希望休のある日への入れ替えは不可', () => {
    const staff = [makeStaff({ id: 's1' }), makeStaff({ id: 's2' })]
    const dates = ['2025-01-06']
    const dayOffs: PreferredDayOff[] = [{ id: 'd1', staffId: 's2', date: '2025-01-06' }]
    const assignments = [makeAssignment({ staffId: 's1', date: '2025-01-06', timeSlot: 'morning' })]
    const { state, lockedWorking } = toInternalState({
      initialAssignments: assignments,
      staff,
      helpStaff: [],
      dayOffs,
      periodDates: dates,
      getRequiredCount: () => 1,
      totalParkingSpots: 5,
    })
    // s2は2025-01-06が希望休 → s2の出勤は不可
    expect(isValidSwap(0, 1, 0, state, 5, lockedWorking)).toBe(false)
  })
})

describe('isValidMove', () => {
  it('出勤日を別日に移動できる（基本）', () => {
    const { state, lockedWorking } = makeSimpleState({}, [true, false, false, false, false])
    // 0日目から1日目へ移動
    expect(isValidMove(0, 0, 1, state, 5, lockedWorking)).toBe(true)
  })

  it('移動先が希望休の日は不可', () => {
    const staff = [makeStaff({ id: 's1' })]
    const dates = ['2025-01-06', '2025-01-07', '2025-01-08', '2025-01-09', '2025-01-10']
    const dayOffs: PreferredDayOff[] = [{ id: 'd1', staffId: 's1', date: '2025-01-07' }]
    const assignments = [makeAssignment({ staffId: 's1', date: '2025-01-06', timeSlot: 'morning' })]
    const { state, lockedWorking } = toInternalState({
      initialAssignments: assignments,
      staff,
      helpStaff: [],
      dayOffs,
      periodDates: dates,
      getRequiredCount: () => 1,
      totalParkingSpots: 5,
    })
    // 0日目から1日目（希望休）へは不可
    expect(isValidMove(0, 0, 1, state, 5, lockedWorking)).toBe(false)
  })

  it('移動元が固定アサインの場合は不可', () => {
    const staff = [makeStaff({ id: 's1' })]
    const dates = ['2025-01-06', '2025-01-07']
    const assignments = [makeAssignment({ staffId: 's1', date: '2025-01-06', isLocked: true, timeSlot: 'morning' })]
    const { state, lockedWorking } = toInternalState({
      initialAssignments: assignments,
      staff,
      helpStaff: [],
      dayOffs: [],
      periodDates: dates,
      getRequiredCount: () => 1,
      totalParkingSpots: 5,
    })
    expect(isValidMove(0, 0, 1, state, 5, lockedWorking)).toBe(false)
  })

  it('ヘルプスタッフのavailableDatesに含まれない移動先は不可', () => {
    const helpStaff = [makeHelpStaff({ id: 'h1', availableDates: ['2025-01-06'] })]
    const dates = ['2025-01-06', '2025-01-07']
    const assignments = [makeAssignment({ staffId: 'h1', date: '2025-01-06', timeSlot: 'morning' })]
    const { state, lockedWorking } = toInternalState({
      initialAssignments: assignments,
      staff: [],
      helpStaff,
      dayOffs: [],
      periodDates: dates,
      getRequiredCount: () => 1,
      totalParkingSpots: 5,
    })
    // 2025-01-07はavailableDatesに含まれない
    expect(isValidMove(0, 0, 1, state, 5, lockedWorking)).toBe(false)
  })
})
