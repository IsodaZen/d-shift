import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { SettingsPage } from './SettingsPage'

// --- spec: shift-period-config / shift-slot-config ---

beforeEach(() => {
  localStorage.clear()
})

describe('SettingsPage', () => {
  describe('シフト期間タブ', () => {
    it('「シフト期間」タブが存在する', () => {
      // spec: 設定画面でシフト作成期間を登録できる
      render(<SettingsPage />)
      expect(screen.getByRole('button', { name: 'シフト期間' })).toBeInTheDocument()
    })

    it('シフト期間タブから開始日・終了日を入力して保存できる', async () => {
      // spec: 設定画面でシフト作成期間（開始日・終了日）を登録・変更できる
      const user = userEvent.setup()
      render(<SettingsPage />)

      await user.click(screen.getByRole('button', { name: 'シフト期間' }))

      const [startInput, endInput] = screen.getAllByDisplayValue('')
      await user.type(startInput, '2025-02-03')
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
    it('シフト作成期間が未設定の場合に設定促進メッセージが表示される', async () => {
      // spec: シフト作成期間が未設定の場合は設定を促すメッセージが表示される
      const user = userEvent.setup()
      render(<SettingsPage />)

      await user.click(screen.getByRole('button', { name: 'シフト枠' }))

      expect(screen.getByText(/シフト作成期間を先に設定してください/)).toBeInTheDocument()
    })

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
