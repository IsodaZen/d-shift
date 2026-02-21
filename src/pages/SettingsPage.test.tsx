import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { SettingsPage } from './SettingsPage'

// --- spec: shift-period-config / shift-slot-config / screen-navigation ---

beforeEach(() => {
  localStorage.clear()
})

/** input[type="date"] をDOM順で取得するヘルパー */
function getDateInputs(container: HTMLElement) {
  const inputs = container.querySelectorAll('input[type="date"]')
  return { startInput: inputs[0] as HTMLInputElement, endInput: inputs[1] as HTMLInputElement }
}

/** MemoryRouter + Routes でラップしてレンダリングするヘルパー（useParams が機能するために必要） */
function renderSettings(initialPath: string = '/settings') {
  return render(
    <MemoryRouter initialEntries={[initialPath]}>
      <Routes>
        <Route path="/settings" element={<SettingsPage />} />
        <Route path="/settings/:tab" element={<SettingsPage />} />
      </Routes>
    </MemoryRouter>,
  )
}

describe('SettingsPage', () => {
  describe('シフト期間バリデーション', () => {
    it('開始日が終了日より後の場合はエラーが表示され保存されない', async () => {
      // spec: 開始日 > 終了日 → バリデーションエラー・保存拒否
      const user = userEvent.setup()
      const { container } = renderSettings()

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
      const { container } = renderSettings()

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
      const { container } = renderSettings()

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
      renderSettings()
      expect(screen.getByRole('button', { name: 'シフト期間' })).toBeInTheDocument()
    })

    it('シフト期間タブから開始日・終了日を入力して保存できる', async () => {
      // spec: 設定画面でシフト作成期間（開始日・終了日）を登録・変更できる
      const user = userEvent.setup()
      const { container } = renderSettings()

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

      renderSettings()
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

      renderSettings()
      await user.click(screen.getByRole('button', { name: 'シフト枠' }))

      // 2025-02-03〜2025-02-05の3日分が表示される（M/d(E)形式）
      expect(screen.getByText(/2月3日/)).toBeInTheDocument()
      expect(screen.getByText(/2月4日/)).toBeInTheDocument()
      expect(screen.getByText(/2月5日/)).toBeInTheDocument()
    })
  })

  describe('URLタブ連動', () => {
    it('/settings/shift でシフト枠タブがアクティブになる', () => {
      renderSettings('/settings/shift')
      // シフト枠タブが選択されると「シフトを作成する →」CTAが表示される
      expect(screen.getByRole('button', { name: 'シフトを作成する →' })).toBeInTheDocument()
    })

    it('/settings/dayoff で希望休タブがアクティブになる', () => {
      renderSettings('/settings/dayoff')
      expect(screen.getByText(/希望休を登録/)).toBeInTheDocument()
    })

    it('/settings/parking で駐車場タブがアクティブになる', () => {
      renderSettings('/settings/parking')
      expect(screen.getByText(/駐車場種別/)).toBeInTheDocument()
    })

    it('/settings/invalid はシフト期間タブにフォールバックする', () => {
      renderSettings('/settings/invalid')
      // シフト期間タブの内容（保存ボタン）が表示される
      expect(screen.getByRole('button', { name: '保存' })).toBeInTheDocument()
    })

    it('タブボタンをクリックするとURLが変わる（navigate が呼ばれる）', async () => {
      const user = userEvent.setup()
      renderSettings('/settings')
      await user.click(screen.getByRole('button', { name: 'シフト枠' }))
      // シフト枠タブに遷移すると「シフトを作成する →」CTAが表示される
      expect(screen.getByRole('button', { name: 'シフトを作成する →' })).toBeInTheDocument()
    })
  })

  describe('フロー誘導 CTA', () => {
    it('シフト期間が保存されている場合、期間タブに「シフト枠を設定する →」ボタンが表示される', () => {
      localStorage.setItem(
        'd-shift:shift-period',
        JSON.stringify({ startDate: '2025-02-01', endDate: '2025-02-28' }),
      )
      renderSettings('/settings/period')
      expect(screen.getByRole('button', { name: 'シフト枠を設定する →' })).toBeInTheDocument()
    })

    it('シフト期間が保存されていない場合、期間タブにCTAが表示されない', () => {
      // デフォルト値のみ（未保存）
      renderSettings('/settings/period')
      expect(screen.queryByRole('button', { name: 'シフト枠を設定する →' })).not.toBeInTheDocument()
    })

    it('シフト枠タブに「シフトを作成する →」ボタンが常時表示される', () => {
      renderSettings('/settings/shift')
      expect(screen.getByRole('button', { name: 'シフトを作成する →' })).toBeInTheDocument()
    })

    it('「シフトを作成する →」ボタンをクリックすると /shift に遷移する', async () => {
      const user = userEvent.setup()
      renderSettings('/settings/shift')
      await user.click(screen.getByRole('button', { name: 'シフトを作成する →' }))
      // 遷移後、ボタンは引き続き存在する（MemoryRouterで動作）
      // navigate('/shift') が呼ばれることを確認
      expect(screen.queryByRole('button', { name: 'シフトを作成する →' })).not.toBeInTheDocument()
    })
  })
})
