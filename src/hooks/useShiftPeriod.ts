// シフト作成期間の管理フック
import { useCallback } from 'react'
import { eachDayOfInterval, parseISO, format } from 'date-fns'
import { useLocalStorage } from './useLocalStorage'
import type { ShiftPeriod } from '../types'

const STORAGE_KEY = 'd-shift:shift-period'

export function useShiftPeriod() {
  const [shiftPeriod, setShiftPeriodRaw] = useLocalStorage<ShiftPeriod | null>(STORAGE_KEY, null)

  const setShiftPeriod = useCallback(
    (period: ShiftPeriod) => {
      setShiftPeriodRaw(period)
    },
    [setShiftPeriodRaw],
  )

  const clearShiftPeriod = useCallback(() => {
    setShiftPeriodRaw(null)
  }, [setShiftPeriodRaw])

  const isWithinPeriod = useCallback(
    (date: string): boolean => {
      if (!shiftPeriod) return false
      return date >= shiftPeriod.startDate && date <= shiftPeriod.endDate
    },
    [shiftPeriod],
  )

  const getPeriodDates = useCallback((): string[] => {
    if (!shiftPeriod) return []
    const start = parseISO(shiftPeriod.startDate)
    const end = parseISO(shiftPeriod.endDate)
    if (end < start) return []
    return eachDayOfInterval({ start, end }).map((d) => format(d, 'yyyy-MM-dd'))
  }, [shiftPeriod])

  return { shiftPeriod, setShiftPeriod, clearShiftPeriod, isWithinPeriod, getPeriodDates }
}
