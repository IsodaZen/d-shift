// タスク8.2, 8.3, 8.5〜8.7, 8.8: シフト表テーブルコンポーネント
import { useState, useCallback } from 'react'
import type { Staff, HelpStaff, TimeSlot } from '../types'
import { AssignModal } from './AssignModal'
import { Toast } from './Toast'
import { formatDateLabel, getDayType } from '../utils/dateUtils'
import { getWeeklyAssignmentCount } from '../utils/shiftUtils'
import type { HelpAlertInfo } from '../hooks/useHelpAlert'
import { ALL_TIME_SLOTS, TIME_SLOT_LABELS } from '../types'
import type { ShiftAssignment, PreferredDayOff } from '../types'

interface ShiftTableProps {
  dates: string[]
  staff: Staff[]
  assignments: ShiftAssignment[]
  dayOffs: PreferredDayOff[]
  helpAlerts: HelpAlertInfo[]
  helpStaff?: HelpStaff[]
  onAddAssignment: (staffId: string, date: string, timeSlot: TimeSlot, usesParking: boolean) => void
  onRemoveAssignment: (staffId: string, date: string, timeSlot: TimeSlot) => void
  onSetCellLocked?: (staffId: string, date: string, isLocked: boolean) => void
  getRequiredCount?: (date: string, slot: TimeSlot) => number
}

