// タスク3.6: useParkingConfig フック
import { useCallback } from 'react'
import { useLocalStorage } from './useLocalStorage'
import type { ParkingConfig } from '../types'
import { DEFAULT_PARKING_CONFIG } from '../types'

const STORAGE_KEY = 'd-shift:parking'

export function useParkingConfig() {
  const [parkingConfig, setParkingConfig] = useLocalStorage<ParkingConfig>(
    STORAGE_KEY,
    DEFAULT_PARKING_CONFIG,
  )

  const updateSlotCount = useCallback(
    (type: 'A' | 'B', count: number) => {
      setParkingConfig((prev) => ({
        slots: prev.slots.map((s) => (s.type === type ? { ...s, count } : s)),
      }))
    },
    [setParkingConfig],
  )

  const getAllSpots = useCallback((): string[] => {
    const spots: string[] = []
    for (const slot of parkingConfig.slots) {
      for (let i = 1; i <= slot.count; i++) {
        spots.push(`${slot.type}${i}`)
      }
    }
    return spots
  }, [parkingConfig])

  return { parkingConfig, updateSlotCount, getAllSpots }
}
