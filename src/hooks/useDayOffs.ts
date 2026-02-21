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

  const syncDayOffs = useCallback(
    (staffId: string, dates: string[]): { added: number; removed: number } => {
      const existing = dayOffs.filter((d) => d.staffId === staffId)
      const existingDates = existing.map((d) => d.date)

      const toAdd = dates.filter((date) => !existingDates.includes(date))
      const toRemove = existingDates.filter((date) => !dates.includes(date))

      if (toAdd.length === 0 && toRemove.length === 0) {
        return { added: 0, removed: 0 }
      }

      setDayOffs((prev) => {
        const filtered = prev.filter((d) => !(d.staffId === staffId && toRemove.includes(d.date)))
        const added = toAdd.map((date) => ({ id: crypto.randomUUID(), staffId, date }))
        return [...filtered, ...added]
      })

      return { added: toAdd.length, removed: toRemove.length }
    },
    [dayOffs, setDayOffs],
  )

  return { dayOffs, addDayOff, deleteDayOff, isDayOff, syncDayOffs }
}