// ヘルプスタッフ専用モーダル状態
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
  helpStaff = [],
  onAddAssignment,
  onRemoveAssignment,
  onSetCellLocked,
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

  /** セルに固定アサインが1件以上あるかどうか */
  const hasCellLocked = useCallback(
    (staffId: string, date: string): boolean => {
      return assignments.some((a) => a.staffId === staffId && a.date === date && a.isLocked)
    },
    [assignments],
  )

  /** セルの全アサインが固定かどうか（トグルの方向決定に使用） */
  const isAllCellLocked = useCallback(
    (staffId: string, date: string): boolean => {
      const cellAssignments = assignments.filter((a) => a.staffId === staffId && a.date === date)
      return cellAssignments.length > 0 && cellAssignments.every((a) => a.isLocked)
    },
    [assignments],
  )

  const handleToggleCellLocked = useCallback(
    (e: React.MouseEvent, staffId: string, date: string) => {
      e.stopPropagation()
      if (!onSetCellLocked) return
      const allLocked = isAllCellLocked(staffId, date)
      onSetCellLocked(staffId, date, !allLocked)
    },
    [onSetCellLocked, isAllCellLocked],
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

  /** 通常スタッフセルクリック: 全時間帯一括トグル */
  const handleBulkToggle = useCallback(
    (staffId: string, date: string) => {
      const s = staff.find((x) => x.id === staffId)
      if (!s) return

      const assignedSlots = getAssignedSlots(staffId, date)

      // アサインがある場合: 全削除
      if (assignedSlots.length > 0) {
        assignedSlots.forEach((slot) => {
          onRemoveAssignment(staffId, date, slot)
        })
        return
      }

      // アサインがない場合: 週上限チェック（新しい日へのアサインなのでチェック）
      const weekCount = getWeeklyAssignmentCount(staffId, date, assignments)
      if (weekCount >= s.maxWeeklyShifts) {
        setToast(`週上限（${s.maxWeeklyShifts}日）に達しているため、アサインできません`)
        return
      }

      // アサインする時間帯を決定: availableSlots が空なら ALL_TIME_SLOTS をフォールバック
      const slotsToAssign = s.availableSlots.length > 0 ? s.availableSlots : ALL_TIME_SLOTS

      // 一括アサイン
      slotsToAssign.forEach((slot) => {
        onAddAssignment(staffId, date, slot, s.usesParking)
      })

      // 出勤不可時間帯チェック: availableSlots が全時間帯を網羅していない場合に通知
      // アサイン対象は availableSlots のみのため、出勤不可の時間帯はアサインされていない
      if (s.availableSlots.length > 0 && s.availableSlots.length < ALL_TIME_SLOTS.length) {
        setToast('出勤不可の時間帯があります（出勤可能な時間帯のみアサインしました）')
      }
    },
    [staff, assignments, getAssignedSlots, onAddAssignment, onRemoveAssignment],
  )

  const handleToggleHelpSlot = useCallback(
    (slot: TimeSlot) => {
      if (!modal) return
      const { staffId, date } = modal
      const hs = helpStaff.find((x) => x.id === staffId)
      if (!hs) return

      const alreadyAssigned = getAssignedSlots(staffId, date).includes(slot)
      if (alreadyAssigned) {
        onRemoveAssignment(staffId, date, slot)
        return
      }

      // ヘルプスタッフには週上限チェックなし
      // 出勤不可時間帯は警告のみ（アサインは許可）
      if (!hs.availableSlots.includes(slot)) {
        setToast(`「${TIME_SLOT_LABELS[slot]}」は出勤不可の時間帯です`)
      }

      onAddAssignment(staffId, date, slot, hs.usesParking)
    },
    // getAssignedSlots が assignments を依存に持つため assignments は不要
    [modal, helpStaff, getAssignedSlots, onAddAssignment, onRemoveAssignment],
  )

  const getHelpAlert = (date: string, timeSlot: TimeSlot) =>
    helpAlerts.find((h) => h.date === date && h.timeSlot === timeSlot)

  /** アサイン数が必要人数を下回る時間帯が一つでもある場合に不足数の最大値を返す */
  const getAssignmentShortage = (date: string): number => {
    if (!getRequiredCount) return 0
    return ALL_TIME_SLOTS.reduce((max, slot) => {
      const required = getRequiredCount(date, slot)
      if (required <= 0) return max
      const assigned = assignments.filter((a) => a.date === date && a.timeSlot === slot).length
      return Math.max(max, required - assigned)
    }, 0)
  }

  const modalHelpStaff = modal ? helpStaff.find((hs) => hs.id === modal.staffId) : null

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
                const dayType = getDayType(date)
                const thClass =
                  dayType === 'saturday'
                    ? 'border border-gray-200 px-1 py-1 text-center font-medium min-w-[60px] bg-blue-50 text-blue-700'
                    : dayType === 'sunday' || dayType === 'holiday'
                      ? 'border border-gray-200 px-1 py-1 text-center font-medium min-w-[60px] bg-red-50 text-red-700'
                      : 'border border-gray-200 px-1 py-1 text-center text-gray-600 font-medium min-w-[60px]'
                return (
                  <th
                    key={date}
                    className={thClass}
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
                <td className="sticky left-0 z-10 bg-white border border-gray-200 px-2 py-1 text-gray-800 whitespace-nowrap">
                  <div className="font-medium">{s.name}</div>
                  <div className="text-[10px] font-normal text-gray-500">
                    {(s.availableSlots.length > 0 ? s.availableSlots : ALL_TIME_SLOTS)
                      .slice()
                      .sort((a, b) => ALL_TIME_SLOTS.indexOf(a) - ALL_TIME_SLOTS.indexOf(b))
                      .map((slot) => TIME_SLOT_LABELS[slot])
                      .join(' / ')}
                  </div>
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

                  const cellIsLocked = hasCellLocked(s.id, date)
                  const cellAllLocked = isAllCellLocked(s.id, date)
                  return (
                    <td
                      key={date}
                      className={`border border-gray-200 px-1 py-1 align-top cursor-pointer hover:bg-gray-50 ${cellBg}`}
                      onClick={() => handleBulkToggle(s.id, date)}
                    >
                      {isDayOff && (
                        <span className="block text-[10px] text-yellow-600 font-medium mb-0.5">
                          希望休
                        </span>
                      )}
                      {hasAssignment && (
                        <span className="text-sm font-medium text-gray-700">◯</span>
                      )}
                      {/* タスク8.7: 駐車場番号（最初のアサインの駐車場番号を表示） */}
                      {assignedSlots[0] && getParkingSpot(s.id, date, assignedSlots[0]) && (
                        <span className="ml-1 text-[10px] text-gray-500">
                          {getParkingSpot(s.id, date, assignedSlots[0])}
                        </span>
                      )}
                      {/* 固定インジケーター兼トグルボタン（統合）*/}
                      {hasAssignment && onSetCellLocked && (
                        <div className="flex justify-end mt-0.5">
                          <button
                            aria-label={cellAllLocked ? '固定解除' : '固定'}
                            onClick={(e) => handleToggleCellLocked(e, s.id, date)}
                            className={`flex items-center justify-center rounded transition-colors ${
                              cellIsLocked
                                ? 'text-indigo-500'
                                : 'text-gray-300 hover:text-indigo-400'
                            }`}
                          >
                            {cellIsLocked ? (
                              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="w-3 h-3">
                                <path fillRule="evenodd" d="M8 1a3.5 3.5 0 0 0-3.5 3.5V7A1.5 1.5 0 0 0 3 8.5v5A1.5 1.5 0 0 0 4.5 15h7a1.5 1.5 0 0 0 1.5-1.5v-5A1.5 1.5 0 0 0 11 7V4.5A3.5 3.5 0 0 0 8 1Zm2 6V4.5a2 2 0 1 0-4 0V7h4Z" clipRule="evenodd" />
                              </svg>
                            ) : (
                              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="w-3 h-3">
                                <path d="M11.5 1A3.5 3.5 0 0 0 8 4.5V7H2.5A1.5 1.5 0 0 0 1 8.5v5A1.5 1.5 0 0 0 2.5 15h7a1.5 1.5 0 0 0 1.5-1.5v-5A1.5 1.5 0 0 0 9.5 7H9V4.5a2 2 0 1 1 4 0v1.75a.75.75 0 0 0 1.5 0V4.5A3.5 3.5 0 0 0 11.5 1Z" />
                              </svg>
                            )}
                          </button>
                        </div>
                      )}
                    </td>
                  )
                })}
              </tr>
            ))}

            {/* ヘルプスタッフセクション */}
            {helpStaff.length > 0 && (
              <>
                <tr>
                  <td
                    colSpan={dates.length + 1}
                    className="sticky left-0 z-10 bg-gray-100 border border-gray-200 px-2 py-0.5 text-[10px] text-gray-500 font-medium"
                  >
                    ヘルプスタッフ
                  </td>
                </tr>
                {helpStaff.map((hs) => (
                  <tr key={hs.id}>
                    <td className="sticky left-0 z-10 bg-white border border-gray-200 px-2 py-1 text-gray-800 whitespace-nowrap">
                      <div className="font-medium">{hs.name}</div>
                      <div className="text-[10px] font-normal text-gray-500">
                        {(hs.availableSlots.length > 0 ? hs.availableSlots : ALL_TIME_SLOTS)
                          .slice()
                          .sort((a, b) => ALL_TIME_SLOTS.indexOf(a) - ALL_TIME_SLOTS.indexOf(b))
                          .map((slot) => TIME_SLOT_LABELS[slot])
                          .join(' / ')}
                      </div>
                    </td>
                    {dates.map((date) => {
                      const assignedSlots = getAssignedSlots(hs.id, date)
                      return (
                        <td
                          key={date}
                          className="border border-gray-200 px-1 py-1 align-top cursor-pointer hover:bg-gray-50 bg-white"
                          onClick={() => setModal({ staffId: hs.id, date })}
                        >
                          {assignedSlots.length > 0 && (
                            <span className="text-sm font-medium text-gray-700">◯</span>
                          )}
                          {assignedSlots[0] && getParkingSpot(hs.id, date, assignedSlots[0]) && (
                            <span className="ml-1 text-[10px] text-gray-500">
                              {getParkingSpot(hs.id, date, assignedSlots[0])}
                            </span>
                          )}
                        </td>
                      )
                    })}
                  </tr>
                ))}
              </>
            )}
          </tbody>
        </table>
      </div>

      {/* アサインモーダル（ヘルプスタッフ専用） */}
      {modal && modalHelpStaff && (
        <AssignModal
          staffName={modalHelpStaff.name}
          dateLabel={formatDateLabel(modal.date)}
          assignedSlots={getAssignedSlots(modal.staffId, modal.date)}
          unavailableSlots={ALL_TIME_SLOTS.filter((s) => !modalHelpStaff.availableSlots.includes(s))}
          onToggle={handleToggleHelpSlot}
          onClose={() => setModal(null)}
        />
      )}

      {/* 警告トースト */}
      {toast && <Toast message={toast} onClose={() => setToast(null)} />}
    </>
  )
}
