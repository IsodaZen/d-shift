import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { StaffPage } from './StaffPage'

// --- spec: screen-navigation / StaffPage フロー誘導CTA ---

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
