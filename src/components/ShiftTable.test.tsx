import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ShiftTable } from './ShiftTable'
import type { Staff, HelpStaff, ShiftAssignment } from '../types'

// --- spec: shift-schedule-view / 土日祝の列ヘッダースタイル ---

const makeStaff = (id: string): Staff => ({
  id,
  name: `スタッフ${id}`,
  maxWeeklyShifts: 5,
  availableSlots: ['morning', 'afternoon', 'evening'],
  usesParking: false,
})

const makeHelpStaff = (id: string, name?: string): HelpStaff => ({
  id,
  name: name ?? `ヘルプ${id}`,
  availableSlots: ['morning', 'afternoon'],
  availableDates: ['2025-01-06'],
  usesParking: false,
})

const noOp = () => {}

const defaultProps = {
  staff: [makeStaff('s1')],
  assignments: [],
  dayOffs: [],
  helpAlerts: [],
  helpStaff: [],
  onAddAssignment: noOp,
  onRemoveAssignment: noOp,
}

describe('ShiftTable / 土日祝の列ヘッダースタイル', () => {
  it('土曜日（祝日でない）の列ヘッダーに blue 系クラスが付与されている', () => {
    // 2025-01-04は土曜、祝日でない
    render(<ShiftTable {...defaultProps} dates={['2025-01-04']} />)
    const headers = screen.getAllByRole('columnheader')
    const satHeader = headers.find((h) => h.textContent?.includes('1/4'))
    expect(satHeader?.className).toMatch(/blue/)
  })

  it('日曜日の列ヘッダーに red 系クラスが付与されている', () => {
    // 2025-01-05は日曜
    render(<ShiftTable {...defaultProps} dates={['2025-01-05']} />)
    const headers = screen.getAllByRole('columnheader')
    const sunHeader = headers.find((h) => h.textContent?.includes('1/5'))
    expect(sunHeader?.className).toMatch(/red/)
  })

  it('祝日（平日）の列ヘッダーに red 系クラスが付与されている', () => {
    // 2025-01-01は元日（水曜）
    render(<ShiftTable {...defaultProps} dates={['2025-01-01']} />)
    const headers = screen.getAllByRole('columnheader')
    const holHeader = headers.find((h) => h.textContent?.includes('1/1'))
    expect(holHeader?.className).toMatch(/red/)
  })

  it('祝日かつ土曜日の列ヘッダーに red 系クラスが付与されている（blue ではない）', () => {
    // 2019-11-23は勤労感謝の日（土曜）
    render(<ShiftTable {...defaultProps} dates={['2019-11-23']} />)
    const headers = screen.getAllByRole('columnheader')
    const holSatHeader = headers.find((h) => h.textContent?.includes('11/23'))
    expect(holSatHeader?.className).toMatch(/red/)
    expect(holSatHeader?.className).not.toMatch(/blue/)
  })

  it('平日の列ヘッダーには blue/red 系クラスが付与されていない', () => {
    // 2025-01-06は月曜、祝日でない
    render(<ShiftTable {...defaultProps} dates={['2025-01-06']} />)
    const headers = screen.getAllByRole('columnheader')
    const wdHeader = headers.find((h) => h.textContent?.includes('1/6'))
    expect(wdHeader?.className).not.toMatch(/blue/)
    expect(wdHeader?.className).not.toMatch(/red/)
  })
})

// --- spec: shift-schedule-view (add-staff-availability delta) / ヘルプスタッフのシフト表表示 ---

describe('ShiftTable / ヘルプスタッフのシフト表表示', () => {
  it('helpStaff が空の場合はヘルプスタッフセクション区切りが表示されない', () => {
    render(<ShiftTable {...defaultProps} dates={['2025-01-06']} helpStaff={[]} />)
    expect(screen.queryByText('ヘルプスタッフ')).toBeNull()
  })

  it('helpStaff が1件以上の場合はヘルプスタッフセクション区切りが表示される', () => {
    const hs = makeHelpStaff('h1', '佐々木')
    render(<ShiftTable {...defaultProps} dates={['2025-01-06']} helpStaff={[hs]} />)
    expect(screen.getByText('ヘルプスタッフ')).toBeTruthy()
  })

  it('ヘルプスタッフの氏名が行に表示される', () => {
    const hs = makeHelpStaff('h1', '佐々木')
    render(<ShiftTable {...defaultProps} dates={['2025-01-06']} helpStaff={[hs]} />)
    expect(screen.getByText('佐々木')).toBeTruthy()
  })

  it('ヘルプスタッフのアサインバッジが表示される', () => {
    const hs = makeHelpStaff('h1', '佐々木')
    const assignment: ShiftAssignment = {
      staffId: 'h1',
      date: '2025-01-06',
      timeSlot: 'morning',
      parkingSpot: null,
    }
    render(
      <ShiftTable
        {...defaultProps}
        dates={['2025-01-06']}
        helpStaff={[hs]}
        assignments={[assignment]}
      />,
    )
    // 「午前」バッジが表示されていること
    expect(screen.getAllByText('午前').length).toBeGreaterThan(0)
  })

  it('ヘルプスタッフのセルをクリックするとモーダルが表示される', async () => {
    const hs = makeHelpStaff('h1', '佐々木')
    const user = userEvent.setup()
    render(<ShiftTable {...defaultProps} dates={['2025-01-06']} helpStaff={[hs]} />)

    // ヘルプスタッフ行のセルをクリック（行テキストに「佐々木」が含まれる行のtdをクリック）
    const cells = screen.getAllByRole('cell')
    // 「佐々木」を含む行のボディセル（スタッフ名セル以外）を探す
    const staffNameCell = cells.find((c) => c.textContent === '佐々木')
    // 次の隣のセル（日付セル）をクリック
    // テーブル構造から佐々木の行の日付セルを特定
    const rows = screen.getAllByRole('row')
    const helpRow = rows.find((r) => r.textContent?.includes('佐々木'))
    const dateCells = helpRow?.querySelectorAll('td')
    // 2番目のtd（日付列）をクリック
    const dateCell = dateCells?.[1]
    expect(dateCell).toBeTruthy()
    await user.click(dateCell!)

    // モーダルに「佐々木」と日付が表示される（モーダルはp要素で表示）
    expect(screen.getAllByText('佐々木').length).toBeGreaterThan(1)
    // 時間帯選択ボタンが表示される
    expect(screen.getAllByRole('button').length).toBeGreaterThan(0)
  })

  it('ヘルプスタッフのセル操作でonAddAssignmentが呼ばれる', async () => {
    const hs = makeHelpStaff('h1', '佐々木')
    const onAddAssignment = vi.fn()
    const user = userEvent.setup()
    render(
      <ShiftTable
        {...defaultProps}
        dates={['2025-01-06']}
        helpStaff={[hs]}
        onAddAssignment={onAddAssignment}
      />,
    )

    const rows = screen.getAllByRole('row')
    const helpRow = rows.find((r) => r.textContent?.includes('佐々木'))
    const dateCells = helpRow?.querySelectorAll('td')
    const dateCell = dateCells?.[1]
    await user.click(dateCell!)

    // モーダルで「午前」ボタンをクリック
    const morningButton = screen.getByRole('button', { name: /午前/ })
    await user.click(morningButton)
    expect(onAddAssignment).toHaveBeenCalledWith('h1', '2025-01-06', 'morning', false)
  })
})
