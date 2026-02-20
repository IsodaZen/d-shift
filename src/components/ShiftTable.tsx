// タスク8.2, 8.3, 8.5〜8.7, 8.8: シフト表テーブルコンポーネント
import { useState, useCallback } from 'react'
import type { Staff, TimeSlot } from '../types'
import { TimeSlotBadge } from './TimeSlotBadge'
import { AssignModal } from './AssignModal'
import { Toast } from './Toast'
import { formatDateLabel } from '../utils/dateUtils'
import { getWeeklyAssignmentCount, isAvailableSlot } from '../utils/shiftUtils'
import type { HelpAlertInfo } from '../hooks/useHelpAlert'
import { ALL_TIME_SLOTS, TIME_SLOT_LABELS } from '../types'
import type { ShiftAssignment, PreferredDayOff } from '../types'

interface ShiftTableProps {
  dates: string[]
  staff: Staff[]
  assignments: ShiftAssignment[]
  dayOffs: PreferredDayOff[]
  helpAlerts: HelpAlertInfo[]
  onAddAssignment: (staffId: string, date: string, timeSlot: TimeSlot, usesParking: boolean) => void
  onRemoveAssignment: (staffId: string, date: string, timeSlot: TimeSlot) => void
  getRequiredCount?: (date: string, slot: TimeSlot) => number
}

interface ModalState {
  staffId: string
  date: string
}

