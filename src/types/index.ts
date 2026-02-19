// タスク2.1〜2.6: 型定義

export type TimeSlot = 'morning' | 'afternoon' | 'evening'

export const TIME_SLOT_LABELS: Record<TimeSlot, string> = {
  morning: '午前',
  afternoon: '午後',
  evening: '夕方',
}

export const ALL_TIME_SLOTS: TimeSlot[] = ['morning', 'afternoon', 'evening']

export interface Staff {
  id: string
  name: string
  maxWeeklyShifts: number
  availableSlots: TimeSlot[]
  usesParking: boolean
}

export interface ShiftSlotConfig {
  date: string // YYYY-MM-DD
  timeSlot: TimeSlot
  requiredCount: number
}

export interface PreferredDayOff {
  id: string
  staffId: string
  date: string // YYYY-MM-DD
}

export interface ShiftAssignment {
  id: string
  staffId: string
  date: string // YYYY-MM-DD
  timeSlot: TimeSlot
  parkingSpot: string | null // 例: "A1", "B1", null
}

export interface ParkingSlotType {
  type: 'A' | 'B'
  count: number
}

export interface ParkingConfig {
  slots: ParkingSlotType[]
}

export const DEFAULT_PARKING_CONFIG: ParkingConfig = {
  slots: [
    { type: 'A', count: 4 },
    { type: 'B', count: 1 },
  ],
}
