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
import { useStaff } from '../hooks/useStaff'

// ソート可能なスタッフアイテムコンポーネント
function SortableStaffItem({
  staff: s,
  isOver,
  onEdit,
  onDelete,
}: {
  staff: Staff
  isOver: boolean
  onEdit: (s: Staff) => void
  onDelete: (id: string) => void
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

type FormMode = { type: 'add' } | { type: 'edit'; staff: Staff } | null

export function StaffPage() {
  const { staff, addStaff, updateStaff, deleteStaff, reorderStaff } = useStaff()
  const [mode, setMode] = useState<FormMode>(null)
  const [overId, setOverId] = useState<string | null>(null)
  const navigate = useNavigate()

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
