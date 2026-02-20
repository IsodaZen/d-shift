// シフト作成期間の管理フック
import { useCallback } from 'react'
import { eachDayOfInterval, parseISO, format } from 'date-fns'
import { useLocalStorage } from './useLocalStorage'
import type { ShiftPeriod } from '../types'

const STORAGE_KEY = 'd-shift:shift-period'

/** LocalStorage未設定時のデフォルト期間: 当月16日〜翌月15日 */
function getDefaultPeriod(): ShiftPeriod {
  const now = new Date()
  const startDate = format(new Date(now.getFullYear(), now.getMonth(), 16), 'yyyy-MM-dd')
  const endDate = format(new Date(now.getFullYear(), now.getMonth() + 1, 15), 'yyyy-MM-dd')
  return { startDate, endDate }
}

export function useShiftPeriod() {
  const [shiftPeriodRaw, setShiftPeriodRaw] = useLocalStorage<ShiftPeriod | null>(STORAGE_KEY, null)

  // LocalStorage未設定時はデフォルト期間（当月16日〜翌月15日）を使用
  const shiftPeriod: ShiftPeriod = shiftPeriodRaw ?? getDefaultPeriod()

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
      return date >= shiftPeriod.startDate && date <= shiftPeriod.endDate
    },
    [shiftPeriod],
  )

  const getPeriodDates = useCallback((): string[] => {
    const start = parseISO(shiftPeriod.startDate)
    const end = parseISO(shiftPeriod.endDate)
    if (end < start) return []
    return eachDayOfInterval({ start, end }).map((d) => format(d, 'yyyy-MM-dd'))
  }, [shiftPeriod])

  return { shiftPeriod, setShiftPeriod, clearShiftPeriod, isWithinPeriod, getPeriodDates }
}
