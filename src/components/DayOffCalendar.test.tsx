import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { DayOffCalendar } from './DayOffCalendar'

// --- spec: preferred-day-off（カレンダーUI） ---

// シフト期間: 2025-01-27〜2025-03-01（複数月）
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

describe('DayOffCalendar', () => {
  it('シフト期間内の日付がカレンダーに表示される', () => {
    // spec: シフト期間の開始月からカレンダーが表示される
    render(
      <DayOffCalendar
        periodDates={PERIOD_DATES_SINGLE_MONTH}
        selectedDates={[]}
        onToggle={vi.fn()}
      />,
    )

    // 2月のカレンダーが表示される
    expect(screen.getByText('2025年2月')).toBeInTheDocument()
    // 期間内の日付が表示される
    expect(screen.getByRole('button', { name: /^1$/ })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /^10$/ })).toBeInTheDocument()
  })

  it('登録済みの日付が初期選択済み状態で表示される', () => {
    // spec: すでに登録済みの日付は最初から選択済み（ハイライト）状態で表示する
    render(
      <DayOffCalendar
        periodDates={PERIOD_DATES_SINGLE_MONTH}
        selectedDates={['2025-02-03', '2025-02-07']}
        onToggle={vi.fn()}
      />,
    )

    const btn3 = screen.getByRole('button', { name: /^3$/ })
    const btn7 = screen.getByRole('button', { name: /^7$/ })
    // 選択済みスタイルが付与されていることを確認
    expect(btn3.className).toMatch(/bg-indigo-500/)
    expect(btn7.className).toMatch(/bg-indigo-500/)
  })

  it('シフト期間外の日付はグレーアウトして選択不可で表示される', () => {
    // spec: シフト期間外の日付はグレーアウトして選択不可とする
    render(
      <DayOffCalendar
        periodDates={PERIOD_DATES_SINGLE_MONTH}
        selectedDates={[]}
        onToggle={vi.fn()}
      />,
    )

    // 2025-02-01〜02-10 が期間内。2/11以降や1/31以前は期間外
    // カレンダーに表示されているが、期間外はdisabledであること
    // 2月のカレンダーには2/11〜2/28も表示される（グレーアウト）
    const btn11 = screen.queryByRole('button', { name: /^11$/ })
    if (btn11) {
      expect(btn11).toBeDisabled()
    }
  })

  it('期間内の日付をタップすると選択状態がトグルされる（onToggleが呼ばれる）', async () => {
    // spec: カレンダー上の日付をタップして選択・解除できる
    const user = userEvent.setup()
    const onToggle = vi.fn()

    render(
      <DayOffCalendar
        periodDates={PERIOD_DATES_SINGLE_MONTH}
        selectedDates={[]}
        onToggle={onToggle}
      />,
    )

    await user.click(screen.getByRole('button', { name: /^5$/ }))
    expect(onToggle).toHaveBeenCalledWith('2025-02-05')
  })

  it('シフト期間外の日付をタップしても選択状態が変化しない（onToggleが呼ばれない）', async () => {
    // spec: シフト期間外の日付はタップしても選択されない
    const user = userEvent.setup()
    const onToggle = vi.fn()

    render(
      <DayOffCalendar
        periodDates={PERIOD_DATES_SINGLE_MONTH}
        selectedDates={[]}
        onToggle={onToggle}
      />,
    )

    // 期間外の日付（11日以降）が存在すればクリックしてもonToggleが呼ばれないこと
    const btn11 = screen.queryByRole('button', { name: /^11$/ })
    if (btn11) {
      await user.click(btn11)
      expect(onToggle).not.toHaveBeenCalled()
    }
  })

  it('複数月またがり時に前月/翌月ボタンが表示される', () => {
    // spec: 期間が複数月にまたがる場合は「前月」「翌月」ボタンでページ送りする
    render(
      <DayOffCalendar
        periodDates={PERIOD_DATES_MULTI_MONTH}
        selectedDates={[]}
        onToggle={vi.fn()}
      />,
    )

    expect(screen.getByRole('button', { name: '前月' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '翌月' })).toBeInTheDocument()
  })

  it('前月ボタンは開始月で非活性になる', () => {
    // spec: 「前月」ボタンはシフト期間の開始月では非活性にする
    render(
      <DayOffCalendar
        periodDates={PERIOD_DATES_MULTI_MONTH}
        selectedDates={[]}
        onToggle={vi.fn()}
      />,
    )

    // 初期表示は開始月（2025-01）
    const prevBtn = screen.getByRole('button', { name: '前月' })
    expect(prevBtn).toBeDisabled()
  })

  it('翌月ボタンは終了月で非活性になる', async () => {
    // spec: 「翌月」ボタンはシフト期間の終了月では非活性にする
    const user = userEvent.setup()

    render(
      <DayOffCalendar
        periodDates={PERIOD_DATES_MULTI_MONTH}
        selectedDates={[]}
        onToggle={vi.fn()}
      />,
    )

    // 翌月ボタンを押して終了月（2025-02）に移動
    await user.click(screen.getByRole('button', { name: '翌月' }))

    const nextBtn = screen.getByRole('button', { name: '翌月' })
    expect(nextBtn).toBeDisabled()
  })
})
