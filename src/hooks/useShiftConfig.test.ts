import { describe, it, expect } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useShiftConfig } from './useShiftConfig'

// --- spec: shift-slot-config / 曜日別デフォルト値 ---

describe('useShiftConfig', () => {
  describe('getRequiredCount - デフォルト値フォールバック', () => {
    it('未設定の平日（月曜）は午前6を返す', () => {
      // spec: 未設定の平日の必要人数はデフォルト値を返す
      const { result } = renderHook(() => useShiftConfig())
      expect(result.current.getRequiredCount('2025-01-06', 'morning')).toBe(6) // 月曜
    })

    it('未設定の平日（月曜）は午後6を返す', () => {
      const { result } = renderHook(() => useShiftConfig())
      expect(result.current.getRequiredCount('2025-01-06', 'afternoon')).toBe(6)
    })

    it('未設定の平日（月曜）は夕方1を返す', () => {
      const { result } = renderHook(() => useShiftConfig())
      expect(result.current.getRequiredCount('2025-01-06', 'evening')).toBe(1)
    })

    it('未設定の土曜日は午前2を返す', () => {
      // spec: 未設定の土曜日の必要人数はデフォルト値を返す
      const { result } = renderHook(() => useShiftConfig())
      expect(result.current.getRequiredCount('2025-01-04', 'morning')).toBe(2) // 土曜
    })

    it('未設定の土曜日は午後2を返す', () => {
      const { result } = renderHook(() => useShiftConfig())
      expect(result.current.getRequiredCount('2025-01-04', 'afternoon')).toBe(2)
    })

    it('未設定の土曜日は夕方0を返す', () => {
      const { result } = renderHook(() => useShiftConfig())
      expect(result.current.getRequiredCount('2025-01-04', 'evening')).toBe(0)
    })

    it('未設定の日曜日は午前0を返す', () => {
      // spec: 未設定の日曜日の必要人数はデフォルト値を返す
      const { result } = renderHook(() => useShiftConfig())
      expect(result.current.getRequiredCount('2025-01-05', 'morning')).toBe(0) // 日曜
    })

    it('未設定の日曜日は午後0を返す', () => {
      const { result } = renderHook(() => useShiftConfig())
      expect(result.current.getRequiredCount('2025-01-05', 'afternoon')).toBe(0)
    })

    it('未設定の日曜日は夕方0を返す', () => {
      const { result } = renderHook(() => useShiftConfig())
      expect(result.current.getRequiredCount('2025-01-05', 'evening')).toBe(0)
    })
  })

  describe('getRequiredCount - 祝日デフォルト値', () => {
    it('未設定の祝日（平日）は午前0を返す', () => {
      // spec: 未設定の祝日の必要人数はすべて0を返す
      // 2025-01-01は元日（水曜）
      const { result } = renderHook(() => useShiftConfig())
      expect(result.current.getRequiredCount('2025-01-01', 'morning')).toBe(0)
    })

    it('未設定の祝日（平日）は午後0を返す', () => {
      const { result } = renderHook(() => useShiftConfig())
      expect(result.current.getRequiredCount('2025-01-01', 'afternoon')).toBe(0)
    })

    it('未設定の祝日（平日）は夕方0を返す', () => {
      const { result } = renderHook(() => useShiftConfig())
      expect(result.current.getRequiredCount('2025-01-01', 'evening')).toBe(0)
    })

    it('未設定の祝日（土曜）は午前0を返す（土曜デフォルト2ではなく祝日デフォルト0）', () => {
      // 2019-11-23は勤労感謝の日（土曜）
      const { result } = renderHook(() => useShiftConfig())
      expect(result.current.getRequiredCount('2019-11-23', 'morning')).toBe(0)
    })

    it('祝日に保存値がある場合は保存値が優先される', () => {
      const { result } = renderHook(() => useShiftConfig())

      act(() => {
        result.current.setRequiredCount('2025-01-01', 'morning', 3)
      })

      expect(result.current.getRequiredCount('2025-01-01', 'morning')).toBe(3)
    })
  })

  describe('getRequiredCount - 保存値の優先', () => {
    it('設定済みの日付はデフォルト値より保存値が優先される', () => {
      // spec: 設定済みの日付はデフォルト値より保存値が優先される
      const { result } = renderHook(() => useShiftConfig())

      act(() => {
        result.current.setRequiredCount('2025-01-06', 'morning', 3)
      })

      expect(result.current.getRequiredCount('2025-01-06', 'morning')).toBe(3)
    })

    it('設定値が0の場合も0が返される（デフォルト値に戻らない）', () => {
      const { result } = renderHook(() => useShiftConfig())

      act(() => {
        result.current.setRequiredCount('2025-01-06', 'morning', 0)
      })

      // 平日のデフォルトは6だが、明示的に0を設定した場合は0を返す
      expect(result.current.getRequiredCount('2025-01-06', 'morning')).toBe(0)
    })
  })
})
