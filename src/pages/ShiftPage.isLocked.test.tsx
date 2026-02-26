import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ShiftPage } from './ShiftPage'

// --- spec: auto-shift-generation / 固定アサインスキップ（呼び出し側） ---

function setupStaff() {
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
      {
        id: 's2',
        name: '鈴木',
        maxWeeklyShifts: 5,
        availableSlots: ['morning'],
        usesParking: false,
      },
    ]),
  )
}

function setupShiftPeriod(startDate: string, endDate: string) {
  localStorage.setItem('d-shift:shift-period', JSON.stringify({ startDate, endDate }))
}

describe('ShiftPage / 自動生成での固定アサイン保護', () => {
  it('固定アサインが存在するスタッフ・日付には自動生成で新しいアサインが追加されない', async () => {
    // spec: 上書き実行時に固定アサインは保持される
    const user = userEvent.setup()
    setupStaff()
    setupShiftPeriod('2025-02-03', '2025-02-03') // 月曜1日のみ

    // s1 の 2025-02-03/morning が固定済み
    localStorage.setItem(
      'd-shift:assignments',
      JSON.stringify([
        { id: 'locked-1', staffId: 's1', date: '2025-02-03', timeSlot: 'morning', parkingSpot: null, isLocked: true },
      ]),
    )

    render(<ShiftPage />)

    // 自動生成ボタンを押す（既存アサインがあるので確認ダイアログが出る）
    await user.click(screen.getByRole('button', { name: /自動生成/ }))
    await user.click(screen.getByRole('button', { name: /上書きして生成/ }))

    // LocalStorageのアサインを確認
    const stored: Array<{ staffId: string; date: string; isLocked: boolean }> = JSON.parse(
      localStorage.getItem('d-shift:assignments') ?? '[]',
    )

    // s1 の固定アサインが保持されている
    expect(stored.some((a) => a.staffId === 's1' && a.date === '2025-02-03' && a.isLocked)).toBe(true)
  })
})
