import { useCallback } from 'react'
import { useLocalStorage } from './useLocalStorage'
import type { HelpStaff } from '../types'

const STORAGE_KEY = 'd-shift:help-staff'

export function useHelpStaff() {
  const [helpStaff, setHelpStaff] = useLocalStorage<HelpStaff[]>(STORAGE_KEY, [])

  const addHelpStaff = useCallback(
    (newHelpStaff: Omit<HelpStaff, 'id'>) => {
      const entry: HelpStaff = {
        ...newHelpStaff,
        id: crypto.randomUUID(),
      }
      setHelpStaff((prev) => [...prev, entry])
    },
    [setHelpStaff],
  )

  const updateHelpStaff = useCallback(
    (id: string, updates: Partial<Omit<HelpStaff, 'id'>>) => {
      setHelpStaff((prev) => prev.map((s) => (s.id === id ? { ...s, ...updates } : s)))
    },
    [setHelpStaff],
  )

  const deleteHelpStaff = useCallback(
    (id: string) => {
      setHelpStaff((prev) => prev.filter((s) => s.id !== id))
    },
    [setHelpStaff],
  )

  const updateAvailableDates = useCallback(
    (id: string, dates: string[]) => {
      setHelpStaff((prev) =>
        prev.map((s) => (s.id === id ? { ...s, availableDates: dates } : s)),
      )
    },
    [setHelpStaff],
  )

  return { helpStaff, addHelpStaff, updateHelpStaff, deleteHelpStaff, updateAvailableDates }
}
