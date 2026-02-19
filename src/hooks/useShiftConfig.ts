// タスク3.3: useShiftConfig フック
import { useCallback } from 'react'
import { useLocalStorage } from './useLocalStorage'
import type { ShiftSlotConfig, TimeSlot } from '../types'

const STORAGE_KEY = 'd-shift:shift-config'

export function useShiftConfig() {
  const [configs, setConfigs] = useLocalStorage<ShiftSlotConfig[]>(STORAGE_KEY, [])

  const getRequiredCount = useCallback(
    (date: string, timeSlot: TimeSlot): number => {
      return configs.find((c) => c.date === date && c.timeSlot === timeSlot)?.requiredCount ?? 0
    },
    [configs],
  )

  const setRequiredCount = useCallback(
    (date: string, timeSlot: TimeSlot, count: number) => {
      setConfigs((prev) => {
        const existing = prev.findIndex((c) => c.date === date && c.timeSlot === timeSlot)
        if (existing >= 0) {
          const next = [...prev]
          next[existing] = { date, timeSlot, requiredCount: count }
          return next
        }
        return [...prev, { date, timeSlot, requiredCount: count }]
      })
    },
    [setConfigs],
  )

  return { configs, getRequiredCount, setRequiredCount }
}
