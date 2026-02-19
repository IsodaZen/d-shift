import { describe, it, expect } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useAssignments } from './useAssignments'

// --- spec: shift-assignment ---

const allSpots = ['A1', 'A2', 'A3', 'A4', 'B1']
const getAllSpots = () => allSpots

describe('useAssignments', () => {
  describe('addAssignment', () => {
    it('スタッフをシフトにアサインできる', () => {
      // spec: スタッフをシフトにアサインできる
      const { result } = renderHook(() => useAssignments(getAllSpots))

      act(() => {
        result.current.addAssignment('staff-1', '2025-01-06', 'morning', false)
      })

      expect(result.current.assignments).toHaveLength(1)
      expect(result.current.assignments[0].staffId).toBe('staff-1')
      expect(result.current.assignments[0].date).toBe('2025-01-06')
      expect(result.current.assignments[0].timeSlot).toBe('morning')
    })

    it('駐車場利用ありのアサインには駐車場番号が自動付与される', () => {
      // spec: 駐車場枠が空いている場合に自動割り当てされる
      const { result } = renderHook(() => useAssignments(getAllSpots))

      act(() => {
        result.current.addAssignment('staff-1', '2025-01-06', 'morning', true)
      })

      expect(result.current.assignments[0].parkingSpot).toBe('A1')
    })

    it('駐車場利用なしのアサインはparkingSpotがnull', () => {
      // spec: 駐車場を利用しないスタッフには番号が表示されない（前提）
      const { result } = renderHook(() => useAssignments(getAllSpots))

      act(() => {
        result.current.addAssignment('staff-1', '2025-01-06', 'morning', false)
      })

      expect(result.current.assignments[0].parkingSpot).toBeNull()
    })

    it('2人目の駐車場利用者はA2を取得する', () => {
      // Reactのstate更新はバッチ処理されるため、actを分けて逐次更新する
      const { result } = renderHook(() => useAssignments(getAllSpots))

      act(() => {
        result.current.addAssignment('staff-1', '2025-01-06', 'morning', true)
      })
      act(() => {
        result.current.addAssignment('staff-2', '2025-01-06', 'afternoon', true)
      })

      const spots = result.current.assignments.map((a) => a.parkingSpot)
      expect(spots).toContain('A1')
      expect(spots).toContain('A2')
    })

    it('同一スタッフが同一日に午前→午後の順でアサインした場合、午後も同じ駐車場枠が割り当てられる', () => {
      // spec: 同一スタッフが同一日に複数時間帯でアサインされる場合は既存枠を再利用する
      const { result } = renderHook(() => useAssignments(getAllSpots))

      act(() => {
        result.current.addAssignment('staff-1', '2025-01-06', 'morning', true)
      })
      act(() => {
        result.current.addAssignment('staff-1', '2025-01-06', 'afternoon', true)
      })

      const spots = result.current.assignments.map((a) => a.parkingSpot)
      expect(spots[0]).toBe('A1')
      expect(spots[1]).toBe('A1') // 同じ枠を共有
      expect(spots.filter((s) => s === 'A1')).toHaveLength(2)
    })
  })

  describe('removeAssignment', () => {
    it('アサインを解除できる', () => {
      // spec: アサインを解除できる
      const { result } = renderHook(() => useAssignments(getAllSpots))

      act(() => {
        result.current.addAssignment('staff-1', '2025-01-06', 'morning', false)
      })

      act(() => {
        result.current.removeAssignment('staff-1', '2025-01-06', 'morning')
      })

      expect(result.current.assignments).toHaveLength(0)
    })

    it('対象以外のアサインは残る', () => {
      const { result } = renderHook(() => useAssignments(getAllSpots))

      act(() => {
        result.current.addAssignment('staff-1', '2025-01-06', 'morning', false)
        result.current.addAssignment('staff-1', '2025-01-06', 'afternoon', false)
      })

      act(() => {
        result.current.removeAssignment('staff-1', '2025-01-06', 'morning')
      })

      expect(result.current.assignments).toHaveLength(1)
      expect(result.current.assignments[0].timeSlot).toBe('afternoon')
    })
  })

  describe('getAssignment', () => {
    it('指定したスタッフ・日付・時間帯のアサインを取得できる', () => {
      const { result } = renderHook(() => useAssignments(getAllSpots))

      act(() => {
        result.current.addAssignment('staff-1', '2025-01-06', 'morning', false)
      })

      const assignment = result.current.getAssignment('staff-1', '2025-01-06', 'morning')
      expect(assignment).toBeDefined()
      expect(assignment?.staffId).toBe('staff-1')
    })

    it('存在しないアサインはundefinedを返す', () => {
      const { result } = renderHook(() => useAssignments(getAllSpots))

      const assignment = result.current.getAssignment('staff-1', '2025-01-06', 'morning')
      expect(assignment).toBeUndefined()
    })
  })

  describe('getAssignmentsForDate', () => {
    it('指定した日付のアサイン一覧を返す', () => {
      const { result } = renderHook(() => useAssignments(getAllSpots))

      act(() => {
        result.current.addAssignment('staff-1', '2025-01-06', 'morning', false)
        result.current.addAssignment('staff-2', '2025-01-06', 'afternoon', false)
        result.current.addAssignment('staff-1', '2025-01-07', 'morning', false)
      })

      const forDate = result.current.getAssignmentsForDate('2025-01-06')
      expect(forDate).toHaveLength(2)
    })
  })
})
