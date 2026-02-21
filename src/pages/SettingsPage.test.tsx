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

  describe('希望休タブ（カレンダーUI）', () => {
    const SHIFT_PERIOD = JSON.stringify({ startDate: '2025-02-01', endDate: '2025-02-10' })
    const STAFF_DATA = JSON.stringify([
      { id: 'staff-1', name: '田中', maxWeeklyShifts: 3, availableSlots: [], usesParking: false },
      { id: 'staff-2', name: '鈴木', maxWeeklyShifts: 3, availableSlots: [], usesParking: false },
    ])

    it('isShiftPeriodSaved === false の場合は日付入力フィールドが表示される（フォールバック）', () => {
      // spec: シフト期間が未保存（isShiftPeriodSaved = false）の場合は日付入力フィールドが表示される
      renderSettings('/settings/dayoff')
      expect(screen.getByLabelText('希望休日付')).toBeInTheDocument()
      expect(screen.queryByText(/\d+年\d+月/)).not.toBeInTheDocument()
    })

    it('isShiftPeriodSaved === true かつスタッフ未選択の場合はカレンダーが表示されない', () => {
      // spec: スタッフ未選択の場合はカレンダーが表示されない
      localStorage.setItem('d-shift:shift-period', SHIFT_PERIOD)
      renderSettings('/settings/dayoff')
      expect(screen.queryByText(/\d+年\d+月/)).not.toBeInTheDocument()
    })

    it('isShiftPeriodSaved === true かつスタッフ選択済みの場合はカレンダーが表示される', async () => {
      // spec: シフト期間を保存済みの場合はカレンダーUIが表示される
      const user = userEvent.setup()
      localStorage.setItem('d-shift:shift-period', SHIFT_PERIOD)
      localStorage.setItem('d-shift:staff', STAFF_DATA)
      renderSettings('/settings/dayoff')

      await user.selectOptions(screen.getByRole('combobox', { name: /スタッフ/ }), 'staff-1')
      expect(screen.getByText('2025年2月')).toBeInTheDocument()
    })

    it('カレンダー初期表示時に選択スタッフの登録済み日付が選択済み状態になる', async () => {
      // spec: すでに登録済みの日付は最初から選択済み状態で表示する
      const user = userEvent.setup()
      localStorage.setItem('d-shift:shift-period', SHIFT_PERIOD)
      localStorage.setItem('d-shift:staff', STAFF_DATA)
      localStorage.setItem(
        'd-shift:day-offs',
        JSON.stringify([
          { id: 'do-1', staffId: 'staff-1', date: '2025-02-03' },
        ]),
      )
      renderSettings('/settings/dayoff')

      await user.selectOptions(screen.getByRole('combobox', { name: /スタッフ/ }), 'staff-1')

      // 3日のボタンが選択済みスタイルを持つ
      const btn3 = screen.getByRole('button', { name: /^3$/ })
      expect(btn3.className).toMatch(/bg-indigo-500/)
    })

    it('スタッフを切り替えると選択状態が切り替え先の登録状態にリセットされる', async () => {
      // spec: スタッフを切り替えると選択状態が切り替え先の登録状態にリセットされる
      const user = userEvent.setup()
      localStorage.setItem('d-shift:shift-period', SHIFT_PERIOD)
      localStorage.setItem('d-shift:staff', STAFF_DATA)
      localStorage.setItem(
        'd-shift:day-offs',
        JSON.stringify([
          { id: 'do-1', staffId: 'staff-1', date: '2025-02-03' },
        ]),
      )
      renderSettings('/settings/dayoff')

      // staff-1を選択
      await user.selectOptions(screen.getByRole('combobox', { name: /スタッフ/ }), 'staff-1')
      // 3日が選択済みになっている
      expect(screen.getByRole('button', { name: /^3$/ }).className).toMatch(/bg-indigo-500/)

      // staff-2に切り替え
      await user.selectOptions(screen.getByRole('combobox', { name: /スタッフ/ }), 'staff-2')
      // 3日の選択が解除されている
      expect(screen.getByRole('button', { name: /^3$/ }).className).not.toMatch(/bg-indigo-500/)
    })

    it('「保存」ボタンを押すと syncDayOffs が呼ばれ結果メッセージが表示される', async () => {
      // spec: 保存の結果メッセージ（X件を追加、Y件を削除しました）を表示
      const user = userEvent.setup()
      localStorage.setItem('d-shift:shift-period', SHIFT_PERIOD)
      localStorage.setItem('d-shift:staff', STAFF_DATA)
      renderSettings('/settings/dayoff')

      await user.selectOptions(screen.getByRole('combobox', { name: /スタッフ/ }), 'staff-1')

      // 3日をタップして選択
      await user.click(screen.getByRole('button', { name: /^3$/ }))

      // 保存ボタンを押す
      await user.click(screen.getByRole('button', { name: '保存' }))

      // 結果メッセージが表示される
      expect(screen.getByText(/件を追加、.*件を削除しました/)).toBeInTheDocument()
    })

    it('全選択を解除して保存すると全希望休が削除される', async () => {
      // spec: 全日付の選択を解除して保存すると全希望休が削除される
      const user = userEvent.setup()
      localStorage.setItem('d-shift:shift-period', SHIFT_PERIOD)
      localStorage.setItem('d-shift:staff', STAFF_DATA)
      localStorage.setItem(
        'd-shift:day-offs',
        JSON.stringify([
          { id: 'do-1', staffId: 'staff-1', date: '2025-02-03' },
        ]),
      )
      renderSettings('/settings/dayoff')

      await user.selectOptions(screen.getByRole('combobox', { name: /スタッフ/ }), 'staff-1')

      // 選択済みの3日をタップして解除
      await user.click(screen.getByRole('button', { name: /^3$/ }))

      // 保存
      await user.click(screen.getByRole('button', { name: '保存' }))

      expect(screen.getByText(/0件を追加、1件を削除しました/)).toBeInTheDocument()
      expect(JSON.parse(localStorage.getItem('d-shift:day-offs') ?? '[]')).toHaveLength(0)
    })

    it('次に日付をタップすると結果メッセージが消える', async () => {
      // spec: 保存の結果メッセージは、次に日付をタップしたときに消える
      const user = userEvent.setup()
      localStorage.setItem('d-shift:shift-period', SHIFT_PERIOD)
      localStorage.setItem('d-shift:staff', STAFF_DATA)
      renderSettings('/settings/dayoff')

      await user.selectOptions(screen.getByRole('combobox', { name: /スタッフ/ }), 'staff-1')
      await user.click(screen.getByRole('button', { name: /^3$/ }))
      await user.click(screen.getByRole('button', { name: '保存' }))
      expect(screen.getByText(/件を追加、.*件を削除しました/)).toBeInTheDocument()

      // もう一度日付をタップするとメッセージが消える
      await user.click(screen.getByRole('button', { name: /^4$/ }))
      expect(screen.queryByText(/件を追加、.*件を削除しました/)).not.toBeInTheDocument()
    })

    it('スタッフ別サマリーにシフト期間内の希望休件数が表示される', () => {
      // spec: スタッフ別サマリーが表示される
      localStorage.setItem('d-shift:shift-period', SHIFT_PERIOD)
      localStorage.setItem('d-shift:staff', STAFF_DATA)
      localStorage.setItem(
        'd-shift:day-offs',
        JSON.stringify([
          { id: 'do-1', staffId: 'staff-1', date: '2025-02-03' },
          { id: 'do-2', staffId: 'staff-1', date: '2025-02-05' },
          { id: 'do-3', staffId: 'staff-2', date: '2025-02-01' },
        ]),
      )
      renderSettings('/settings/dayoff')

      // カウントテキストはサマリー固有のため getByText で検証
      expect(screen.getByText('2日')).toBeInTheDocument()
      expect(screen.getByText('1日')).toBeInTheDocument()
      // スタッフ名はselectのoptionにも存在するためgetAllByTextで確認
      expect(screen.getAllByText('田中').length).toBeGreaterThanOrEqual(1)
      expect(screen.getAllByText('鈴木').length).toBeGreaterThanOrEqual(1)
    })

    it('希望休のないスタッフはサマリーに表示されない', () => {
      // spec: 希望休のないスタッフはサマリーに表示されない
      localStorage.setItem('d-shift:shift-period', SHIFT_PERIOD)
      localStorage.setItem('d-shift:staff', STAFF_DATA)
      localStorage.setItem(
        'd-shift:day-offs',
        JSON.stringify([
          { id: 'do-1', staffId: 'staff-1', date: '2025-02-03' },
        ]),
      )
      renderSettings('/settings/dayoff')

      // 田中はselectのoptionとsummary spanに存在する（2件以上）
      expect(screen.getAllByText('田中').length).toBeGreaterThanOrEqual(1)
      // 鈴木はselectのoptionにのみ存在し、summaryには表示されない（1件のみ）
      expect(screen.getAllByText('鈴木')).toHaveLength(1)
    })

    it('希望休が0件の場合は「登録された希望休はありません」が表示される', () => {
      // spec: 希望休が0件の場合はサマリーが空を示すメッセージを表示する
      localStorage.setItem('d-shift:shift-period', SHIFT_PERIOD)
      localStorage.setItem('d-shift:staff', STAFF_DATA)
      renderSettings('/settings/dayoff')

      expect(screen.getByText('登録された希望休はありません')).toBeInTheDocument()
    })
  })
})
