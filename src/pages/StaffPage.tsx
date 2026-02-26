// spec: staff-management / スタッフ一覧をドラッグ&ドロップで並び替えられる（@dnd-kit実装）
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  DndContext,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragOverEvent,
} from '@dnd-kit/core'
import { SortableContext, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable'
import type { Staff } from '../types'
import { TIME_SLOT_LABELS } from '../types'
import { StaffForm } from '../components/StaffForm'
import { DayOffCalendar } from '../components/DayOffCalendar'
import { useStaff } from '../hooks/useStaff'
import { useDayOffs } from '../hooks/useDayOffs'
import { useShiftPeriod } from '../hooks/useShiftPeriod'

// ソート可能なスタッフアイテムコンポーネント
function SortableStaffItem({
  staff: s,
  isOver,
  onEdit,
  onDelete,
  onDayOff,
}: {
  staff: Staff
  isOver: boolean
  onEdit: (s: Staff) => void
  onDelete: (id: string) => void
  onDayOff: (s: Staff) => void
}) {
  const { attributes, listeners, setNodeRef, isDragging } = useSortable({ id: s.id })

  return (
    <li
      ref={setNodeRef}
      className={[
        'bg-white border border-gray-200 rounded-xl p-3 flex items-start justify-between gap-2',
        isDragging ? 'opacity-50' : '',
        isOver ? 'border-indigo-400 border-2' : '',
      ]
        .filter(Boolean)
        .join(' ')}
    >
      {/* ドラッグハンドル */}
      <button
        aria-label="ドラッグハンドル"
        className="shrink-0 cursor-grab text-gray-400 hover:text-gray-600 text-lg leading-none pt-0.5 touch-none"
        {...attributes}
        {...listeners}
      >
        ⠿
      </button>

      <div className="flex-1 min-w-0">
        <p className="font-medium text-gray-800 text-sm">{s.name}</p>
        <p className="text-xs text-gray-500 mt-0.5">
          週{s.maxWeeklyShifts}回上限 ·{' '}
          {s.availableSlots.map((sl) => TIME_SLOT_LABELS[sl]).join('/')}
          {s.usesParking && ' · 駐車場あり'}
        </p>
      </div>
      <div className="flex gap-2 shrink-0">
        <button
          onClick={() => onDayOff(s)}
          className="text-xs text-indigo-600 hover:text-indigo-800 px-2 py-1 rounded"
        >
          希望休
        </button>
        <button
          onClick={() => onEdit(s)}
          className="text-xs text-indigo-600 hover:text-indigo-800 px-2 py-1 rounded"
        >
          編集
        </button>
        <button
          onClick={() => {
            if (confirm(`「${s.name}」を削除しますか？`)) onDelete(s.id)
          }}
          className="text-xs text-red-500 hover:text-red-700 px-2 py-1 rounded"
        >
          削除
        </button>
      </div>
    </li>
  )
}

type FormMode = { type: 'add' } | { type: 'edit'; staff: Staff } | { type: 'dayoff'; staff: Staff } | null

export function StaffPage() {
  const { staff, addStaff, updateStaff, deleteStaff, reorderStaff } = useStaff()
  const { dayOffs, addDayOff, syncDayOffs } = useDayOffs()
  const { isShiftPeriodSaved, getPeriodDates } = useShiftPeriod()
  const [mode, setMode] = useState<FormMode>(null)
  const [overId, setOverId] = useState<string | null>(null)
  const navigate = useNavigate()

  // 希望休管理 state
  const [calendarSelectedDates, setCalendarSelectedDates] = useState<string[]>([])
  const [syncMessage, setSyncMessage] = useState('')
  const [dayOffDate, setDayOffDate] = useState('')
  const [dayOffError, setDayOffError] = useState('')

  // 8px 以上動かしてからドラッグ開始（誤操作防止）
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    }),
  )

  const handleDragOver = (event: DragOverEvent) => {
    setOverId(event.over?.id as string ?? null)
  }

  const handleDragEnd = (event: DragEndEvent) => {
    setOverId(null)
    const { active, over } = event
    if (!over || active.id === over.id) return

    const fromIndex = staff.findIndex((s) => s.id === active.id)
    const toIndex = staff.findIndex((s) => s.id === over.id)
    if (fromIndex !== -1 && toIndex !== -1) {
      reorderStaff(fromIndex, toIndex)
    }
  }

  const handleSubmit = (data: Omit<Staff, 'id'>) => {
    if (mode?.type === 'edit') {
      updateStaff(mode.staff.id, data)
    } else {
      addStaff(data)
    }
    setMode(null)
  }

  const handleCalendarToggle = (date: string) => {
    setSyncMessage('')
    setCalendarSelectedDates((prev) =>
      prev.includes(date) ? prev.filter((d) => d !== date) : [...prev, date],
    )
  }

  const handleSyncDayOffs = () => {
    if (mode?.type !== 'dayoff') return
    const { added, removed } = syncDayOffs(mode.staff.id, calendarSelectedDates)
    setSyncMessage(`${added}件を追加、${removed}件を削除しました`)
  }

  const handleAddDayOff = () => {
    if (mode?.type !== 'dayoff') return
    if (!dayOffDate) {
      setDayOffError('日付を選択してください')
      return
    }
    const ok = addDayOff(mode.staff.id, dayOffDate)
    if (!ok) {
      setDayOffError('すでに登録済みです')
      return
    }
    setDayOffError('')
    setDayOffDate('')
  }

  // 希望休管理ビュー
  if (mode?.type === 'dayoff') {
    const periodDates = getPeriodDates()
    return (
      <div className="p-4">
        <div className="flex items-center gap-3 mb-4">
          <button
            onClick={() => setMode(null)}
            className="text-sm text-gray-500 hover:text-gray-700"
          >
            戻る
          </button>
          <h2 className="text-base font-semibold text-gray-800">{mode.staff.name} の希望休</h2>
        </div>

        {!isShiftPeriodSaved ? (
          /* フォールバック: シフト期間未保存時は単一日付入力 */
          <div className="bg-white border border-gray-200 rounded-xl p-3 mb-4">
            <p className="text-sm font-medium text-gray-700 mb-3">希望休を登録</p>
            <div className="space-y-2">
              <label className="sr-only" htmlFor="dayoff-date-input">希望休日付</label>
              <input
                id="dayoff-date-input"
                type="date"
                value={dayOffDate}
                onChange={(e) => setDayOffDate(e.target.value)}
                aria-label="希望休日付"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
              />
              {dayOffError && <p className="text-red-500 text-xs">{dayOffError}</p>}
              <button
                onClick={handleAddDayOff}
                className="w-full bg-indigo-500 text-white py-2.5 rounded-lg text-sm font-medium hover:bg-indigo-600"
              >
                登録
              </button>
            </div>
          </div>
        ) : (
          /* カレンダーモード: シフト期間保存済み */
          <div className="bg-white border border-gray-200 rounded-xl p-3 mb-4">
            <p className="text-sm font-medium text-gray-700 mb-3">希望休を登録</p>
            {syncMessage && (
              <p className="text-indigo-600 text-xs mb-2">{syncMessage}</p>
            )}
            <DayOffCalendar
              periodDates={periodDates}
              selectedDates={calendarSelectedDates}
              onToggle={handleCalendarToggle}
            />
            <button
              onClick={handleSyncDayOffs}
              className="mt-3 w-full bg-indigo-500 text-white py-2.5 rounded-lg text-sm font-medium hover:bg-indigo-600"
            >
              保存
            </button>
          </div>
        )}
      </div>
    )
  }

  if (mode) {
    return (
      <div className="p-4">
        <h2 className="text-base font-semibold text-gray-800 mb-4">
          {mode.type === 'edit' ? 'スタッフ編集' : 'スタッフ追加'}
        </h2>
        <StaffForm
          initialData={mode.type === 'edit' ? mode.staff : undefined}
          onSubmit={handleSubmit}
          onCancel={() => setMode(null)}
        />
      </div>
    )
  }

  return (
    <div className="p-4">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-base font-semibold text-gray-800">スタッフ管理</h2>
        <button
          onClick={() => setMode({ type: 'add' })}
          className="bg-indigo-500 text-white text-sm px-4 py-2 rounded-lg hover:bg-indigo-600 active:bg-indigo-700"
        >
          ＋ 追加
        </button>
      </div>

      {/* 空状態 */}
      {staff.length === 0 ? (
        <div className="text-center py-12 text-gray-400">
          <p className="text-3xl mb-2">👤</p>
          <p className="text-sm">スタッフが登録されていません</p>
          <p className="text-xs mt-1">「＋ 追加」からスタッフを登録してください</p>
        </div>
      ) : (
        <>
          <DndContext
            sensors={sensors}
            onDragOver={handleDragOver}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={staff.map((s) => s.id)}
              strategy={verticalListSortingStrategy}
              disabled={staff.length <= 1}
            >
              <ul className="space-y-2">
                {staff.map((s) => (
                  <SortableStaffItem
                    key={s.id}
                    staff={s}
                    isOver={overId === s.id}
                    onEdit={(s) => setMode({ type: 'edit', staff: s })}
                    onDelete={(id) => deleteStaff(id)}
                    onDayOff={(s) => {
                      const registered = dayOffs
                        .filter((d) => d.staffId === s.id)
                        .map((d) => d.date)
                      setCalendarSelectedDates(registered)
                      setSyncMessage('')
                      setDayOffDate('')
                      setDayOffError('')
                      setMode({ type: 'dayoff', staff: s })
                    }}
                  />
                ))}
              </ul>
            </SortableContext>
          </DndContext>

          {/* フロー誘導 CTA */}
          <button
            onClick={() => navigate('/settings/period')}
            className="mt-4 w-full bg-indigo-500 text-white py-3 rounded-xl text-sm font-medium hover:bg-indigo-600 active:bg-indigo-700"
          >
            シフト期間を設定する →
          </button>
        </>
      )}
    </div>
  )
}
