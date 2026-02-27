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

    it('/settings/dayoff はシフト期間タブにフォールバックする', () => {
      renderSettings('/settings/dayoff')
      // dayoffタブが存在しないため、periodタブにフォールバックされる
      expect(screen.getByRole('button', { name: '保存' })).toBeInTheDocument()
    })

    it('タブ一覧に「希望休」ボタンが存在しない', () => {
      renderSettings()
      expect(screen.queryByRole('button', { name: '希望休' })).not.toBeInTheDocument()
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

  describe('ヘルプスタッフタブ', () => {
    const SHIFT_PERIOD = JSON.stringify({ startDate: '2025-02-01', endDate: '2025-02-10' })

    it('/settings/help-staff でヘルプスタッフタブが表示される', () => {
      // spec: help-staff-management（ヘルプスタッフタブ）
      renderSettings('/settings/help-staff')
      expect(screen.getByText('ヘルプスタッフ一覧')).toBeInTheDocument()
    })

    it('ヘルプスタッフが未登録の場合は空メッセージが表示される', () => {
      renderSettings('/settings/help-staff')
      expect(screen.getByText('ヘルプスタッフが登録されていません')).toBeInTheDocument()
    })

    it('ヘルプスタッフ一覧が表示される', () => {
      localStorage.setItem(
        'd-shift:help-staff',
        JSON.stringify([
          { id: 'hs-1', name: '田中ヘルプ', availableSlots: ['morning'], availableDates: [], usesParking: false },
        ]),
      )
      renderSettings('/settings/help-staff')
      expect(screen.getByText('田中ヘルプ')).toBeInTheDocument()
    })

    it('ヘルプスタッフを追加できる', async () => {
      const user = userEvent.setup()
      renderSettings('/settings/help-staff')

      // 追加ボタンを押してフォームを表示
      await user.click(screen.getByRole('button', { name: '追加' }))

      // フォームに入力
      await user.type(screen.getByPlaceholderText('田中 太郎'), '新規ヘルプ')
      await user.click(screen.getByRole('button', { name: '保存' }))

      // 一覧に追加されている
      expect(screen.getByText('新規ヘルプ')).toBeInTheDocument()
    })

    it('ヘルプスタッフを編集できる', async () => {
      const user = userEvent.setup()
      localStorage.setItem(
        'd-shift:help-staff',
        JSON.stringify([
          { id: 'hs-1', name: '田中ヘルプ', availableSlots: ['morning', 'afternoon', 'evening'], availableDates: [], usesParking: false },
        ]),
      )
      renderSettings('/settings/help-staff')

      // 編集ボタンを押す
      await user.click(screen.getByRole('button', { name: '編集' }))

      // 名前を変更
      const nameInput = screen.getByPlaceholderText('田中 太郎') as HTMLInputElement
      await user.clear(nameInput)
      await user.type(nameInput, '鈴木ヘルプ')
      await user.click(screen.getByRole('button', { name: '保存' }))

      expect(screen.getByText('鈴木ヘルプ')).toBeInTheDocument()
      expect(screen.queryByText('田中ヘルプ')).not.toBeInTheDocument()
    })

    it('ヘルプスタッフを削除できる', async () => {
      const user = userEvent.setup()
      localStorage.setItem(
        'd-shift:help-staff',
        JSON.stringify([
          { id: 'hs-1', name: '田中ヘルプ', availableSlots: ['morning'], availableDates: [], usesParking: false },
        ]),
      )
      renderSettings('/settings/help-staff')

      await user.click(screen.getByRole('button', { name: '削除' }))

      expect(screen.queryByText('田中ヘルプ')).not.toBeInTheDocument()
      expect(screen.getByText('ヘルプスタッフが登録されていません')).toBeInTheDocument()
    })

    it('スタッフ選択後にカレンダーで稼働可能日付を設定できる', async () => {
      const user = userEvent.setup()
      localStorage.setItem('d-shift:shift-period', SHIFT_PERIOD)
      localStorage.setItem(
        'd-shift:help-staff',
        JSON.stringify([
          { id: 'hs-1', name: '田中ヘルプ', availableSlots: ['morning'], availableDates: [], usesParking: false },
        ]),
      )
      renderSettings('/settings/help-staff')

      // 稼働日設定ボタンを押す
      await user.click(screen.getByRole('button', { name: '稼働日設定' }))

      // カレンダーが表示される
      expect(screen.getByText('2025年2月')).toBeInTheDocument()

      // 日付を選択
      await user.click(screen.getByRole('button', { name: /^3$/ }))
      await user.click(screen.getByRole('button', { name: /^5$/ }))

      // 保存
      await user.click(screen.getByRole('button', { name: '保存' }))

      // カレンダーが閉じて一覧に戻る
      const stored = JSON.parse(localStorage.getItem('d-shift:help-staff') ?? '[]')
      expect(stored[0].availableDates).toEqual(['2025-02-03', '2025-02-05'])
    })

    it('シフト期間未設定の場合は稼働日設定ボタンが表示されない', () => {
      localStorage.setItem(
        'd-shift:help-staff',
        JSON.stringify([
          { id: 'hs-1', name: '田中ヘルプ', availableSlots: ['morning'], availableDates: [], usesParking: false },
        ]),
      )
      renderSettings('/settings/help-staff')

      expect(screen.queryByRole('button', { name: '稼働日設定' })).not.toBeInTheDocument()
    })
  })
})
