import { describe, it, expect, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useHelpStaff } from './useHelpStaff'
import type { TimeSlot } from '../types'

// --- spec: help-staff-management ---

describe('useHelpStaff', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  const newHelpStaffData = {
    name: '田中 太郎',
    availableSlots: ['morning', 'afternoon'] as TimeSlot[],
    availableDates: [] as string[],
    usesParking: false,
  }

  describe('初期状態', () => {
    it('初期状態で空配列が返る', () => {
      const { result } = renderHook(() => useHelpStaff())
      expect(result.current.helpStaff).toEqual([])
    })
  })

  describe('addHelpStaff', () => {
    it('ヘルプスタッフを追加するとLocalStorageに保存される', () => {
      const { result } = renderHook(() => useHelpStaff())

      act(() => {
        result.current.addHelpStaff({ ...newHelpStaffData })
      })

      expect(result.current.helpStaff).toHaveLength(1)
      expect(result.current.helpStaff[0].name).toBe('田中 太郎')
      expect(result.current.helpStaff[0].id).toBeTruthy()

      const stored = JSON.parse(localStorage.getItem('d-shift:help-staff') ?? '[]')
      expect(stored).toHaveLength(1)
      expect(stored[0].name).toBe('田中 太郎')
    })

    it('追加されたヘルプスタッフにはIDが付与される', () => {
      const { result } = renderHook(() => useHelpStaff())

      act(() => {
        result.current.addHelpStaff({ ...newHelpStaffData })
      })

      expect(result.current.helpStaff[0].id).toBeTruthy()
    })
  })

  describe('updateHelpStaff', () => {
    it('ヘルプスタッフを編集するとLocalStorageが更新される', () => {
      const { result } = renderHook(() => useHelpStaff())

      act(() => {
        result.current.addHelpStaff({ ...newHelpStaffData })
      })

      const id = result.current.helpStaff[0].id

      act(() => {
        result.current.updateHelpStaff(id, { name: '鈴木 花子', usesParking: true })
      })

      expect(result.current.helpStaff[0].name).toBe('鈴木 花子')
      expect(result.current.helpStaff[0].usesParking).toBe(true)

      const stored = JSON.parse(localStorage.getItem('d-shift:help-staff') ?? '[]')
      expect(stored[0].name).toBe('鈴木 花子')
    })
  })

  describe('deleteHelpStaff', () => {
    it('ヘルプスタッフを削除するとLocalStorageから削除される', () => {
      const { result } = renderHook(() => useHelpStaff())

      act(() => {
        result.current.addHelpStaff({ ...newHelpStaffData, name: 'スタッフA' })
        result.current.addHelpStaff({ ...newHelpStaffData, name: 'スタッフB' })
      })

      const idA = result.current.helpStaff[0].id

      act(() => {
        result.current.deleteHelpStaff(idA)
      })

      expect(result.current.helpStaff).toHaveLength(1)
      expect(result.current.helpStaff[0].name).toBe('スタッフB')

      const stored = JSON.parse(localStorage.getItem('d-shift:help-staff') ?? '[]')
      expect(stored).toHaveLength(1)
    })
  })

  describe('updateAvailableDates', () => {
    it('稼働可能日付を更新できる', () => {
      const { result } = renderHook(() => useHelpStaff())

      act(() => {
        result.current.addHelpStaff({ ...newHelpStaffData })
      })

      const id = result.current.helpStaff[0].id

      act(() => {
        result.current.updateAvailableDates(id, ['2026-03-01', '2026-03-02'])
      })

      expect(result.current.helpStaff[0].availableDates).toEqual(['2026-03-01', '2026-03-02'])

      const stored = JSON.parse(localStorage.getItem('d-shift:help-staff') ?? '[]')
      expect(stored[0].availableDates).toEqual(['2026-03-01', '2026-03-02'])
    })
  })
})
