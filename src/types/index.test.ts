// --- spec: shift-assignment / isLocked型定義 ---
import { describe, it, expect } from 'vitest'
import type { ShiftAssignment } from './index'

describe('ShiftAssignment 型定義', () => {
  it('isLocked フィールドを持つ', () => {
    // spec: ShiftAssignment に isLocked: boolean フィールドを追加する
    const assignment: ShiftAssignment = {
      id: 'a1',
      staffId: 's1',
      date: '2025-01-06',
      timeSlot: 'morning',
      parkingSpot: null,
      isLocked: true,
    }
    expect(assignment.isLocked).toBe(true)
  })

  it('isLocked: false のアサインも有効', () => {
    const assignment: ShiftAssignment = {
      id: 'a2',
      staffId: 's1',
      date: '2025-01-06',
      timeSlot: 'afternoon',
      parkingSpot: null,
      isLocked: false,
    }
    expect(assignment.isLocked).toBe(false)
  })
})
