import { describe, it, expect } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useShiftPeriod } from './useShiftPeriod'

// --- spec: shift-period-config ---

describe('useShiftPeriod', () => {
  describe('setShiftPeriod', () => {
    it('シフト作成期間を登録できる', () => {
      // spec: シフト作成期間を登録・変更できる
      const { result } = renderHook(() => useShiftPeriod())

      act(() => {
        result.current.setShiftPeriod({ startDate: '2025-02-01', endDate: '2025-02-28' })
      })

      expect(result.current.shiftPeriod?.startDate).toBe('2025-02-01')
      expect(result.current.shiftPeriod?.endDate).toBe('2025-02-28')
    })

    it('登録した期間はLocalStorageに永続化される', () => {
      // spec: LocalStorageに保存される
      const { result } = renderHook(() => useShiftPeriod())

      act(() => {
        result.current.setShiftPeriod({ startDate: '2025-02-01', endDate: '2025-02-07' })
      })

      expect(localStorage.getItem('d-shift:shift-period')).toContain('2025-02-01')
    })

    it('期間を上書き変更できる', () => {
      // spec: シフト作成期間を登録・変更できる
      const { result } = renderHook(() => useShiftPeriod())

      act(() => {
        result.current.setShiftPeriod({ startDate: '2025-02-01', endDate: '2025-02-07' })
      })
      act(() => {
        result.current.setShiftPeriod({ startDate: '2025-03-01', endDate: '2025-03-31' })
      })

      expect(result.current.shiftPeriod?.startDate).toBe('2025-03-01')
    })
  })

  describe('clearShiftPeriod', () => {
    it('登録済みの期間を削除できる', () => {
      // spec: シフト作成期間を登録・変更できる（削除も含む）
      const { result } = renderHook(() => useShiftPeriod())

      act(() => {
        result.current.setShiftPeriod({ startDate: '2025-02-01', endDate: '2025-02-28' })
      })
      act(() => {
        result.current.clearShiftPeriod()
      })

      expect(result.current.shiftPeriod).toBeNull()
    })
  })

  describe('isWithinPeriod', () => {
    it('期間内の日付はtrueを返す', () => {
      // spec: 週ナビゲーションをシフト作成期間内に制限する（前提）
      const { result } = renderHook(() => useShiftPeriod())

      act(() => {
        result.current.setShiftPeriod({ startDate: '2025-02-01', endDate: '2025-02-28' })
      })

      expect(result.current.isWithinPeriod('2025-02-01')).toBe(true)
      expect(result.current.isWithinPeriod('2025-02-15')).toBe(true)
      expect(result.current.isWithinPeriod('2025-02-28')).toBe(true)
    })

    it('期間外の日付はfalseを返す', () => {
      const { result } = renderHook(() => useShiftPeriod())

      act(() => {
        result.current.setShiftPeriod({ startDate: '2025-02-01', endDate: '2025-02-28' })
      })

      expect(result.current.isWithinPeriod('2025-01-31')).toBe(false)
      expect(result.current.isWithinPeriod('2025-03-01')).toBe(false)
    })

    it('期間未設定時はfalseを返す', () => {
      const { result } = renderHook(() => useShiftPeriod())

      expect(result.current.isWithinPeriod('2025-02-15')).toBe(false)
    })
  })

  describe('getPeriodDates', () => {
    it('開始日〜終了日の全日付リストを返す', () => {
      // spec: シフト作成期間内の日付を対象に表示する
      const { result } = renderHook(() => useShiftPeriod())

      act(() => {
        result.current.setShiftPeriod({ startDate: '2025-02-03', endDate: '2025-02-05' })
      })

      expect(result.current.getPeriodDates()).toEqual([
        '2025-02-03',
        '2025-02-04',
        '2025-02-05',
      ])
    })

    it('1日だけの期間は1件を返す', () => {
      const { result } = renderHook(() => useShiftPeriod())

      act(() => {
        result.current.setShiftPeriod({ startDate: '2025-02-01', endDate: '2025-02-01' })
      })

      expect(result.current.getPeriodDates()).toHaveLength(1)
      expect(result.current.getPeriodDates()[0]).toBe('2025-02-01')
    })

    it('期間未設定時は空配列を返す', () => {
      const { result } = renderHook(() => useShiftPeriod())

      expect(result.current.getPeriodDates()).toEqual([])
    })

    it('終了日が開始日より前の場合は空配列を返す', () => {
      const { result } = renderHook(() => useShiftPeriod())

      act(() => {
        result.current.setShiftPeriod({ startDate: '2025-02-28', endDate: '2025-02-01' })
      })

      expect(result.current.getPeriodDates()).toEqual([])
    })
  })
})
