import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { StaffPage } from './StaffPage'

// --- spec: screen-navigation / StaffPage フロー誘導CTA ---
// --- spec: staff-management / スタッフ一覧をドラッグ&ドロップで並び替えられる ---

beforeEach(() => {
  localStorage.clear()
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
    // aria-label="ドラッグハンドル" または data-testid でドラッグハンドルを確認
    const handles = screen.getAllByLabelText('ドラッグハンドル')
    expect(handles).toHaveLength(3)
  })

  it('ドラッグハンドルにポインターダウンするとドラッグ中スタイル（opacity-50）が適用される', () => {
    localStorage.setItem('d-shift:staff', threeStaff)
    renderStaffPage()

    const handles = screen.getAllByLabelText('ドラッグハンドル')
    const listItems = screen.getAllByRole('listitem')

    // マウスのpointerdown → pointermove でドラッグ開始
    fireEvent.pointerDown(handles[0], { pointerId: 1, pointerType: 'mouse' })
    fireEvent.pointerMove(handles[0], { pointerId: 1, pointerType: 'mouse' })

    expect(listItems[0]).toHaveClass('opacity-50')
  })

  it('ドロップ先アイテムにはハイライトスタイルが適用される', () => {
    localStorage.setItem('d-shift:staff', threeStaff)
    renderStaffPage()

    const handles = screen.getAllByLabelText('ドラッグハンドル')
    const listItems = screen.getAllByRole('listitem')

    // インデックス0のハンドルでドラッグ開始
    fireEvent.pointerDown(handles[0], { pointerId: 1, pointerType: 'mouse' })
    fireEvent.pointerMove(handles[0], { pointerId: 1, pointerType: 'mouse' })

    // インデックス2のアイテムにpointerEnter
    fireEvent.pointerEnter(handles[2], { pointerId: 1, pointerType: 'mouse' })

    // ドロップ先にボーダーハイライトが付く
    expect(listItems[2].className).toMatch(/border-indigo/)
  })

  it('ドロップ完了後、reorderStaff が正しいインデックスで呼ばれる', () => {
    localStorage.setItem('d-shift:staff', threeStaff)
    renderStaffPage()

    const handles = screen.getAllByLabelText('ドラッグハンドル')

    // インデックス0のハンドルでドラッグ開始
    fireEvent.pointerDown(handles[0], { pointerId: 1, pointerType: 'mouse' })
    fireEvent.pointerMove(handles[0], { pointerId: 1, pointerType: 'mouse' })

    // インデックス2にpointerEnter → pointerUp
    fireEvent.pointerEnter(handles[2], { pointerId: 1, pointerType: 'mouse' })
    fireEvent.pointerUp(handles[2], { pointerId: 1, pointerType: 'mouse' })

    // LocalStorage が更新されていることで reorderStaff が呼ばれたことを確認
    const stored = JSON.parse(localStorage.getItem('d-shift:staff') ?? '[]')
    expect(stored[0].name).toBe('スタッフB')
    expect(stored[2].name).toBe('スタッフA')
  })

  it('スタッフが1件のみの場合、pointerdown → pointermove してもドラッグが開始されない', () => {
    // spec: スタッフが1件のみの場合はドラッグ操作が無効となる
    localStorage.setItem(
      'd-shift:staff',
      JSON.stringify([
        { id: 's1', name: 'スタッフA', maxWeeklyShifts: 5, availableSlots: ['morning'], usesParking: false },
      ]),
    )
    renderStaffPage()

    const handles = screen.getAllByLabelText('ドラッグハンドル')
    expect(handles).toHaveLength(1)

    const listItems = screen.getAllByRole('listitem')

    // pointerdown → pointermove してもドラッグ中スタイルが付かない
    fireEvent.pointerDown(handles[0], { pointerId: 1, pointerType: 'mouse' })
    fireEvent.pointerMove(handles[0], { pointerId: 1, pointerType: 'mouse' })

    expect(listItems[0]).not.toHaveClass('opacity-50')
  })
})
