// --- spec: shift-optimization / 型定義 ---
import { describe, it, expect } from 'vitest'
import type {
  OptimizationConfig,
  EvalResult,
  OptimizerInput,
  WorkerMessage,
} from './index'
import type { ShiftAssignment, Staff, HelpStaff, PreferredDayOff } from './index'

describe('OptimizationConfig 型定義', () => {
  it('maxIterations, noImprovementLimit, timeLimitMs フィールドを持つ', () => {
    const config: OptimizationConfig = {
      maxIterations: 20000,
      noImprovementLimit: 1000,
      timeLimitMs: 8000,
    }
    expect(config.maxIterations).toBe(20000)
    expect(config.noImprovementLimit).toBe(1000)
    expect(config.timeLimitMs).toBe(8000)
  })
})

describe('EvalResult 型定義', () => {
  it('shortfallPeak, fairnessVariance, parkingPeak フィールドを持つ', () => {
    const result: EvalResult = {
      shortfallPeak: 2,
      fairnessVariance: 1.5,
      parkingPeak: 3,
    }
    expect(result.shortfallPeak).toBe(2)
    expect(result.fairnessVariance).toBe(1.5)
    expect(result.parkingPeak).toBe(3)
  })
})

describe('OptimizerInput 型定義', () => {
  it('必要なフィールドを持つ', () => {
    const assignment: ShiftAssignment = {
      id: 'a1',
      staffId: 's1',
      date: '2025-01-06',
      timeSlot: 'morning',
      parkingSpot: null,
      isLocked: false,
    }
    const staff: Staff = {
      id: 's1',
      name: '山田',
      maxWeeklyShifts: 5,
      availableSlots: ['morning', 'afternoon'],
      usesParking: false,
    }
    const helpStaff: HelpStaff = {
      id: 'h1',
      name: 'ヘルプ1',
      availableSlots: ['morning'],
      availableDates: ['2025-01-06'],
      usesParking: false,
    }
    const dayOff: PreferredDayOff = {
      id: 'd1',
      staffId: 's1',
      date: '2025-01-07',
    }
    const input: OptimizerInput = {
      initialAssignments: [assignment],
      staff: [staff],
      helpStaff: [helpStaff],
      dayOffs: [dayOff],
      periodDates: ['2025-01-06', '2025-01-07'],
      getRequiredCount: (_date, _slot) => 2,
      totalParkingSpots: 5,
    }
    expect(input.periodDates).toHaveLength(2)
    expect(input.totalParkingSpots).toBe(5)
    expect(input.config).toBeUndefined()
  })

  it('config は省略可能', () => {
    const input: OptimizerInput = {
      initialAssignments: [],
      staff: [],
      helpStaff: [],
      dayOffs: [],
      periodDates: [],
      getRequiredCount: () => 0,
      totalParkingSpots: 0,
      config: { maxIterations: 100 },
    }
    expect(input.config?.maxIterations).toBe(100)
  })
})

describe('WorkerMessage 型定義', () => {
  it('progress メッセージを表現できる', () => {
    const msg: WorkerMessage = { type: 'progress', progress: 50 }
    expect(msg.type).toBe('progress')
    if (msg.type === 'progress') {
      expect(msg.progress).toBe(50)
    }
  })

  it('result メッセージを表現できる', () => {
    const msg: WorkerMessage = { type: 'result', assignments: [] }
    expect(msg.type).toBe('result')
  })

  it('error メッセージを表現できる', () => {
    const msg: WorkerMessage = { type: 'error', message: '処理エラー' }
    expect(msg.type).toBe('error')
    if (msg.type === 'error') {
      expect(msg.message).toBe('処理エラー')
    }
  })
})
