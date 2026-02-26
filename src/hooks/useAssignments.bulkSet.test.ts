import { describe, it, expect, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useAssignments } from './useAssignments'

// --- spec: shift-assignment / バルクアサイン ---

const getAllSpots = () => ['A1', 'A2', 'A3', 'A4', 'B1']

beforeEach(() => {
  localStorage.clear()
})

describe('useAssignments / bulkSetAssignments', () => {
  it('期間内の既存アサインを削除して新しいアサインを一括保存する', () => {
    // spec: バルクアサインが既存アサインなしの状態で適用される
    const { result } = renderHook(() => useAssignments(getAllSpots))

    const newAssignments = [
      { id: 'new-1', staffId: 's1', date: '2025-02-03', timeSlot: 'morning' as const, parkingSpot: null, isLocked: false },
      { id: 'new-2', staffId: 's2', date: '2025-02-04', timeSlot: 'afternoon' as const, parkingSpot: null, isLocked: false },
    ]

    act(() => {
      result.current.bulkSetAssignments(newAssignments, ['2025-02-03', '2025-02-04'])
    })

    expect(result.current.assignments).toHaveLength(2)
    expect(result.current.assignments.map((a) => a.id)).toContain('new-1')
    expect(result.current.assignments.map((a) => a.id)).toContain('new-2')
  })

  it('期間内の非固定（isLocked: false）アサインは上書きされる', () => {
    // spec: 非固定アサインは一括上書きで置き換えられる
    // （UIレベルの確認ダイアログは ShiftPage のテスト範囲。フック自体は非固定アサインを上書き）
    // isLocked: false のアサインを直接LocalStorageに注入する
    localStorage.setItem(
      'd-shift:assignments',
      JSON.stringify([
        { id: 'old-1', staffId: 's1', date: '2025-02-03', timeSlot: 'morning', parkingSpot: null, isLocked: false },
      ]),
    )
    const { result } = renderHook(() => useAssignments(getAllSpots))

    const newAssignments = [
      { id: 'new-1', staffId: 's2', date: '2025-02-03', timeSlot: 'afternoon' as const, parkingSpot: null, isLocked: false },
    ]

    act(() => {
      result.current.bulkSetAssignments(newAssignments, ['2025-02-03'])
    })

    // 旧アサイン(s1/morning, isLocked: false)は消え、新アサイン(s2/afternoon)だけになる
    expect(result.current.assignments).toHaveLength(1)
    expect(result.current.assignments[0].staffId).toBe('s2')
    expect(result.current.assignments[0].timeSlot).toBe('afternoon')
  })

  it('期間外のアサインは影響を受けない', () => {
    // spec: バルクアサインのデータ形式は個別アサインと同一
    // 期間外・期間内アサインを直接LocalStorageに注入する
    localStorage.setItem(
      'd-shift:assignments',
      JSON.stringify([
        { id: 'out-1', staffId: 's1', date: '2025-01-15', timeSlot: 'morning', parkingSpot: null, isLocked: false },
        { id: 'in-1', staffId: 's2', date: '2025-02-03', timeSlot: 'morning', parkingSpot: null, isLocked: false },
      ]),
    )
    const { result } = renderHook(() => useAssignments(getAllSpots))

    const newAssignments = [
      { id: 'new-1', staffId: 's3', date: '2025-02-03', timeSlot: 'afternoon' as const, parkingSpot: null, isLocked: false },
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
      { id: 'new-1', staffId: 's1', date: '2025-02-03', timeSlot: 'morning' as const, parkingSpot: null, isLocked: false },
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
