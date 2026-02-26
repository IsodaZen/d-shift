import { describe, it, expect, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useAssignments } from './useAssignments'

// --- spec: shift-assignment / isLocked 関連 ---

const getAllSpots = () => ['A1', 'A2', 'A3', 'A4', 'B1']

beforeEach(() => {
  localStorage.clear()
})

describe('useAssignments / isLocked: 旧データ後方互換', () => {
  it('isLocked フィールドなしの旧データが isLocked: false として扱われる', () => {
    // spec: isLocked フィールドが存在しない既存の ShiftAssignment データを isLocked: false として扱う
    // 旧データ（isLocked なし）をLocalStorageに仕込む
    localStorage.setItem(
      'd-shift:assignments',
      JSON.stringify([
        { id: 'old-1', staffId: 's1', date: '2025-01-06', timeSlot: 'morning', parkingSpot: null },
      ]),
    )

    const { result } = renderHook(() => useAssignments(getAllSpots))

    expect(result.current.assignments).toHaveLength(1)
    expect(result.current.assignments[0].isLocked).toBe(false)
  })
})

describe('useAssignments / addAssignment: isLocked', () => {
  it('手動アサインは isLocked: true で保存される', () => {
    // spec: 手動で登録されたアサインは isLocked: true として保存され、自動生成による上書きから保護される
    const { result } = renderHook(() => useAssignments(getAllSpots))

    act(() => {
      result.current.addAssignment('staff-1', '2025-01-06', 'morning', false)
    })

    expect(result.current.assignments[0].isLocked).toBe(true)
  })
})

describe('useAssignments / bulkSetAssignments: 固定アサイン保護', () => {
  it('isLocked: true のアサインは bulkSetAssignments で保持される', () => {
    // spec: bulkSetAssignments 実行時に isLocked: true のアサインを削除してはならない
    const { result } = renderHook(() => useAssignments(getAllSpots))

    // 固定アサインを追加（手動追加なので isLocked: true になる）
    act(() => {
      result.current.addAssignment('s1', '2025-02-03', 'morning', false)
    })
    expect(result.current.assignments[0].isLocked).toBe(true)

    // 新しいアサインで一括上書き
    const newAssignments = [
      { id: 'new-1', staffId: 's2', date: '2025-02-03', timeSlot: 'afternoon' as const, parkingSpot: null, isLocked: false },
    ]

    act(() => {
      result.current.bulkSetAssignments(newAssignments, ['2025-02-03'])
    })

    // 固定アサイン(s1/morning)は保持され、新アサイン(s2/afternoon)も追加される
    const assignments = result.current.assignments.filter((a) => a.date === '2025-02-03')
    expect(assignments.some((a) => a.staffId === 's1' && a.timeSlot === 'morning')).toBe(true)
    expect(assignments.some((a) => a.staffId === 's2' && a.timeSlot === 'afternoon')).toBe(true)
  })

  it('isLocked: false のアサインは bulkSetAssignments で置き換えられる', () => {
    // spec: 非固定アサインは一括上書きで置き換えられる
    // 非固定アサインをLocalStorageから直接注入（isLocked: false）
    localStorage.setItem(
      'd-shift:assignments',
      JSON.stringify([
        { id: 'old-1', staffId: 's1', date: '2025-02-03', timeSlot: 'morning', parkingSpot: null, isLocked: false },
      ]),
    )
    const { result: result2 } = renderHook(() => useAssignments(getAllSpots))

    const newAssignments = [
      { id: 'new-1', staffId: 's2', date: '2025-02-03', timeSlot: 'afternoon' as const, parkingSpot: null, isLocked: false },
    ]

    act(() => {
      result2.current.bulkSetAssignments(newAssignments, ['2025-02-03'])
    })

    // 旧アサイン(s1/morning)は削除され、新アサイン(s2/afternoon)のみ
    const assignments = result2.current.assignments.filter((a) => a.date === '2025-02-03')
    expect(assignments).toHaveLength(1)
    expect(assignments[0].staffId).toBe('s2')
  })
})
