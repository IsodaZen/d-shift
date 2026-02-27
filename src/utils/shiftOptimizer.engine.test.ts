// --- spec: shift-optimization / 最適化エンジン・変換関数 ---
import { describe, it, expect } from 'vitest'
import {
  optimizeShift,
  toInternalState,
  toAssignments,
} from './shiftOptimizer'
import type { ShiftAssignment, Staff, HelpStaff, OptimizerInput } from '../types'

const makeStaff = (overrides: Partial<Staff> & { id: string }): Staff => ({
  name: 'テスト',
  maxWeeklyShifts: 5,
  availableSlots: ['morning', 'afternoon'],
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

const allParkingSpots = ['A1', 'A2', 'A3', 'A4', 'B1']

// ---------------------------------------------------------------------------
// toInternalState のテスト
// ---------------------------------------------------------------------------

describe('toInternalState', () => {
  it('アサインがある日付・スタッフを working=true に変換する', () => {
    const staff = [makeStaff({ id: 's1' })]
    const dates = ['2025-01-06', '2025-01-07']
    const assignments = [makeAssignment({ staffId: 's1', date: '2025-01-06', timeSlot: 'morning' })]

    const { state } = toInternalState({
      initialAssignments: assignments,
      staff,
      helpStaff: [],
      dayOffs: [],
      periodDates: dates,
      getRequiredCount: () => 1,
      totalParkingSpots: 5,
    })

    expect(state.working[0][0]).toBe(true)  // s1, 0日目（2025-01-06）
    expect(state.working[0][1]).toBe(false) // s1, 1日目（2025-01-07）
  })

  it('固定アサインを lockedWorking=true に変換する', () => {
    const staff = [makeStaff({ id: 's1' })]
    const dates = ['2025-01-06']
    const assignments = [makeAssignment({ staffId: 's1', date: '2025-01-06', isLocked: true, timeSlot: 'morning' })]

    const { lockedWorking } = toInternalState({
      initialAssignments: assignments,
      staff,
      helpStaff: [],
      dayOffs: [],
      periodDates: dates,
      getRequiredCount: () => 1,
      totalParkingSpots: 5,
    })

    expect(lockedWorking[0][0]).toBe(true)
  })

  it('通常スタッフとヘルプスタッフを区別する', () => {
    const staff = [makeStaff({ id: 's1' })]
    const helpStaff: HelpStaff[] = [{ id: 'h1', name: 'ヘルプ', availableSlots: ['morning'], availableDates: ['2025-01-06'], usesParking: false }]
    const dates = ['2025-01-06']

    const { state } = toInternalState({
      initialAssignments: [],
      staff,
      helpStaff,
      dayOffs: [],
      periodDates: dates,
      getRequiredCount: () => 1,
      totalParkingSpots: 5,
    })

    expect(state.staffIds).toContain('s1')
    expect(state.staffIds).toContain('h1')
    expect(state.staffInfo[0].isHelp).toBe(false)
    expect(state.staffInfo[1].isHelp).toBe(true)
  })

  it('periodDates内に存在しない日付のアサインは無視する', () => {
    const staff = [makeStaff({ id: 's1' })]
    const dates = ['2025-01-06']
    // 期間外のアサイン
    const assignments = [makeAssignment({ staffId: 's1', date: '2025-01-07', timeSlot: 'morning' })]

    const { state } = toInternalState({
      initialAssignments: assignments,
      staff,
      helpStaff: [],
      dayOffs: [],
      periodDates: dates,
      getRequiredCount: () => 1,
      totalParkingSpots: 5,
    })

    expect(state.working[0][0]).toBe(false)
  })
})

// ---------------------------------------------------------------------------
// toAssignments のテスト
// ---------------------------------------------------------------------------

describe('toAssignments', () => {
  it('working=trueのスタッフにアサインを生成する', () => {
    const staff = [makeStaff({ id: 's1', availableSlots: ['morning'] })]
    const dates = ['2025-01-06']
    const input: OptimizerInput = {
      initialAssignments: [],
      staff,
      helpStaff: [],
      dayOffs: [],
      periodDates: dates,
      getRequiredCount: () => 1,
      totalParkingSpots: 5,
    }
    const { state } = toInternalState(input)
    state.working[0][0] = true

    const result = toAssignments(state, input, allParkingSpots)
    expect(result.some((a) => a.staffId === 's1' && a.date === '2025-01-06')).toBe(true)
  })

  it('必要人数が0の時間帯にはアサインを生成しない', () => {
    const staff = [makeStaff({ id: 's1', availableSlots: ['morning', 'afternoon'] })]
    const dates = ['2025-01-06']
    const input: OptimizerInput = {
      initialAssignments: [],
      staff,
      helpStaff: [],
      dayOffs: [],
      periodDates: dates,
      getRequiredCount: (_date, slot) => slot === 'morning' ? 1 : 0,
      totalParkingSpots: 5,
    }
    const { state } = toInternalState(input)
    state.working[0][0] = true

    const result = toAssignments(state, input, allParkingSpots)
    expect(result.some((a) => a.timeSlot === 'afternoon')).toBe(false)
    expect(result.some((a) => a.timeSlot === 'morning')).toBe(true)
  })

  it('固定アサインはそのまま保持される', () => {
    const staff = [makeStaff({ id: 's1', availableSlots: ['morning'] })]
    const dates = ['2025-01-06']
    const lockedAssignment: ShiftAssignment = {
      id: 'locked-1',
      staffId: 's1',
      date: '2025-01-06',
      timeSlot: 'morning',
      parkingSpot: 'A1',
      isLocked: true,
    }
    const input: OptimizerInput = {
      initialAssignments: [lockedAssignment],
      staff,
      helpStaff: [],
      dayOffs: [],
      periodDates: dates,
      getRequiredCount: () => 1,
      totalParkingSpots: 5,
    }
    const { state } = toInternalState(input)

    const result = toAssignments(state, input, allParkingSpots)
    const locked = result.find((a) => a.id === 'locked-1')
    expect(locked).toBeDefined()
    expect(locked?.parkingSpot).toBe('A1')
    expect(locked?.isLocked).toBe(true)
  })

  it('駐車場利用スタッフには空きスポットが割り当てられる', () => {
    const staff = [makeStaff({ id: 's1', usesParking: true, availableSlots: ['morning'] })]
    const dates = ['2025-01-06']
    const input: OptimizerInput = {
      initialAssignments: [],
      staff,
      helpStaff: [],
      dayOffs: [],
      periodDates: dates,
      getRequiredCount: () => 1,
      totalParkingSpots: 5,
    }
    const { state } = toInternalState(input)
    state.working[0][0] = true

    const result = toAssignments(state, input, allParkingSpots)
    expect(result[0].parkingSpot).not.toBeNull()
  })
})

// ---------------------------------------------------------------------------
// optimizeShift のテスト
// ---------------------------------------------------------------------------

describe('optimizeShift', () => {
  it('初期解がすでに最適な場合、同等以上の評価値を返す', () => {
    // 1人のスタッフ、1日間、必要人数1
    const staff = [makeStaff({ id: 's1', availableSlots: ['morning'] })]
    const dates = ['2025-01-06']
    const initialAssignments = [makeAssignment({ staffId: 's1', date: '2025-01-06', timeSlot: 'morning' })]

    const result = optimizeShift(
      {
        initialAssignments,
        staff,
        helpStaff: [],
        dayOffs: [],
        periodDates: dates,
        getRequiredCount: () => 1,
        totalParkingSpots: 5,
        config: { maxIterations: 100 },
      },
      allParkingSpots,
    )

    // 最適化後も s1 が出勤しているはず
    expect(result.some((a) => a.staffId === 's1' && a.date === '2025-01-06')).toBe(true)
  })

  it('固定アサインは最適化で変更されない', () => {
    const staff = [makeStaff({ id: 's1', availableSlots: ['morning'] }), makeStaff({ id: 's2', availableSlots: ['morning'] })]
    const dates = ['2025-01-06', '2025-01-07']
    const lockedAssignment: ShiftAssignment = {
      id: 'locked-1',
      staffId: 's1',
      date: '2025-01-06',
      timeSlot: 'morning',
      parkingSpot: null,
      isLocked: true,
    }

    const result = optimizeShift(
      {
        initialAssignments: [lockedAssignment],
        staff,
        helpStaff: [],
        dayOffs: [],
        periodDates: dates,
        getRequiredCount: () => 1,
        totalParkingSpots: 5,
        config: { maxIterations: 100 },
      },
      allParkingSpots,
    )

    // 固定アサインが結果に含まれる
    const locked = result.find((a) => a.staffId === 's1' && a.date === '2025-01-06' && a.isLocked)
    expect(locked).toBeDefined()
  })

  it('最大反復回数に達したら終了して結果を返す', () => {
    const staff = [makeStaff({ id: 's1', availableSlots: ['morning'] })]
    const dates = ['2025-01-06']
    const initialAssignments = [makeAssignment({ staffId: 's1', date: '2025-01-06', timeSlot: 'morning' })]

    // maxIterations=10 で終了
    const result = optimizeShift(
      {
        initialAssignments,
        staff,
        helpStaff: [],
        dayOffs: [],
        periodDates: dates,
        getRequiredCount: () => 1,
        totalParkingSpots: 5,
        config: { maxIterations: 10, noImprovementLimit: 1000, timeLimitMs: 8000 },
      },
      allParkingSpots,
    )

    expect(Array.isArray(result)).toBe(true)
  })

  it('改善なし連続1000回で早期終了する', () => {
    // 全員休みの初期解・全員希望休で改善できない状態
    const staff = [makeStaff({ id: 's1', availableSlots: ['morning'] })]
    const dates = ['2025-01-06']
    // 希望休で Toggle ON が常に棄却される
    const input: OptimizerInput = {
      initialAssignments: [],
      staff,
      helpStaff: [],
      dayOffs: [{ id: 'd1', staffId: 's1', date: '2025-01-06' }],
      periodDates: dates,
      getRequiredCount: () => 1,
      totalParkingSpots: 5,
      config: { maxIterations: 20000, noImprovementLimit: 10, timeLimitMs: 8000 },
    }

    const start = Date.now()
    const result = optimizeShift(input, allParkingSpots)
    const elapsed = Date.now() - start

    // 早期終了したはず（希望休で全操作棄却 → 改善なしで終了）
    expect(elapsed).toBeLessThan(5000) // 5秒以内に終了
    expect(Array.isArray(result)).toBe(true)
  })

  it('プログレスコールバックが呼ばれる', () => {
    const staff = [makeStaff({ id: 's1', availableSlots: ['morning'] })]
    const dates = ['2025-01-06']
    const progressValues: number[] = []

    optimizeShift(
      {
        initialAssignments: [],
        staff,
        helpStaff: [],
        dayOffs: [],
        periodDates: dates,
        getRequiredCount: () => 1,
        totalParkingSpots: 5,
        config: { maxIterations: 500 },
      },
      allParkingSpots,
      (p) => progressValues.push(p),
    )

    // 最後に100%が通知される
    expect(progressValues[progressValues.length - 1]).toBe(100)
  })

  it('初期解が改善可能な場合、最適化によりshortfallPeakが減少する', () => {
    // スタッフ2人、2日間、毎日2人必要
    // 初期解: 2人とも0日目のみ出勤 → 1日目に2人不足（shortfallPeak=2）
    // 最適化後: 2人とも両日出勤 → shortfallPeak=0
    const staff = [
      makeStaff({ id: 's1', availableSlots: ['morning'], maxWeeklyShifts: 5 }),
      makeStaff({ id: 's2', availableSlots: ['morning'], maxWeeklyShifts: 5 }),
    ]
    const dates = ['2025-01-06', '2025-01-07']
    const initialAssignments: ShiftAssignment[] = [
      makeAssignment({ staffId: 's1', date: '2025-01-06', timeSlot: 'morning' }),
      makeAssignment({ staffId: 's2', date: '2025-01-06', timeSlot: 'morning' }),
    ]

    const result = optimizeShift(
      {
        initialAssignments,
        staff,
        helpStaff: [],
        dayOffs: [],
        periodDates: dates,
        // morningのみ2人必要（staffのavailableSlotsと合わせる）
        getRequiredCount: (_date, slot) => slot === 'morning' ? 2 : 0,
        totalParkingSpots: 5,
        config: { maxIterations: 5000 },
      },
      allParkingSpots,
    )

    // 最適化後、1日目（2025-01-07）にも誰かが出勤しているはず
    const day1Assignments = result.filter((a) => a.date === '2025-01-07')
    expect(day1Assignments.length).toBeGreaterThan(0)
  })
})
