// タスク3.3: useShiftConfig フック
import { useCallback } from 'react'
import { parseISO, getDay } from 'date-fns'
import { useLocalStorage } from './useLocalStorage'
import type { DayCategory, ShiftSlotConfig, TimeSlot } from '../types'
import { DEFAULT_SHIFT_SLOT_COUNTS } from '../types'
import { isJapaneseHoliday } from '../utils/dateUtils'

const STORAGE_KEY = 'd-shift:shift-config'

function getDayCategory(date: string): DayCategory {
  if (isJapaneseHoliday(date)) return 'holiday'
  const day = getDay(parseISO(date)) // 0=日曜, 6=土曜
  if (day === 0) return 'sunday'
  if (day === 6) return 'saturday'
  return 'weekday'
}

export function useShiftConfig() {
  const [configs, setConfigs] = useLocalStorage<ShiftSlotConfig[]>(STORAGE_KEY, [])

  const getRequiredCount = useCallback(
    (date: string, timeSlot: TimeSlot): number => {
      const saved = configs.find((c) => c.date === date && c.timeSlot === timeSlot)
      if (saved !== undefined) return saved.requiredCount
      return DEFAULT_SHIFT_SLOT_COUNTS[getDayCategory(date)][timeSlot]
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
