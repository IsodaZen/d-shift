import { describe, it, expect } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useDayOffs } from './useDayOffs'

// --- spec: preferred-day-off ---

describe('useDayOffs', () => {
  describe('addDayOff', () => {
    it('希望休を登録できる', () => {
      // spec: 希望休を登録できる
      const { result } = renderHook(() => useDayOffs())

      let ok: boolean
      act(() => {
        ok = result.current.addDayOff('staff-1', '2025-01-06')
      })

      expect(ok!).toBe(true)
      expect(result.current.dayOffs).toHaveLength(1)
      expect(result.current.dayOffs[0].staffId).toBe('staff-1')
      expect(result.current.dayOffs[0].date).toBe('2025-01-06')
    })

    it('登録された希望休にIDが付与される', () => {
      const { result } = renderHook(() => useDayOffs())

      act(() => {
        result.current.addDayOff('staff-1', '2025-01-06')
      })

      expect(result.current.dayOffs[0].id).toBeTruthy()
    })

    it('同じスタッフ・同日の希望休は重複登録できない', () => {
      // spec: 同一スタッフ・同一日付の希望休は重複登録できない
      const { result } = renderHook(() => useDayOffs())

      act(() => {
        result.current.addDayOff('staff-1', '2025-01-06')
      })

      let secondOk: boolean
      act(() => {
        secondOk = result.current.addDayOff('staff-1', '2025-01-06')
      })

      expect(secondOk!).toBe(false)
      expect(result.current.dayOffs).toHaveLength(1)
    })

    it('同じスタッフでも別日なら登録できる', () => {
      const { result } = renderHook(() => useDayOffs())

      act(() => {
        result.current.addDayOff('staff-1', '2025-01-06')
        result.current.addDayOff('staff-1', '2025-01-07')
      })

      expect(result.current.dayOffs).toHaveLength(2)
    })

    it('同じ日でも別スタッフなら登録できる', () => {
      const { result } = renderHook(() => useDayOffs())

      act(() => {
        result.current.addDayOff('staff-1', '2025-01-06')
        result.current.addDayOff('staff-2', '2025-01-06')
      })

      expect(result.current.dayOffs).toHaveLength(2)
    })
  })

  describe('deleteDayOff', () => {
    it('希望休を削除できる', () => {
      // spec: 希望休を削除できる
      const { result } = renderHook(() => useDayOffs())

      act(() => {
        result.current.addDayOff('staff-1', '2025-01-06')
      })

      const id = result.current.dayOffs[0].id

      act(() => {
        result.current.deleteDayOff(id)
      })

      expect(result.current.dayOffs).toHaveLength(0)
    })

    it('対象以外の希望休は削除されない', () => {
      const { result } = renderHook(() => useDayOffs())

      act(() => {
        result.current.addDayOff('staff-1', '2025-01-06')
        result.current.addDayOff('staff-1', '2025-01-07')
      })

      const firstId = result.current.dayOffs[0].id

      act(() => {
        result.current.deleteDayOff(firstId)
      })

      expect(result.current.dayOffs).toHaveLength(1)
      expect(result.current.dayOffs[0].date).toBe('2025-01-07')
    })
  })

  describe('isDayOff', () => {
    it('希望休が登録されているスタッフ・日付はtrueを返す', () => {
      const { result } = renderHook(() => useDayOffs())

      act(() => {
        result.current.addDayOff('staff-1', '2025-01-06')
      })

      expect(result.current.isDayOff('staff-1', '2025-01-06')).toBe(true)
    })

    it('希望休が登録されていないスタッフ・日付はfalseを返す', () => {
      const { result } = renderHook(() => useDayOffs())

      expect(result.current.isDayOff('staff-1', '2025-01-06')).toBe(false)
    })

    it('同じスタッフでも別日はfalseを返す', () => {
      const { result } = renderHook(() => useDayOffs())

      act(() => {
        result.current.addDayOff('staff-1', '2025-01-06')
      })

      expect(result.current.isDayOff('staff-1', '2025-01-07')).toBe(false)
    })
  })

  describe('syncDayOffs', () => {
    it('date1を外しdate3を追加した場合、{ added: 1, removed: 1 }が返りLocalStorageが更新される', () => {
      // spec: syncDayOffs が追加件数と削除件数を返す
      const { result } = renderHook(() => useDayOffs())

      act(() => {
        result.current.addDayOff('staff-1', '2025-01-06')
        result.current.addDayOff('staff-1', '2025-01-07')
      })

      let syncResult: { added: number; removed: number }
      act(() => {
        syncResult = result.current.syncDayOffs('staff-1', ['2025-01-07', '2025-01-08'])
      })

      expect(syncResult!).toEqual({ added: 1, removed: 1 })
      expect(result.current.dayOffs.some((d) => d.staffId === 'staff-1' && d.date === '2025-01-06')).toBe(false)
      expect(result.current.dayOffs.some((d) => d.staffId === 'staff-1' && d.date === '2025-01-07')).toBe(true)
      expect(result.current.dayOffs.some((d) => d.staffId === 'staff-1' && d.date === '2025-01-08')).toBe(true)
    })

    it('空配列を渡すとすべて削除され{ added: 0, removed: 2 }が返る', () => {
      // spec: syncDayOffs に空配列を渡すとすべて削除される
      const { result } = renderHook(() => useDayOffs())

      act(() => {
        result.current.addDayOff('staff-1', '2025-01-06')
        result.current.addDayOff('staff-1', '2025-01-07')
      })

      let syncResult: { added: number; removed: number }
      act(() => {
        syncResult = result.current.syncDayOffs('staff-1', [])
      })

      expect(syncResult!).toEqual({ added: 0, removed: 2 })
      expect(result.current.dayOffs.filter((d) => d.staffId === 'staff-1')).toHaveLength(0)
    })

    it('変化なしで呼ぶと{ added: 0, removed: 0 }が返りLocalStorageは変更されない', () => {
      // spec: 変化なしで syncDayOffs を呼ぶと added: 0、removed: 0 が返る
      const { result } = renderHook(() => useDayOffs())

      act(() => {
        result.current.addDayOff('staff-1', '2025-01-06')
      })

      const before = result.current.dayOffs[0].id

      let syncResult: { added: number; removed: number }
      act(() => {
        syncResult = result.current.syncDayOffs('staff-1', ['2025-01-06'])
      })

      expect(syncResult!).toEqual({ added: 0, removed: 0 })
      // IDが変わっていないことでLocalStorageが変更されていないことを確認
      expect(result.current.dayOffs[0].id).toBe(before)
    })

    it('他スタッフのデータに影響しない', () => {
      // spec: 他スタッフのデータに影響しない
      const { result } = renderHook(() => useDayOffs())

      act(() => {
        result.current.addDayOff('staff-1', '2025-01-06')
        result.current.addDayOff('staff-2', '2025-01-07')
      })

      act(() => {
        result.current.syncDayOffs('staff-1', [])
      })

      expect(result.current.dayOffs.some((d) => d.staffId === 'staff-1')).toBe(false)
      expect(result.current.dayOffs.some((d) => d.staffId === 'staff-2' && d.date === '2025-01-07')).toBe(true)
    })
  })
})
