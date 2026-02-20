import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { SettingsPage } from './SettingsPage'

// --- spec: shift-period-config / shift-slot-config ---

beforeEach(() => {
  localStorage.clear()
})

/** input[type="date"] をDOM順で取得するヘルパー */
function getDateInputs(container: HTMLElement) {
  const inputs = container.querySelectorAll('input[type="date"]')
  return { startInput: inputs[0] as HTMLInputElement, endInput: inputs[1] as HTMLInputElement }
}

describe('SettingsPage', () => {
  describe('シフト期間バリデーション', () => {
    it('開始日が終了日より後の場合はエラーが表示され保存されない', async () => {
      // spec: 開始日 > 終了日 → バリデーションエラー・保存拒否
      const user = userEvent.setup()
      const { container } = render(<SettingsPage />)

      await user.click(screen.getByRole('button', { name: 'シフト期間' }))

      const { startInput, endInput } = getDateInputs(container)
      await user.clear(startInput)
      await user.type(startInput, '2025-03-01')
      await user.clear(endInput)
      await user.type(endInput, '2025-02-01')
      await user.click(screen.getByRole('button', { name: '保存' }))

      expect(screen.getByText(/開始日は終了日以前/)).toBeInTheDocument()
      expect(localStorage.getItem('d-shift:shift-period')).toBeNull()
    })

    it('期間が35日を超える場合はエラーが表示され保存されない', async () => {
      // spec: 期間 > 35日 → バリデーションエラー・保存拒否
      const user = userEvent.setup()
      const { container } = render(<SettingsPage />)

      await user.click(screen.getByRole('button', { name: 'シフト期間' }))

      const { startInput, endInput } = getDateInputs(container)
      await user.clear(startInput)
      await user.type(startInput, '2025-02-01')
      await user.clear(endInput)
      await user.type(endInput, '2025-03-10') // 37日間（36日差）
      await user.click(screen.getByRole('button', { name: '保存' }))

      expect(screen.getByText(/35日以内/)).toBeInTheDocument()
      expect(localStorage.getItem('d-shift:shift-period')).toBeNull()
    })

    it('期間がちょうど35日の場合は保存できる', async () => {
      // spec: 終了日 − 開始日 = 34日（35日間）→ 保存可
      const user = userEvent.setup()
      const { container } = render(<SettingsPage />)

      await user.click(screen.getByRole('button', { name: 'シフト期間' }))

      const { startInput, endInput } = getDateInputs(container)
      await user.clear(startInput)
      await user.type(startInput, '2025-02-01')
      await user.clear(endInput)
      await user.type(endInput, '2025-03-07') // 34日差（35日間）
      await user.click(screen.getByRole('button', { name: '保存' }))

      expect(screen.queryByText(/エラー/)).not.toBeInTheDocument()
      const stored = JSON.parse(localStorage.getItem('d-shift:shift-period') ?? 'null')
      expect(stored?.startDate).toBe('2025-02-01')
    })
  })

  describe('シフト期間タブ', () => {
    it('「シフト期間」タブが存在する', () => {
      // spec: 設定画面でシフト作成期間を登録できる
      render(<SettingsPage />)
      expect(screen.getByRole('button', { name: 'シフト期間' })).toBeInTheDocument()
    })

    it('シフト期間タブから開始日・終了日を入力して保存できる', async () => {
      // spec: 設定画面でシフト作成期間（開始日・終了日）を登録・変更できる
      const user = userEvent.setup()
      const { container } = render(<SettingsPage />)

      await user.click(screen.getByRole('button', { name: 'シフト期間' }))

      const { startInput, endInput } = getDateInputs(container)
      await user.clear(startInput)
      await user.type(startInput, '2025-02-03')
      await user.clear(endInput)
      await user.type(endInput, '2025-02-28')
      await user.click(screen.getByRole('button', { name: '保存' }))

      const stored = JSON.parse(localStorage.getItem('d-shift:shift-period') ?? 'null')
      expect(stored?.startDate).toBe('2025-02-03')
      expect(stored?.endDate).toBe('2025-02-28')
    })

    it('クリアボタンを押すとシフト期間が削除される', async () => {
      // spec: シフト作成期間を登録・変更できる（削除含む）
      const user = userEvent.setup()
      localStorage.setItem(
        'd-shift:shift-period',
        JSON.stringify({ startDate: '2025-02-03', endDate: '2025-02-28' }),
      )

      render(<SettingsPage />)
      await user.click(screen.getByRole('button', { name: 'シフト期間' }))
      await user.click(screen.getByRole('button', { name: 'クリア' }))

      expect(localStorage.getItem('d-shift:shift-period')).toBe('null')
    })
  })

  describe('シフト枠タブ', () => {
    it('シフト作成期間が設定されている場合に期間内日付の設定UIが表示される', async () => {
      // spec: シフト作成期間が設定されている場合は期間内の全日付が設定対象として表示される
      const user = userEvent.setup()
      localStorage.setItem(
        'd-shift:shift-period',
        JSON.stringify({ startDate: '2025-02-03', endDate: '2025-02-05' }),
      )

      render(<SettingsPage />)
      await user.click(screen.getByRole('button', { name: 'シフト枠' }))

      // 2025-02-03〜2025-02-05の3日分が表示される（M/d(E)形式）
      expect(screen.getByText(/2月3日/)).toBeInTheDocument()
      expect(screen.getByText(/2月4日/)).toBeInTheDocument()
      expect(screen.getByText(/2月5日/)).toBeInTheDocument()
    })
  })
})
