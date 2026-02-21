// タスク3.5 + 7.4: useAssignments フック（アサイン追加・削除・保存）
import { useCallback } from 'react'
import { useLocalStorage } from './useLocalStorage'
import type { ShiftAssignment, TimeSlot } from '../types'
import { assignParking } from '../utils/shiftUtils'

const STORAGE_KEY = 'd-shift:assignments'

export function useAssignments(getAllSpots: () => string[]) {
  const [assignments, setAssignments] = useLocalStorage<ShiftAssignment[]>(STORAGE_KEY, [])

  const getAssignment = useCallback(
    (staffId: string, date: string, timeSlot: TimeSlot): ShiftAssignment | undefined => {
      return assignments.find(
        (a) => a.staffId === staffId && a.date === date && a.timeSlot === timeSlot,
      )
    },
    [assignments],
  )

  const addAssignment = useCallback(
    (staffId: string, date: string, timeSlot: TimeSlot, usesParking: boolean): ShiftAssignment => {
      const parkingSpot = usesParking
        ? assignParking(date, timeSlot, getAllSpots(), assignments, staffId)
        : null

      const entry: ShiftAssignment = {
        id: crypto.randomUUID(),
        staffId,
        date,
        timeSlot,
        parkingSpot,
      }
      setAssignments((prev) => [...prev, entry])
      return entry
    },
    [assignments, getAllSpots, setAssignments],
  )

  const removeAssignment = useCallback(
    (staffId: string, date: string, timeSlot: TimeSlot) => {
      setAssignments((prev) =>
        prev.filter(
          (a) => !(a.staffId === staffId && a.date === date && a.timeSlot === timeSlot),
        ),
      )
    },
    [setAssignments],
  )

  const getAssignmentsForDate = useCallback(
    (date: string): ShiftAssignment[] => {
      return assignments.filter((a) => a.date === date)
    },
    [assignments],
  )

  /** 期間内の既存アサインをすべて削除し、新しいアサインを一括保存する */
  const bulkSetAssignments = useCallback(
    (newAssignments: ShiftAssignment[], periodDates: string[]) => {
      const dateSet = new Set(periodDates)
      setAssignments((prev) => {
        const outside = prev.filter((a) => !dateSet.has(a.date))
        return [...outside, ...newAssignments]
      })
    },
    [setAssignments],
  )

  return {
    assignments,
    getAssignment,
    addAssignment,
    removeAssignment,
    getAssignmentsForDate,
    bulkSetAssignments,
  }
}