export function ShiftTable({
  dates,
  staff,
  assignments,
  dayOffs,
  helpAlerts,
  onAddAssignment,
  onRemoveAssignment,
  getRequiredCount,
}: ShiftTableProps) {
  const [modal, setModal] = useState<ModalState | null>(null)
  const [toast, setToast] = useState<string | null>(null)

  const getAssignedSlots = useCallback(
    (staffId: string, date: string): TimeSlot[] => {
      return assignments
        .filter((a) => a.staffId === staffId && a.date === date)
        .map((a) => a.timeSlot)
    },
    [assignments],
  )

  const getParkingSpot = useCallback(
    (staffId: string, date: string, timeSlot: TimeSlot): string | null => {
      return (
        assignments.find(
          (a) => a.staffId === staffId && a.date === date && a.timeSlot === timeSlot,
        )?.parkingSpot ?? null
      )
    },
    [assignments],
  )

  const handleToggleSlot = useCallback(
    (slot: TimeSlot) => {
      if (!modal) return
      const { staffId, date } = modal
      const s = staff.find((x) => x.id === staffId)
      if (!s) return

      const alreadyAssigned = getAssignedSlots(staffId, date).includes(slot)
      if (alreadyAssigned) {
        onRemoveAssignment(staffId, date, slot)
        return
      }

      // タスク9.2: 週上限チェック
      const weekCount = getWeeklyAssignmentCount(staffId, date, assignments)
      if (weekCount >= s.maxWeeklyShifts) {
        setToast(`週上限（${s.maxWeeklyShifts}回）を超えます`)
      }

      // タスク9.3: 出勤不可時間帯チェック
      if (!isAvailableSlot(s, slot)) {
        setToast(`「${TIME_SLOT_LABELS[slot]}」は出勤不可の時間帯です`)
      }

      onAddAssignment(staffId, date, slot, s.usesParking)
    },
    [modal, staff, assignments, getAssignedSlots, onAddAssignment, onRemoveAssignment],
  )

  const getHelpAlert = (date: string, timeSlot: TimeSlot) =>
    helpAlerts.find((h) => h.date === date && h.timeSlot === timeSlot)

  /** アサイン数が必要人数を下回る時間帯が一つでもある場合に不足数合計を返す */
  const getAssignmentShortage = (date: string): number => {
    if (!getRequiredCount) return 0
    return ALL_TIME_SLOTS.reduce((total, slot) => {
      const required = getRequiredCount(date, slot)
      if (required <= 0) return total
      const assigned = assignments.filter((a) => a.date === date && a.timeSlot === slot).length
      return total + Math.max(0, required - assigned)
    }, 0)
  }

  const modalStaff = modal ? staff.find((s) => s.id === modal.staffId) : null

  return (
    <>
      {/* タスク8.8: 横スクロール対応 */}
      <div className="overflow-x-auto">
        <table className="border-collapse text-xs min-w-max">
          <thead>
            <tr>
              {/* タスク8.2: スタッフ列固定 */}
              <th className="sticky left-0 z-10 bg-gray-50 border border-gray-200 px-2 py-1 text-left text-gray-600 font-medium min-w-[72px]">
                氏名
              </th>
              {dates.map((date) => {
                const shortage = getAssignmentShortage(date)
                return (
                  <th
                    key={date}
                    className="border border-gray-200 px-1 py-1 text-center text-gray-600 font-medium min-w-[60px]"
                  >
                    {formatDateLabel(date)}
                    {/* Phase 7: アサイン不足インジケーター */}
                    {shortage > 0 && (
                      <div className="mt-0.5 bg-orange-100 text-orange-600 text-[10px] rounded px-1 py-0.5 font-normal">
                        不足{shortage}
                      </div>
                    )}
                    {/* タスク10.2: ヘルプ要バッジ（出勤可能人数ベース） */}
                    {ALL_TIME_SLOTS.map((slot) => {
                      const alert = getHelpAlert(date, slot)
                      if (!alert) return null
                      return (
                        <div
                          key={slot}
                          className="mt-0.5 bg-red-100 text-red-600 text-[10px] rounded px-1 py-0.5 font-normal"
                        >
                          {TIME_SLOT_LABELS[slot]}+{alert.shortage}
                        </div>
                      )
                    })}
                  </th>
                )
              })}
            </tr>
          </thead>
          <tbody>
            {staff.map((s) => (
              <tr key={s.id}>
                <td className="sticky left-0 z-10 bg-white border border-gray-200 px-2 py-1 font-medium text-gray-800 whitespace-nowrap">
                  {s.name}
                </td>
                {dates.map((date) => {
                  const isDayOff = dayOffs.some(
                    (d) => d.staffId === s.id && d.date === date,
                  )
                  const assignedSlots = getAssignedSlots(s.id, date)
                  const hasAssignment = assignedSlots.length > 0
                  // タスク8.5: 希望休ハイライト（黄）/ タスク8.6: 希望休日アサイン（赤）
                  const cellBg = isDayOff && hasAssignment
                    ? 'bg-red-50'
                    : isDayOff
                      ? 'bg-yellow-50'
                      : 'bg-white'

                  return (
                    <td
                      key={date}
                      className={`border border-gray-200 px-1 py-1 align-top cursor-pointer hover:bg-gray-50 ${cellBg}`}
                      onClick={() => setModal({ staffId: s.id, date })}
                    >
                      {isDayOff && (
                        <span className="block text-[10px] text-yellow-600 font-medium mb-0.5">
                          希望休
                        </span>
                      )}
                      {assignedSlots.map((slot) => {
                        const spot = getParkingSpot(s.id, date, slot)
                        return (
                          <div key={slot} className="mb-0.5">
                            <TimeSlotBadge slot={slot} />
                            {/* タスク8.7: 駐車場番号 */}
                            {spot && (
                              <span className="ml-1 text-[10px] text-gray-500">{spot}</span>
                            )}
                          </div>
                        )
                      })}
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* アサインモーダル */}
      {modal && modalStaff && (
        <AssignModal
          staffName={modalStaff.name}
          dateLabel={formatDateLabel(modal.date)}
          assignedSlots={getAssignedSlots(modal.staffId, modal.date)}
          unavailableSlots={ALL_TIME_SLOTS.filter((s) => !modalStaff.availableSlots.includes(s))}
          onToggle={handleToggleSlot}
          onClose={() => setModal(null)}
        />
      )}

      {/* 警告トースト */}
      {toast && <Toast message={toast} onClose={() => setToast(null)} />}
    </>
  )
}
