import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useShiftPeriod } from './useShiftPeriod'

// --- spec: shift-period-config ---

beforeEach(() => {
  localStorage.clear()
})

afterEach(() => {
  vi.useRealTimers()
})

describe('useShiftPeriod', () => {
  describe('デフォルト期間', () => {
    it('LocalStorage未設定時は当月16日〜翌月15日をデフォルト期間として返す', () => {
      // spec: 期間未設定の場合は当月16日〜翌月15日をデフォルトとして扱う
      vi.useFakeTimers()
      vi.setSystemTime(new Date('2026-02-20'))

      const { result } = renderHook(() => useShiftPeriod())

      expect(result.current.shiftPeriod.startDate).toBe('2026-02-16')
      expect(result.current.shiftPeriod.endDate).toBe('2026-03-15')
    })
  })

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
    it('登録済みの期間を削除するとデフォルト期間（当月16日〜翌月15日）に戻る', () => {
      // spec: シフト作成期間を登録・変更できる（削除後はデフォルト期間に戻る）
      vi.useFakeTimers()
      vi.setSystemTime(new Date('2026-02-20'))

      const { result } = renderHook(() => useShiftPeriod())

      act(() => {
        result.current.setShiftPeriod({ startDate: '2025-02-01', endDate: '2025-02-28' })
      })
      act(() => {
        result.current.clearShiftPeriod()
      })

      expect(result.current.shiftPeriod.startDate).toBe('2026-02-16')
      expect(result.current.shiftPeriod.endDate).toBe('2026-03-15')
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

    it('期間未設定時はデフォルト期間外の日付でfalseを返す', () => {
      // デフォルト期間（2026-02-16〜2026-03-15）外の日付でfalse
      vi.useFakeTimers()
      vi.setSystemTime(new Date('2026-02-20'))

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

    it('期間未設定時はデフォルト期間の日付リストを返す', () => {
      // spec: 期間未設定の場合は当月16日〜翌月15日をデフォルトとして扱う
      vi.useFakeTimers()
      vi.setSystemTime(new Date('2026-02-20'))

      const { result } = renderHook(() => useShiftPeriod())
      const dates = result.current.getPeriodDates()

      expect(dates[0]).toBe('2026-02-16')
      expect(dates[dates.length - 1]).toBe('2026-03-15')
      expect(dates.length).toBe(28) // 2月16日〜3月15日 = 28日間
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
