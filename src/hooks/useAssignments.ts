// タスク3.5 + 7.4: useAssignments フック（アサイン追加・削除・保存）
import { useCallback, useMemo } from 'react'
import { useLocalStorage } from './useLocalStorage'
import type { ShiftAssignment, TimeSlot } from '../types'
import { assignParking } from '../utils/shiftUtils'

const STORAGE_KEY = 'd-shift:assignments'

export function useAssignments(getAllSpots: () => string[]) {
  const [rawAssignments, setAssignments] = useLocalStorage<ShiftAssignment[]>(STORAGE_KEY, [])

  // 旧データ（isLocked なし）を読み込んだとき isLocked: false にフォールバックする後方互換処理
  const assignments = useMemo(
    () =>
      rawAssignments.map((a) => ({
        ...a,
        isLocked: a.isLocked ?? false,
      })),
    [rawAssignments],
  )

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
        isLocked: true,
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

  /** 期間内の非固定アサインを削除し、固定アサインを保持しつつ新しいアサインを一括保存する */
  const bulkSetAssignments = useCallback(
    (newAssignments: ShiftAssignment[], periodDates: string[]) => {
      const dateSet = new Set(periodDates)
      setAssignments((prev) => {
        // 期間外のアサインはすべて保持する
        const outside = prev.filter((a) => !dateSet.has(a.date))
        // 期間内の固定アサイン（isLocked: true）は保持する
        const lockedInside = prev.filter((a) => dateSet.has(a.date) && (a.isLocked ?? false))
        return [...outside, ...lockedInside, ...newAssignments]
      })
    },
    [setAssignments],
  )

  /** セル（staffId + date）単位で全アサインの isLocked を一括更新する */
  const setCellLocked = useCallback(
    (staffId: string, date: string, isLocked: boolean) => {
      setAssignments((prev) =>
        prev.map((a) =>
          a.staffId === staffId && a.date === date ? { ...a, isLocked } : a,
        ),
      )
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
    setCellLocked,
  }
}
