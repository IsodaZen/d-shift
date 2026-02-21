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
      const datesSet = new Set(dates)
      // 差分を現在の dayOffs スナップショットから同期計算（返り値用）
      const existing = dayOffs.filter((d) => d.staffId === staffId)
      const existingDatesSet = new Set(existing.map((d) => d.date))
      const toAdd = dates.filter((date) => !existingDatesSet.has(date))
      const toRemoveSet = new Set(
        existing.filter((d) => !datesSet.has(d.date)).map((d) => d.date),
      )

      // 変化がない場合は書き込みをスキップして早期リターン
      if (toAdd.length === 0 && toRemoveSet.size === 0) {
        return { added: 0, removed: 0 }
      }

      // setDayOffs は prev（最新 state）を参照して変更を適用し、原子性を保証する
      setDayOffs((prev) => {
        const filtered = prev.filter((d) => !(d.staffId === staffId && toRemoveSet.has(d.date)))
        const newEntries = toAdd.map((date) => ({ id: crypto.randomUUID(), staffId, date }))
        return [...filtered, ...newEntries]
      })

      return { added: toAdd.length, removed: toRemoveSet.size }
    },
    [dayOffs, setDayOffs],
  )

  return { dayOffs, addDayOff, deleteDayOff, isDayOff, syncDayOffs }
}
