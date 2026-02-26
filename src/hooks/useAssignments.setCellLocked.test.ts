import { describe, it, expect, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useAssignments } from './useAssignments'

// --- spec: shift-assignment / setCellLocked ---

const getAllSpots = () => ['A1', 'A2', 'A3', 'A4', 'B1']

beforeEach(() => {
  localStorage.clear()
})

describe('useAssignments / setCellLocked', () => {
  it('setCellLocked(true) で対象セルの全アサインが isLocked: true になる', () => {
    // spec: セル単位で固定/非固定を切り替えられる
    localStorage.setItem(
      'd-shift:assignments',
      JSON.stringify([
        { id: 'a1', staffId: 's1', date: '2025-01-06', timeSlot: 'morning', parkingSpot: null, isLocked: false },
        { id: 'a2', staffId: 's1', date: '2025-01-06', timeSlot: 'afternoon', parkingSpot: null, isLocked: false },
      ]),
    )

    const { result } = renderHook(() => useAssignments(getAllSpots))

    act(() => {
      result.current.setCellLocked('s1', '2025-01-06', true)
    })

    const s1Jan6 = result.current.assignments.filter((a) => a.staffId === 's1' && a.date === '2025-01-06')
    expect(s1Jan6.every((a) => a.isLocked)).toBe(true)
  })

  it('setCellLocked(false) で対象セルの全アサインが isLocked: false になる', () => {
    // spec: 全固定のセルを固定解除できる
    localStorage.setItem(
      'd-shift:assignments',
      JSON.stringify([
        { id: 'a1', staffId: 's1', date: '2025-01-06', timeSlot: 'morning', parkingSpot: null, isLocked: true },
        { id: 'a2', staffId: 's1', date: '2025-01-06', timeSlot: 'afternoon', parkingSpot: null, isLocked: true },
      ]),
    )

    const { result } = renderHook(() => useAssignments(getAllSpots))

    act(() => {
      result.current.setCellLocked('s1', '2025-01-06', false)
    })

    const s1Jan6 = result.current.assignments.filter((a) => a.staffId === 's1' && a.date === '2025-01-06')
    expect(s1Jan6.every((a) => !a.isLocked)).toBe(true)
  })

  it('対象以外のセルのアサインは影響を受けない', () => {
    localStorage.setItem(
      'd-shift:assignments',
      JSON.stringify([
        { id: 'a1', staffId: 's1', date: '2025-01-06', timeSlot: 'morning', parkingSpot: null, isLocked: false },
        { id: 'a2', staffId: 's2', date: '2025-01-06', timeSlot: 'morning', parkingSpot: null, isLocked: false },
        { id: 'a3', staffId: 's1', date: '2025-01-07', timeSlot: 'morning', parkingSpot: null, isLocked: false },
      ]),
    )

    const { result } = renderHook(() => useAssignments(getAllSpots))

    act(() => {
      result.current.setCellLocked('s1', '2025-01-06', true)
    })

    // s2 の 2025-01-06 は変わらない
    expect(result.current.assignments.find((a) => a.id === 'a2')?.isLocked).toBe(false)
    // s1 の 2025-01-07 は変わらない
    expect(result.current.assignments.find((a) => a.id === 'a3')?.isLocked).toBe(false)
  })

  it('混在セル（固定+非固定）に setCellLocked(true) で全アサインが固定化される', () => {
    // spec: 混在セル（固定+非固定）を固定化できる
    localStorage.setItem(
      'd-shift:assignments',
      JSON.stringify([
        { id: 'a1', staffId: 's1', date: '2025-01-06', timeSlot: 'morning', parkingSpot: null, isLocked: true },
        { id: 'a2', staffId: 's1', date: '2025-01-06', timeSlot: 'afternoon', parkingSpot: null, isLocked: false },
      ]),
    )

    const { result } = renderHook(() => useAssignments(getAllSpots))

    act(() => {
      result.current.setCellLocked('s1', '2025-01-06', true)
    })

    const s1Jan6 = result.current.assignments.filter((a) => a.staffId === 's1' && a.date === '2025-01-06')
    expect(s1Jan6.every((a) => a.isLocked)).toBe(true)
  })
})
