import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
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

    it('シフト作成期間が未設定の場合は「自動生成」ボタンが表示されない', () => {
      // spec: shiftPeriod が null の場合は非表示
      setupStaff()

      render(<ShiftPage />)

      expect(screen.queryByRole('button', { name: /自動生成/ })).not.toBeInTheDocument()
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
