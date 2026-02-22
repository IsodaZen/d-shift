import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { HelpStaffAvailabilityCalendar } from './HelpStaffAvailabilityCalendar'

// --- spec: help-staff-management（カレンダーUIで稼働可能日付を設定できる） ---

// シフト期間: 2025-02-01〜2025-02-10（単月）
const PERIOD_DATES_SINGLE_MONTH = [
  '2025-02-01',
  '2025-02-02',
  '2025-02-03',
  '2025-02-04',
  '2025-02-05',
  '2025-02-06',
  '2025-02-07',
  '2025-02-08',
  '2025-02-09',
  '2025-02-10',
]

// シフト期間: 2025-01-27〜2025-02-03（複数月）
const PERIOD_DATES_MULTI_MONTH = [
  '2025-01-27',
  '2025-01-28',
  '2025-01-29',
  '2025-01-30',
  '2025-01-31',
  '2025-02-01',
  '2025-02-02',
  '2025-02-03',
]

describe('HelpStaffAvailabilityCalendar', () => {
  it('シフト期間内の日付がカレンダーに表示される', () => {
    render(
      <HelpStaffAvailabilityCalendar
        periodDates={PERIOD_DATES_SINGLE_MONTH}
        selectedDates={[]}
        onSave={vi.fn()}
      />,
    )

    expect(screen.getByText('2025年2月')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /^1$/ })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /^10$/ })).toBeInTheDocument()
  })

  it('登録済みの稼働可能日付が選択済み状態で表示される', () => {
    render(
      <HelpStaffAvailabilityCalendar
        periodDates={PERIOD_DATES_SINGLE_MONTH}
        selectedDates={['2025-02-03', '2025-02-07']}
        onSave={vi.fn()}
      />,
    )

    const btn3 = screen.getByRole('button', { name: /^3$/ })
    const btn7 = screen.getByRole('button', { name: /^7$/ })
    expect(btn3.className).toMatch(/bg-indigo-500/)
    expect(btn7.className).toMatch(/bg-indigo-500/)
  })

  it('シフト期間外の日付はグレーアウトして選択不可', () => {
    render(
      <HelpStaffAvailabilityCalendar
        periodDates={PERIOD_DATES_SINGLE_MONTH}
        selectedDates={[]}
        onSave={vi.fn()}
      />,
    )

    const btn11 = screen.queryByRole('button', { name: /^11$/ })
    if (btn11) {
      expect(btn11).toBeDisabled()
    }
  })

  it('期間内の日付をタップすると選択状態がトグルされる', async () => {
    const user = userEvent.setup()

    render(
      <HelpStaffAvailabilityCalendar
        periodDates={PERIOD_DATES_SINGLE_MONTH}
        selectedDates={[]}
        onSave={vi.fn()}
      />,
    )

    const btn5 = screen.getByRole('button', { name: /^5$/ })
    await user.click(btn5)

    // クリック後に選択状態（ハイライト）になる
    expect(btn5.className).toMatch(/bg-indigo-500/)
  })

  it('選択済みの日付をタップすると選択解除される', async () => {
    const user = userEvent.setup()

    render(
      <HelpStaffAvailabilityCalendar
        periodDates={PERIOD_DATES_SINGLE_MONTH}
        selectedDates={['2025-02-05']}
        onSave={vi.fn()}
      />,
    )

    const btn5 = screen.getByRole('button', { name: /^5$/ })
    expect(btn5.className).toMatch(/bg-indigo-500/)

    await user.click(btn5)
    expect(btn5.className).not.toMatch(/bg-indigo-500/)
  })

  it('保存ボタンを押すと選択中の日付がコールバックで返される', async () => {
    const user = userEvent.setup()
    const onSave = vi.fn()

    render(
      <HelpStaffAvailabilityCalendar
        periodDates={PERIOD_DATES_SINGLE_MONTH}
        selectedDates={[]}
        onSave={onSave}
      />,
    )

    await user.click(screen.getByRole('button', { name: /^3$/ }))
    await user.click(screen.getByRole('button', { name: /^7$/ }))
    await user.click(screen.getByRole('button', { name: '保存' }))

    expect(onSave).toHaveBeenCalledWith(
      expect.arrayContaining(['2025-02-03', '2025-02-07']),
    )
    expect(onSave.mock.calls[0][0]).toHaveLength(2)
  })

  it('複数月またがり時に前月/翌月ボタンで月送りできる', async () => {
    const user = userEvent.setup()

    render(
      <HelpStaffAvailabilityCalendar
        periodDates={PERIOD_DATES_MULTI_MONTH}
        selectedDates={[]}
        onSave={vi.fn()}
      />,
    )

    // 初期表示は2025年1月
    expect(screen.getByText('2025年1月')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '前月' })).toBeDisabled()

    // 翌月に移動
    await user.click(screen.getByRole('button', { name: '翌月' }))
    expect(screen.getByText('2025年2月')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '翌月' })).toBeDisabled()
  })
})
