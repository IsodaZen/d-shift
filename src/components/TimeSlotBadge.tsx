// タスク8.4: 時間帯バッジ
import type { TimeSlot } from '../types'
import { TIME_SLOT_LABELS } from '../types'

const BADGE_COLORS: Record<TimeSlot, string> = {
  morning: 'bg-blue-100 text-blue-700',
  afternoon: 'bg-orange-100 text-orange-700',
  evening: 'bg-purple-100 text-purple-700',
}

interface TimeSlotBadgeProps {
  slot: TimeSlot
}

export function TimeSlotBadge({ slot }: TimeSlotBadgeProps) {
  return (
    <span
      className={`inline-block text-xs px-1.5 py-0.5 rounded-full font-medium ${BADGE_COLORS[slot]}`}
    >
      {TIME_SLOT_LABELS[slot]}
    </span>
  )
}
