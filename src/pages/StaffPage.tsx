// タスク4.2, 4.4, 4.5: StaffPage（スタッフ管理ページ）
// D&D機能追加: staff-list-drag-drop
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import type { Staff } from '../types'
import { TIME_SLOT_LABELS } from '../types'
import { StaffForm } from '../components/StaffForm'
import { useStaff } from '../hooks/useStaff'
import { useDragSort } from '../hooks/useDragSort'

type FormMode = { type: 'add' } | { type: 'edit'; staff: Staff } | null

export function StaffPage() {
  const { staff, addStaff, updateStaff, deleteStaff, reorderStaff } = useStaff()
  const [mode, setMode] = useState<FormMode>(null)
  const navigate = useNavigate()

  const { draggingIndex, dragOverIndex, getDragHandleProps } = useDragSort({
    onReorder: reorderStaff,
    disabled: staff.length <= 1,
  })

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

      {/* タスク4.5: 空状態 */}
      {staff.length === 0 ? (
        <div className="text-center py-12 text-gray-400">
          <p className="text-3xl mb-2">👤</p>
          <p className="text-sm">スタッフが登録されていません</p>
          <p className="text-xs mt-1">「＋ 追加」からスタッフを登録してください</p>
        </div>
      ) : (
        <>
          <ul className={`space-y-2 ${draggingIndex !== null ? 'select-none' : ''}`}>
            {staff.map((s, i) => {
              const isDragging = draggingIndex === i
              const isDragOver = dragOverIndex === i && draggingIndex !== i
              const dragProps = getDragHandleProps(i)

              return (
                <li
                  key={s.id}
                  className={[
                    'bg-white border border-gray-200 rounded-xl p-3 flex items-start justify-between gap-2',
                    isDragging ? 'opacity-50' : '',
                    isDragOver ? 'border-indigo-400 border-2' : '',
                  ]
                    .filter(Boolean)
                    .join(' ')}
                >
                  {/* ドラッグハンドル */}
                  <button
                    aria-label="ドラッグハンドル"
                    className="shrink-0 cursor-grab text-gray-400 hover:text-gray-600 text-lg leading-none pt-0.5 touch-none"
                    onPointerDown={(e) => dragProps.onPointerDown(e.nativeEvent as PointerEvent)}
                    onPointerMove={(e) => dragProps.onPointerMove(e.nativeEvent as PointerEvent)}
                    onPointerEnter={(e) => dragProps.onPointerEnter(e.nativeEvent as PointerEvent)}
                    onPointerUp={(e) => dragProps.onPointerUp(e.nativeEvent as PointerEvent)}
                    onPointerCancel={(e) => dragProps.onPointerCancel(e.nativeEvent as PointerEvent)}
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
                      onClick={() => setMode({ type: 'edit', staff: s })}
                      className="text-xs text-indigo-600 hover:text-indigo-800 px-2 py-1 rounded"
                    >
                      編集
                    </button>
                    <button
                      onClick={() => {
                        if (confirm(`「${s.name}」を削除しますか？`)) deleteStaff(s.id)
                      }}
                      className="text-xs text-red-500 hover:text-red-700 px-2 py-1 rounded"
                    >
                      削除
                    </button>
                  </div>
                </li>
              )
            })}
          </ul>

          {/* フロー誘導 CTA: スタッフが1件以上の場合 */}
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
