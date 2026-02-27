// --- spec: shift-optimization / 近傍操作 ---
import { describe, it, expect } from 'vitest'
import {
  generateNeighbor,
  applyOperation,
  undoOperation,
  toInternalState,
} from './shiftOptimizer'
import type { ShiftAssignment, Staff } from '../types'

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

describe('generateNeighbor + applyOperation', () => {
  it('Toggle ON: 休みのスタッフを出勤状態に変更できる', () => {
    const staff = [makeStaff({ id: 's1' }), makeStaff({ id: 's2' })]
    const dates = ['2025-01-06', '2025-01-07']
    // s1が0日目に出勤中、s2は全休み
    const assignments = [makeAssignment({ staffId: 's1', date: '2025-01-06', timeSlot: 'morning' })]
    const { state, lockedWorking } = toInternalState({
      initialAssignments: assignments,
      staff,
      helpStaff: [],
      dayOffs: [],
      periodDates: dates,
      getRequiredCount: () => 2,
      totalParkingSpots: 5,
    })

    // 常にopType=0（Toggle ON）を選択し、s2（index=1）、0日目を選ぶ乱数シーケンス
    let call = 0
    const random = () => {
      call++
      if (call === 1) return 0 / 4 // opType=0 (Toggle ON)
      if (call === 2) return 1 / 2 // staffIndex=1 (s2)
      return 0 // dateIndex=0
    }

    const op = generateNeighbor(state, 5, lockedWorking, random)
    expect(op).not.toBeNull()
    expect(op?.type).toBe('toggleOn')

    if (op) {
      expect(state.working[1][0]).toBe(false) // 適用前
      applyOperation(state, op)
      expect(state.working[1][0]).toBe(true) // 適用後
    }
  })

  it('Toggle OFF: 出勤中のスタッフを休み状態に変更できる', () => {
    const staff = [makeStaff({ id: 's1' })]
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

    let call = 0
    const random = () => {
      call++
      if (call === 1) return 1 / 4 // opType=1 (Toggle OFF)
      return 0 // staffIndex=0, dateIndex=0
    }

    const op = generateNeighbor(state, 5, lockedWorking, random)
    expect(op?.type).toBe('toggleOff')

    if (op) {
      applyOperation(state, op)
      expect(state.working[0][0]).toBe(false)
    }
  })

  it('Swap: 同一日で出勤と休みのスタッフを入れ替える', () => {
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

    let call = 0
    const random = () => {
      call++
      if (call === 1) return 2 / 4 // opType=2 (Swap)
      if (call === 2) return 0 // dateIndex=0
      if (call === 3) return 0 // onStaffIndex=0 (s1, 出勤中)
      return 0.5 // offStaffIndex=1 (s2, 休み)  floor(0.5*2)=1
    }

    const op = generateNeighbor(state, 5, lockedWorking, random)
    expect(op?.type).toBe('swap')

    if (op) {
      applyOperation(state, op)
      expect(state.working[0][0]).toBe(false) // s1 が休みに
      expect(state.working[1][0]).toBe(true)  // s2 が出勤に
    }
  })

  it('Move: 出勤日を別の日に移動する', () => {
    const staff = [makeStaff({ id: 's1' })]
    const dates = ['2025-01-06', '2025-01-07', '2025-01-08', '2025-01-09', '2025-01-10']
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

    let call = 0
    const random = () => {
      call++
      if (call === 1) return 3 / 4 // opType=3 (Move)
      if (call === 2) return 0     // staffIndex=0
      if (call === 3) return 0     // fromDateIndex=0
      return 0.2 // toDateIndex=floor(0.2*5)=1
    }

    const op = generateNeighbor(state, 5, lockedWorking, random)
    expect(op?.type).toBe('move')

    if (op) {
      applyOperation(state, op)
      expect(state.working[0][0]).toBe(false) // 移動元
      expect(state.working[0][1]).toBe(true)  // 移動先
    }
  })

  it('固定アサインのスタッフへのToggle OFFは棄却される', () => {
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

    let call = 0
    const random = () => {
      call++
      if (call === 1) return 1 / 4 // opType=1 (Toggle OFF)
      return 0
    }

    const op = generateNeighbor(state, 5, lockedWorking, random)
    // 固定アサインなので棄却 → null
    expect(op).toBeNull()
  })

  it('週上限に達しているスタッフへのToggle ONは棄却される', () => {
    // 週上限1日のスタッフが既に1日出勤中
    const staff = [makeStaff({ id: 's1', maxWeeklyShifts: 1 })]
    const dates = ['2025-01-06', '2025-01-07']
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

    let call = 0
    const random = () => {
      call++
      if (call === 1) return 0 / 4 // opType=0 (Toggle ON)
      if (call === 2) return 0     // staffIndex=0 (週上限に達している)
      return 0.5 // dateIndex=1 (休みの日)
    }

    const op = generateNeighbor(state, 5, lockedWorking, random)
    expect(op).toBeNull()
  })
})

describe('undoOperation', () => {
  it('Toggle ONを取り消せる', () => {
    const staff = [makeStaff({ id: 's1' })]
    const { state, lockedWorking } = toInternalState({
      initialAssignments: [],
      staff,
      helpStaff: [],
      dayOffs: [],
      periodDates: ['2025-01-06'],
      getRequiredCount: () => 1,
      totalParkingSpots: 5,
    })

    const op = { type: 'toggleOn' as const, staffIndex: 0, dateIndex: 0 }
    applyOperation(state, op)
    expect(state.working[0][0]).toBe(true)
    undoOperation(state, op)
    expect(state.working[0][0]).toBe(false)
  })

  it('Moveを取り消せる', () => {
    const staff = [makeStaff({ id: 's1' })]
    const assignments = [makeAssignment({ staffId: 's1', date: '2025-01-06', timeSlot: 'morning' })]
    const { state } = toInternalState({
      initialAssignments: assignments,
      staff,
      helpStaff: [],
      dayOffs: [],
      periodDates: ['2025-01-06', '2025-01-07'],
      getRequiredCount: () => 1,
      totalParkingSpots: 5,
    })

    const op = { type: 'move' as const, staffIndex: 0, fromDateIndex: 0, toDateIndex: 1 }
    applyOperation(state, op)
    expect(state.working[0][0]).toBe(false)
    expect(state.working[0][1]).toBe(true)
    undoOperation(state, op)
    expect(state.working[0][0]).toBe(true)
    expect(state.working[0][1]).toBe(false)
  })
})
