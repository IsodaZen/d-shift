// タスク9.1: セルタップで時間帯選択モーダル
import type { TimeSlot } from '../types'
import { TIME_SLOT_LABELS, ALL_TIME_SLOTS } from '../types'

interface AssignModalProps {
  staffName: string
  dateLabel: string
  assignedSlots: TimeSlot[]
  unavailableSlots: TimeSlot[]
  onToggle: (slot: TimeSlot) => void
  onClose: () => void
}

export function AssignModal({
  staffName,
  dateLabel,
  assignedSlots,
  unavailableSlots,
  onToggle,
  onClose,
}: AssignModalProps) {
  return (
    <div
      className="fixed inset-0 bg-black/40 z-40 flex items-end"
      onClick={onClose}
    >
      <div
        className="bg-white w-full rounded-t-2xl p-5 pb-8"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="text-center mb-4">
          <p className="font-semibold text-gray-800">{staffName}</p>
          <p className="text-sm text-gray-500">{dateLabel}</p>
        </div>
        <div className="flex gap-3 justify-center">
          {ALL_TIME_SLOTS.map((slot) => {
            const isAssigned = assignedSlots.includes(slot)
            const isUnavailable = unavailableSlots.includes(slot)
            return (
              <button
                key={slot}
                onClick={() => onToggle(slot)}
                className={[
                  'flex-1 py-3 rounded-xl text-sm font-medium border-2 transition-colors',
                  isAssigned
                    ? 'bg-indigo-500 border-indigo-500 text-white'
                    : isUnavailable
                      ? 'bg-gray-50 border-gray-200 text-gray-400'
                      : 'bg-white border-gray-200 text-gray-700 hover:border-indigo-300',
                ].join(' ')}
              >
                {TIME_SLOT_LABELS[slot]}
                {isUnavailable && !isAssigned && (
                  <span className="block text-xs text-gray-400">不可</span>
                )}
              </button>
            )
          })}
        </div>
        <button
          onClick={onClose}
          className="mt-4 w-full py-2 text-sm text-gray-500 hover:text-gray-700"
        >
          閉じる
        </button>
      </div>
    </div>
  )
}
