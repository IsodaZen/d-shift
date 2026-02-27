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

describe('StaffPage 希望休ビュー', () => {
  const staffData = JSON.stringify([
    {
      id: 's1',
      name: '山田',
      maxWeeklyShifts: 5,
      availableSlots: ['morning'],
      usesParking: false,
    },
  ])

  it('1.1 各スタッフアイテムに「希望休」ボタンが表示される', () => {
    localStorage.setItem('d-shift:staff', staffData)
    renderStaffPage()
    expect(screen.getByRole('button', { name: '希望休' })).toBeInTheDocument()
  })

  it('1.2 「希望休」ボタンをクリックすると希望休管理ビューが表示され、スタッフ一覧は非表示になる', async () => {
    const user = userEvent.setup()
    localStorage.setItem('d-shift:staff', staffData)
    renderStaffPage()
    await user.click(screen.getByRole('button', { name: '希望休' }))
    // スタッフ一覧（list）は非表示
    expect(screen.queryByRole('list')).not.toBeInTheDocument()
    // 希望休管理ビューの見出しが表示される
    expect(screen.getByText('山田 の希望休')).toBeInTheDocument()
  })

  it('1.3 希望休管理ビューの見出しが「{スタッフ名} の希望休」になる', async () => {
    const user = userEvent.setup()
    localStorage.setItem('d-shift:staff', staffData)
    renderStaffPage()
    await user.click(screen.getByRole('button', { name: '希望休' }))
    expect(screen.getByText('山田 の希望休')).toBeInTheDocument()
  })

  it('1.4 「戻る」ボタンをクリックするとスタッフ一覧ビューに戻る', async () => {
    const user = userEvent.setup()
    localStorage.setItem('d-shift:staff', staffData)
    renderStaffPage()
    await user.click(screen.getByRole('button', { name: '希望休' }))
    await user.click(screen.getByRole('button', { name: '戻る' }))
    // スタッフ一覧が再表示される
    expect(screen.getByRole('list')).toBeInTheDocument()
  })

  it('1.5 希望休管理ビューにスタッフ選択ドロップダウンが表示されない', async () => {
    const user = userEvent.setup()
    localStorage.setItem('d-shift:staff', staffData)
    renderStaffPage()
    await user.click(screen.getByRole('button', { name: '希望休' }))
    expect(screen.queryByRole('combobox')).not.toBeInTheDocument()
  })

  it('1.6 希望休管理ビュー表示中はフロー誘導CTA「シフト期間を設定する →」が表示されない', async () => {
    const user = userEvent.setup()
    localStorage.setItem('d-shift:staff', staffData)
    renderStaffPage()
    await user.click(screen.getByRole('button', { name: '希望休' }))
    expect(
      screen.queryByRole('button', { name: 'シフト期間を設定する →' }),
    ).not.toBeInTheDocument()
  })
})

describe('StaffPage 希望休管理ビュー コンテンツ', () => {
  const staffData = JSON.stringify([
    {
      id: 's1',
      name: '山田',
      maxWeeklyShifts: 5,
      availableSlots: ['morning'],
      usesParking: false,
    },
  ])
  const SHIFT_PERIOD = JSON.stringify({ startDate: '2025-02-01', endDate: '2025-02-10' })

  it('3.1 シフト期間未保存時はフォールバックUI（日付入力フィールド）が表示される', async () => {
    const user = userEvent.setup()
    localStorage.setItem('d-shift:staff', staffData)
    renderStaffPage()
    await user.click(screen.getByRole('button', { name: '希望休' }))
    expect(screen.getByLabelText('希望休日付')).toBeInTheDocument()
    expect(screen.queryByText(/\d+年\d+月/)).not.toBeInTheDocument()
  })

  it('3.2 シフト期間保存済み時はカレンダーUIが表示される', async () => {
    const user = userEvent.setup()
    localStorage.setItem('d-shift:staff', staffData)
    localStorage.setItem('d-shift:shift-period', SHIFT_PERIOD)
    renderStaffPage()
    await user.click(screen.getByRole('button', { name: '希望休' }))
    expect(screen.getByText('2025年2月')).toBeInTheDocument()
  })

  it('3.3 カレンダーで日付をトグル選択できる', async () => {
    const user = userEvent.setup()
    localStorage.setItem('d-shift:staff', staffData)
    localStorage.setItem('d-shift:shift-period', SHIFT_PERIOD)
    renderStaffPage()
    await user.click(screen.getByRole('button', { name: '希望休' }))
    // 3日をクリック（選択）
    await user.click(screen.getByRole('button', { name: /^3$/ }))
    expect(screen.getByRole('button', { name: /^3$/ }).className).toMatch(/bg-indigo-500/)
    // もう一度クリック（解除）
    await user.click(screen.getByRole('button', { name: /^3$/ }))
    expect(screen.getByRole('button', { name: /^3$/ }).className).not.toMatch(/bg-indigo-500/)
  })

  it('3.4 「保存」ボタンをクリックすると syncDayOffs が呼ばれる', async () => {
    const user = userEvent.setup()
    localStorage.setItem('d-shift:staff', staffData)
    localStorage.setItem('d-shift:shift-period', SHIFT_PERIOD)
    renderStaffPage()
    await user.click(screen.getByRole('button', { name: '希望休' }))
    // 3日を選択
    await user.click(screen.getByRole('button', { name: /^3$/ }))
    await user.click(screen.getByRole('button', { name: '保存' }))
    // syncDayOffsが呼ばれた → localStorage に保存される
    const stored = JSON.parse(localStorage.getItem('d-shift:day-offs') ?? '[]')
    expect(stored.some((d: { staffId: string }) => d.staffId === 's1')).toBe(true)
  })

  it('3.5 保存後に結果メッセージが表示される', async () => {
    const user = userEvent.setup()
    localStorage.setItem('d-shift:staff', staffData)
    localStorage.setItem('d-shift:shift-period', SHIFT_PERIOD)
    renderStaffPage()
    await user.click(screen.getByRole('button', { name: '希望休' }))
    await user.click(screen.getByRole('button', { name: /^3$/ }))
    await user.click(screen.getByRole('button', { name: '保存' }))
    expect(screen.getByText(/件を追加、.*件を削除しました/)).toBeInTheDocument()
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
