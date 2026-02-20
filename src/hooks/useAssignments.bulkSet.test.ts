import { describe, it, expect } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useAssignments } from './useAssignments'

// --- spec: shift-assignment / バルクアサイン ---

const getAllSpots = () => ['A1', 'A2', 'A3', 'A4', 'B1']

describe('useAssignments / bulkSetAssignments', () => {
  it('期間内の既存アサインを削除して新しいアサインを一括保存する', () => {
    // spec: バルクアサインが既存アサインなしの状態で適用される
    const { result } = renderHook(() => useAssignments(getAllSpots))

    const newAssignments = [
      { id: 'new-1', staffId: 's1', date: '2025-02-03', timeSlot: 'morning' as const, parkingSpot: null },
      { id: 'new-2', staffId: 's2', date: '2025-02-04', timeSlot: 'afternoon' as const, parkingSpot: null },
    ]

    act(() => {
      result.current.bulkSetAssignments(newAssignments, ['2025-02-03', '2025-02-04'])
    })

    expect(result.current.assignments).toHaveLength(2)
    expect(result.current.assignments.map((a) => a.id)).toContain('new-1')
    expect(result.current.assignments.map((a) => a.id)).toContain('new-2')
  })

  it('期間内の既存アサインは上書きされる', () => {
    // spec: バルクアサインが既存アサインありの状態で適用される
    // （UIレベルの確認ダイアログは ShiftPage のテスト範囲。フック自体は問答無用で上書き）
    const { result } = renderHook(() => useAssignments(getAllSpots))

    // 既存アサインを追加
    act(() => {
      result.current.addAssignment('s1', '2025-02-03', 'morning', false)
    })

    const newAssignments = [
      { id: 'new-1', staffId: 's2', date: '2025-02-03', timeSlot: 'afternoon' as const, parkingSpot: null },
    ]

    act(() => {
      result.current.bulkSetAssignments(newAssignments, ['2025-02-03'])
    })

    // 旧アサイン(s1/morning)は消え、新アサイン(s2/afternoon)だけになる
    expect(result.current.assignments).toHaveLength(1)
    expect(result.current.assignments[0].staffId).toBe('s2')
    expect(result.current.assignments[0].timeSlot).toBe('afternoon')
  })

  it('期間外のアサインは影響を受けない', () => {
    // spec: バルクアサインのデータ形式は個別アサインと同一
    const { result } = renderHook(() => useAssignments(getAllSpots))

    // 期間外アサイン
    act(() => {
      result.current.addAssignment('s1', '2025-01-15', 'morning', false)
    })
    // 期間内アサイン
    act(() => {
      result.current.addAssignment('s2', '2025-02-03', 'morning', false)
    })

    const newAssignments = [
      { id: 'new-1', staffId: 's3', date: '2025-02-03', timeSlot: 'afternoon' as const, parkingSpot: null },
    ]

    act(() => {
      result.current.bulkSetAssignments(newAssignments, ['2025-02-03'])
    })

    // 期間外(1/15)は残る、期間内は新アサインのみ
    const jan15 = result.current.assignments.filter((a) => a.date === '2025-01-15')
    const feb03 = result.current.assignments.filter((a) => a.date === '2025-02-03')

    expect(jan15).toHaveLength(1)
    expect(jan15[0].staffId).toBe('s1')
    expect(feb03).toHaveLength(1)
    expect(feb03[0].staffId).toBe('s3')
  })

  it('バルクアサイン後も個別アサインを編集できる', () => {
    // spec: バルクアサイン後に個別アサインを編集できる
    const { result } = renderHook(() => useAssignments(getAllSpots))

    const newAssignments = [
      { id: 'new-1', staffId: 's1', date: '2025-02-03', timeSlot: 'morning' as const, parkingSpot: null },
    ]

    act(() => {
      result.current.bulkSetAssignments(newAssignments, ['2025-02-03'])
    })

    // 個別追加
    act(() => {
      result.current.addAssignment('s2', '2025-02-03', 'afternoon', false)
    })

    expect(result.current.assignments).toHaveLength(2)

    // 個別削除
    act(() => {
      result.current.removeAssignment('s1', '2025-02-03', 'morning')
    })

    expect(result.current.assignments).toHaveLength(1)
    expect(result.current.assignments[0].staffId).toBe('s2')
  })
})
