import React from 'react'
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, act } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { StaffPage } from './StaffPage'

// --- spec: screen-navigation / StaffPage フロー誘導CTA ---
// --- spec: staff-management / スタッフ一覧をドラッグ&ドロップで並び替えられる ---

// ホイスト：vi.mock はファイルの先頭に巻き上げられるため、共有変数は vi.hoisted で宣言する
const mocks = vi.hoisted(() => ({
  onDragEnd: null as ((event: { active: { id: string }; over: { id: string } | null }) => void) | null,
  onDragOver: null as ((event: { over: { id: string } | null }) => void) | null,
  isDragging: {} as Record<string, boolean>,
}))

vi.mock('@dnd-kit/core', () => ({
  DndContext: ({
    children,
    onDragEnd,
    onDragOver,
  }: {
    children: React.ReactNode
    onDragEnd?: (e: unknown) => void
    onDragOver?: (e: unknown) => void
  }) => {
    mocks.onDragEnd = onDragEnd as typeof mocks.onDragEnd
    mocks.onDragOver = onDragOver as typeof mocks.onDragOver
    return React.createElement(React.Fragment, null, children)
  },
  useSensor: () => ({}),
  useSensors: () => [],
  // PointerSensor はクラスとして参照されるためスタブクラスを返す
  PointerSensor: class {},
}))

vi.mock('@dnd-kit/sortable', () => ({
  SortableContext: ({ children }: { children: React.ReactNode }) =>
    React.createElement(React.Fragment, null, children),
  useSortable: ({ id }: { id: string }) => ({
    attributes: {},
    listeners: {},
    setNodeRef: () => {},
    transform: null,
    transition: undefined,
    isDragging: mocks.isDragging[id] ?? false,
  }),
  verticalListSortingStrategy: {},
}))

beforeEach(() => {
  localStorage.clear()
  mocks.onDragEnd = null
  mocks.onDragOver = null
  // 全アイテムの isDragging をリセット
  Object.keys(mocks.isDragging).forEach((k) => delete mocks.isDragging[k])
})

function renderStaffPage() {
  return render(
    <MemoryRouter initialEntries={['/']}>
      <Routes>
        <Route path="/" element={<StaffPage />} />
        <Route path="/settings/period" element={<div>設定ページ</div>} />
      </Routes>
    </MemoryRouter>,
  )
}

describe('StaffPage フロー誘導CTA', () => {
  it('スタッフが0件の場合、「シフト期間を設定する →」ボタンが表示されない', () => {
    renderStaffPage()
    expect(
      screen.queryByRole('button', { name: 'シフト期間を設定する →' }),
    ).not.toBeInTheDocument()
  })

  it('スタッフが1件以上の場合、「シフト期間を設定する →」ボタンが表示される', () => {
    localStorage.setItem(
      'd-shift:staff',
      JSON.stringify([
        {
          id: 's1',
          name: '山田',
          maxWeeklyShifts: 5,
          availableSlots: ['morning', 'afternoon'],
          usesParking: false,
        },
      ]),
    )
    renderStaffPage()
    expect(
      screen.getByRole('button', { name: 'シフト期間を設定する →' }),
    ).toBeInTheDocument()
  })

  it('「シフト期間を設定する →」ボタンをクリックすると /settings/period に遷移する', async () => {
    const user = userEvent.setup()
    localStorage.setItem(
      'd-shift:staff',
      JSON.stringify([
        {
          id: 's1',
          name: '山田',
          maxWeeklyShifts: 5,
          availableSlots: ['morning'],
          usesParking: false,
        },
      ]),
    )
    renderStaffPage()
    await user.click(screen.getByRole('button', { name: 'シフト期間を設定する →' }))
    // /settings/period へ遷移するとプレースホルダーコンテンツが表示される
    expect(screen.getByText('設定ページ')).toBeInTheDocument()
  })
})

describe('StaffPage D&D ドラッグ&ドロップ', () => {
  const threeStaff = JSON.stringify([
    { id: 's1', name: 'スタッフA', maxWeeklyShifts: 5, availableSlots: ['morning'], usesParking: false },
    { id: 's2', name: 'スタッフB', maxWeeklyShifts: 5, availableSlots: ['morning'], usesParking: false },
    { id: 's3', name: 'スタッフC', maxWeeklyShifts: 5, availableSlots: ['morning'], usesParking: false },
  ])

  it('各スタッフアイテムにドラッグハンドル（グリップ領域）が表示される', () => {
    localStorage.setItem('d-shift:staff', threeStaff)
    renderStaffPage()
    const handles = screen.getAllByLabelText('ドラッグハンドル')
    expect(handles).toHaveLength(3)
  })

  it('ドラッグ中のアイテムに opacity-50 が適用される', () => {
    mocks.isDragging['s1'] = true
    localStorage.setItem('d-shift:staff', threeStaff)
    renderStaffPage()

    const listItems = screen.getAllByRole('listitem')
    expect(listItems[0]).toHaveClass('opacity-50')
    // 他のアイテムには付かない
    expect(listItems[1]).not.toHaveClass('opacity-50')
  })

  it('ドロップ先アイテムにはハイライトスタイルが適用される', () => {
    localStorage.setItem('d-shift:staff', threeStaff)
    mocks.isDragging['s1'] = true
    renderStaffPage()

    // s1をドラッグ中、s3の上にホバー
    act(() => {
      mocks.onDragOver?.({ over: { id: 's3' } })
    })

    const listItems = screen.getAllByRole('listitem')
    expect(listItems[2].className).toMatch(/border-indigo/)
  })

  it('ドロップ完了後、reorderStaff が正しいインデックスで呼ばれる', () => {
    localStorage.setItem('d-shift:staff', threeStaff)
    renderStaffPage()

    // s1（index:0）を s3（index:2）の位置へドロップ
    act(() => {
      mocks.onDragEnd?.({ active: { id: 's1' }, over: { id: 's3' } })
    })

    // reorderStaff(0, 2) の結果: [B, C, A]
    const stored = JSON.parse(localStorage.getItem('d-shift:staff') ?? '[]')
    expect(stored[0].name).toBe('スタッフB')
    expect(stored[2].name).toBe('スタッフA')
  })

  it('active と over が同じ場合、順序は変化しない', () => {
    localStorage.setItem('d-shift:staff', threeStaff)
    const initialStored = threeStaff
    renderStaffPage()

    act(() => {
      mocks.onDragEnd?.({ active: { id: 's1' }, over: { id: 's1' } })
    })

    const stored = localStorage.getItem('d-shift:staff')
    expect(stored).toBe(initialStored)
  })

  it('over が null のとき順序は変化しない（ドロップ外）', () => {
    localStorage.setItem('d-shift:staff', threeStaff)
    const initialStored = threeStaff
    renderStaffPage()

    act(() => {
      mocks.onDragEnd?.({ active: { id: 's1' }, over: null })
    })

    const stored = localStorage.getItem('d-shift:staff')
    expect(stored).toBe(initialStored)
  })

  it('スタッフが1件のみの場合、ドラッグハンドルは表示される', () => {
    localStorage.setItem(
      'd-shift:staff',
      JSON.stringify([
        { id: 's1', name: 'スタッフA', maxWeeklyShifts: 5, availableSlots: ['morning'], usesParking: false },
      ]),
    )
    renderStaffPage()

    const handles = screen.getAllByLabelText('ドラッグハンドル')
    expect(handles).toHaveLength(1)

    // isDragging がデフォルト false なので opacity-50 は付かない
    const listItems = screen.getAllByRole('listitem')
    expect(listItems[0]).not.toHaveClass('opacity-50')
  })
})
