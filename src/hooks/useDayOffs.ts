// タスク3.4: useDayOffs フック
import { useCallback } from 'react'
import { useLocalStorage } from './useLocalStorage'
import type { PreferredDayOff } from '../types'

const STORAGE_KEY = 'd-shift:day-offs'

export function useDayOffs() {
  const [dayOffs, setDayOffs] = useLocalStorage<PreferredDayOff[]>(STORAGE_KEY, [])

  const addDayOff = useCallback(
    (staffId: string, date: string): boolean => {
      const duplicate = dayOffs.some((d) => d.staffId === staffId && d.date === date)
      if (duplicate) return false
      setDayOffs((prev) => [
        ...prev,
        { id: crypto.randomUUID(), staffId, date },
      ])
      return true
    },
    [dayOffs, setDayOffs],
  )

  const deleteDayOff = useCallback(
    (id: string) => {
      setDayOffs((prev) => prev.filter((d) => d.id !== id))
    },
    [setDayOffs],
  )

  const isDayOff = useCallback(
    (staffId: string, date: string): boolean => {
      return dayOffs.some((d) => d.staffId === staffId && d.date === date)
    },
    [dayOffs],
  )

  return { dayOffs, addDayOff, deleteDayOff, isDayOff }
}
