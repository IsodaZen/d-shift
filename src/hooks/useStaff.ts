// タスク3.2: useStaff フック
import { useCallback } from 'react'
import { useLocalStorage } from './useLocalStorage'
import type { Staff } from '../types'

const STORAGE_KEY = 'd-shift:staff'

export function useStaff() {
  const [staff, setStaff] = useLocalStorage<Staff[]>(STORAGE_KEY, [])

  const addStaff = useCallback(
    (newStaff: Omit<Staff, 'id'>) => {
      const entry: Staff = {
        ...newStaff,
        id: crypto.randomUUID(),
      }
      setStaff((prev) => [...prev, entry])
    },
    [setStaff],
  )

  const updateStaff = useCallback(
    (id: string, updates: Partial<Omit<Staff, 'id'>>) => {
      setStaff((prev) => prev.map((s) => (s.id === id ? { ...s, ...updates } : s)))
    },
    [setStaff],
  )

  const deleteStaff = useCallback(
    (id: string) => {
      setStaff((prev) => prev.filter((s) => s.id !== id))
    },
    [setStaff],
  )

  return { staff, addStaff, updateStaff, deleteStaff }
}
