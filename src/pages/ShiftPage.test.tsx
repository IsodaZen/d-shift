import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ShiftPage } from './ShiftPage'

// --- spec: shift-schedule-view / ShiftPage の自動生成機能 ---

// テスト用にスタッフとシフト期間をLocalStorageに設定するヘルパー
function setupStaff() {
  localStorage.setItem(
    'd-shift:staff',
    JSON.stringify([
      {
        id: 's1',
        name: '山田',
        maxWeeklyShifts: 5,
        availableSlots: ['morning', 'afternoon', 'evening'],
        usesParking: false,
      },
    ]),
  )
}

function setupShiftPeriod(startDate: string, endDate: string) {
  localStorage.setItem('d-shift:shift-period', JSON.stringify({ startDate, endDate }))
}

beforeEach(() => {
  localStorage.clear()
})

describe('ShiftPage', () => {
  describe('自動生成ボタン', () => {
    it('シフト作成期間が設定されている場合に「自動生成」ボタンが表示される', () => {
      // spec: 「自動生成」ボタンがシフト表のヘッダー領域に表示される
      setupStaff()
      setupShiftPeriod('2025-02-03', '2025-02-07')

      render(<ShiftPage />)

      expect(screen.getByRole('button', { name: /自動生成/ })).toBeInTheDocument()
    })

    it('シフト作成期間が未設定の場合もデフォルト期間が適用され「自動生成」ボタンが表示される', () => {
      // spec: 期間未設定時はデフォルト期間（当月16日〜翌月15日）が適用される
      setupStaff()

      render(<ShiftPage />)

      expect(screen.getByRole('button', { name: /自動生成/ })).toBeInTheDocument()
    })
  })

  describe('初期表示週', () => {
    it('シフト作成期間が設定されている場合は開始日を含む週が初期表示される', () => {
      // spec: シフト表を開くと開始週が表示される
      setupStaff()
      setupShiftPeriod('2025-02-03', '2025-02-28') // 月曜始まり

      render(<ShiftPage />)

      // 2025-02-03 週の表示（"2025年2月3日週" のラベル）
      expect(screen.getByText(/2025年2月3日週/)).toBeInTheDocument()
    })
  })

  describe('既存アサインなし → 確認なく即時生成', () => {
    it('既存アサインがない場合は確認ダイアログを表示せず即時生成される', async () => {
      // spec: 既存アサインがない場合は確認ダイアログを表示せず、直ちに自動生成が実行される
      const user = userEvent.setup()
      setupStaff()
      setupShiftPeriod('2025-02-03', '2025-02-03') // 月曜1日

      render(<ShiftPage />)
      await user.click(screen.getByRole('button', { name: /自動生成/ }))

      // 上書き確認ダイアログは表示されない
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    })
  })

  describe('自動生成後通知', () => {
    it('自動生成後に不足がある場合は不足一覧が表示される', async () => {
      // spec: 不足がある場合は不足一覧（日付・時間帯・不足人数）が表示される
      const user = userEvent.setup()
      setupStaff() // スタッフ1人 / 平日デフォルト必要人数=午前6・午後6・夜1人 → 不足発生
      setupShiftPeriod('2025-02-03', '2025-02-03')

      render(<ShiftPage />)
      await user.click(screen.getByRole('button', { name: /自動生成/ }))

      const alertDialog = screen.getByRole('alertdialog')
      expect(alertDialog).toBeInTheDocument()
      // 通知モーダル内に「不足N人」の表示があることを確認
      expect(within(alertDialog).getAllByText(/不足/).length).toBeGreaterThan(0)
    })

    it('自動生成後にすべて充足の場合はその旨が表示される', async () => {
      // spec: すべての必要人数を満たせた場合は「必要人数をすべて満たしました」旨のメッセージが表示される
      const user = userEvent.setup()
      setupStaff()
      setupShiftPeriod('2025-02-09', '2025-02-09') // 日曜（デフォルト必要人数=全時間帯0人）

      render(<ShiftPage />)
      await user.click(screen.getByRole('button', { name: /自動生成/ }))

      expect(screen.getByRole('alertdialog')).toBeInTheDocument()
      expect(screen.getByText(/すべて満たしました/)).toBeInTheDocument()
    })
  })

  describe('上書き確認ダイアログ', () => {
    it('既存アサインがある状態で自動生成ボタンを押すと確認ダイアログが表示される', async () => {
      // spec: バルクアサインが既存アサインありの状態で適用される（確認ダイアログ表示）
      const user = userEvent.setup()
      setupStaff()
      setupShiftPeriod('2025-02-03', '2025-02-07')
      // 既存アサインを仕込む
      localStorage.setItem(
        'd-shift:assignments',
        JSON.stringify([
          { id: 'a1', staffId: 's1', date: '2025-02-03', timeSlot: 'morning', parkingSpot: null },
        ]),
      )

      render(<ShiftPage />)
      await user.click(screen.getByRole('button', { name: /自動生成/ }))

      expect(screen.getByRole('dialog')).toBeInTheDocument()
    })

    it('ダイアログでキャンセルするとアサインが変わらない', async () => {
      // spec: 上書き確認ダイアログでキャンセルした場合はアサインが変わらない
      const user = userEvent.setup()
      setupStaff()
      setupShiftPeriod('2025-02-03', '2025-02-07')
      localStorage.setItem(
        'd-shift:assignments',
        JSON.stringify([
          { id: 'a1', staffId: 's1', date: '2025-02-03', timeSlot: 'morning', parkingSpot: null },
        ]),
      )

      render(<ShiftPage />)
      await user.click(screen.getByRole('button', { name: /自動生成/ }))
      await user.click(screen.getByRole('button', { name: /キャンセル/ }))

      // ダイアログが閉じてアサイン数が変わっていないことを確認
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
      const stored = JSON.parse(localStorage.getItem('d-shift:assignments') ?? '[]')
      expect(stored).toHaveLength(1)
      expect(stored[0].id).toBe('a1')
    })
  })
})
