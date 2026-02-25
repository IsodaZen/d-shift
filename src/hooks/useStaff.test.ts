import { describe, it, expect } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useStaff } from './useStaff'
import type { TimeSlot } from '../types'

// --- spec: staff-management ---

describe('useStaff', () => {
  const newStaffData = {
    name: '山田 花子',
    maxWeeklyShifts: 3,
    availableSlots: ['morning', 'afternoon'] as TimeSlot[],
    usesParking: false,
  }

  describe('addStaff', () => {
    it('スタッフを追加するとリストに反映される', () => {
      // spec: 必須項目を入力して登録できる
      const { result } = renderHook(() => useStaff())

      act(() => {
        result.current.addStaff({ ...newStaffData })
      })

      expect(result.current.staff).toHaveLength(1)
      expect(result.current.staff[0].name).toBe('山田 花子')
      expect(result.current.staff[0].maxWeeklyShifts).toBe(3)
    })

    it('追加されたスタッフにはIDが付与される', () => {
      const { result } = renderHook(() => useStaff())

      act(() => {
        result.current.addStaff({ ...newStaffData })
      })

      expect(result.current.staff[0].id).toBeTruthy()
    })

    it('複数のスタッフを追加できる', () => {
      const { result } = renderHook(() => useStaff())

      act(() => {
        result.current.addStaff({ ...newStaffData, name: 'スタッフA' })
        result.current.addStaff({ ...newStaffData, name: 'スタッフB' })
      })

      expect(result.current.staff).toHaveLength(2)
    })
  })

  describe('updateStaff', () => {
    it('スタッフ情報を更新できる', () => {
      // spec: スタッフ情報を変更して保存できる
      const { result } = renderHook(() => useStaff())

      act(() => {
        result.current.addStaff({ ...newStaffData })
      })

      const id = result.current.staff[0].id

      act(() => {
        result.current.updateStaff(id, { name: '鈴木 一郎', maxWeeklyShifts: 5 })
      })

      expect(result.current.staff[0].name).toBe('鈴木 一郎')
      expect(result.current.staff[0].maxWeeklyShifts).toBe(5)
    })

    it('IDが一致しないスタッフは変更されない', () => {
      const { result } = renderHook(() => useStaff())

      act(() => {
        result.current.addStaff({ ...newStaffData, name: 'スタッフA' })
        result.current.addStaff({ ...newStaffData, name: 'スタッフB' })
      })

      const idA = result.current.staff[0].id

      act(() => {
        result.current.updateStaff(idA, { name: 'スタッフA更新' })
      })

      expect(result.current.staff[0].name).toBe('スタッフA更新')
      expect(result.current.staff[1].name).toBe('スタッフB')
    })
  })

  describe('deleteStaff', () => {
    it('スタッフを削除するとリストから消える', () => {
      // spec: スタッフを削除できる
      const { result } = renderHook(() => useStaff())

      act(() => {
        result.current.addStaff({ ...newStaffData })
      })

      const id = result.current.staff[0].id

      act(() => {
        result.current.deleteStaff(id)
      })

      expect(result.current.staff).toHaveLength(0)
    })

    it('対象以外のスタッフは削除されない', () => {
      const { result } = renderHook(() => useStaff())

      act(() => {
        result.current.addStaff({ ...newStaffData, name: 'スタッフA' })
        result.current.addStaff({ ...newStaffData, name: 'スタッフB' })
      })

      const idA = result.current.staff[0].id

      act(() => {
        result.current.deleteStaff(idA)
      })

      expect(result.current.staff).toHaveLength(1)
      expect(result.current.staff[0].name).toBe('スタッフB')
    })
  })

  describe('reorderStaff', () => {
    it('reorderStaff(0, 2) を呼ぶと先頭スタッフが3番目に移動する', () => {
      // spec: スタッフ一覧をドラッグ&ドロップで並び替えられる
      const { result } = renderHook(() => useStaff())

      act(() => {
        result.current.addStaff({ ...newStaffData, name: 'スタッフA' })
        result.current.addStaff({ ...newStaffData, name: 'スタッフB' })
        result.current.addStaff({ ...newStaffData, name: 'スタッフC' })
      })

      act(() => {
        result.current.reorderStaff(0, 2)
      })

      expect(result.current.staff[0].name).toBe('スタッフB')
      expect(result.current.staff[1].name).toBe('スタッフC')
      expect(result.current.staff[2].name).toBe('スタッフA')
    })

    it('reorderStaff(2, 0) を呼ぶと3番目スタッフが先頭に移動する', () => {
      const { result } = renderHook(() => useStaff())

      act(() => {
        result.current.addStaff({ ...newStaffData, name: 'スタッフA' })
        result.current.addStaff({ ...newStaffData, name: 'スタッフB' })
        result.current.addStaff({ ...newStaffData, name: 'スタッフC' })
      })

      act(() => {
        result.current.reorderStaff(2, 0)
      })

      expect(result.current.staff[0].name).toBe('スタッフC')
      expect(result.current.staff[1].name).toBe('スタッフA')
      expect(result.current.staff[2].name).toBe('スタッフB')
    })

    it('reorderStaff(i, i) を呼んでも順序が変わらない', () => {
      const { result } = renderHook(() => useStaff())

      act(() => {
        result.current.addStaff({ ...newStaffData, name: 'スタッフA' })
        result.current.addStaff({ ...newStaffData, name: 'スタッフB' })
        result.current.addStaff({ ...newStaffData, name: 'スタッフC' })
      })

      act(() => {
        result.current.reorderStaff(1, 1)
      })

      expect(result.current.staff[0].name).toBe('スタッフA')
      expect(result.current.staff[1].name).toBe('スタッフB')
      expect(result.current.staff[2].name).toBe('スタッフC')
    })

    it('並び替え後の順序が LocalStorage に保存される', () => {
      const { result } = renderHook(() => useStaff())

      act(() => {
        result.current.addStaff({ ...newStaffData, name: 'スタッフA' })
        result.current.addStaff({ ...newStaffData, name: 'スタッフB' })
      })

      act(() => {
        result.current.reorderStaff(0, 1)
      })

      const stored = JSON.parse(localStorage.getItem('d-shift:staff') ?? '[]')
      expect(stored[0].name).toBe('スタッフB')
      expect(stored[1].name).toBe('スタッフA')
    })
  })
})
