import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ShiftTable } from './ShiftTable'
import type { Staff, HelpStaff, ShiftAssignment } from '../types'

// --- spec: shift-schedule-view / 土日祝の列ヘッダースタイル ---

const makeStaff = (id: string, overrides?: Partial<Staff>): Staff => ({
  id,
  name: `スタッフ${id}`,
  maxWeeklyShifts: 5,
  availableSlots: ['morning', 'afternoon', 'evening'],
  usesParking: false,
  ...overrides,
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

  it('ヘルプスタッフのアサインセルに◯が表示される', () => {
    const hs = makeHelpStaff('h1', '佐々木')
    const assignment: ShiftAssignment = {
      id: 'a1',
      staffId: 'h1',
      date: '2025-01-06',
      timeSlot: 'morning',
      parkingSpot: null,
      isLocked: false,
    }
    render(
      <ShiftTable
        {...defaultProps}
        dates={['2025-01-06']}
        helpStaff={[hs]}
        assignments={[assignment]}
      />,
    )
    // アサインがある場合に「◯」が表示されること
    const rows = screen.getAllByRole('row')
    const helpRow = rows.find((r) => r.textContent?.includes('佐々木'))
    const dateCell = helpRow?.querySelectorAll('td')[1]
    expect(dateCell?.textContent).toContain('◯')
  })

  it('ヘルプスタッフのセルをクリックするとモーダルが表示される', async () => {
    const hs = makeHelpStaff('h1', '佐々木')
    const user = userEvent.setup()
    render(<ShiftTable {...defaultProps} dates={['2025-01-06']} helpStaff={[hs]} />)

    // ヘルプスタッフ行のセルをクリック（行テキストに「佐々木」が含まれる行のtdをクリック）
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

// --- spec: shift-assignment / 通常スタッフ一括アサイン ---

describe('ShiftTable / 通常スタッフセルクリック一括アサイン', () => {
  it('アサインなしセルをクリックするとavailableSlotsの全時間帯がonAddAssignmentで呼ばれる', async () => {
    const s = makeStaff('s1', { availableSlots: ['morning', 'afternoon'] })
    const onAddAssignment = vi.fn()
    const user = userEvent.setup()
    render(
      <ShiftTable
        {...defaultProps}
        dates={['2025-01-06']}
        staff={[s]}
        onAddAssignment={onAddAssignment}
      />,
    )

    const rows = screen.getAllByRole('row')
    const staffRow = rows.find((r) => r.textContent?.includes('スタッフs1'))
    const dateCells = staffRow?.querySelectorAll('td')
    const dateCell = dateCells?.[1]
    await user.click(dateCell!)

    // availableSlots の 2 時間帯 (morning, afternoon) 分呼ばれること
    expect(onAddAssignment).toHaveBeenCalledTimes(2)
    expect(onAddAssignment).toHaveBeenCalledWith('s1', '2025-01-06', 'morning', false)
    expect(onAddAssignment).toHaveBeenCalledWith('s1', '2025-01-06', 'afternoon', false)
  })

  it('availableSlotsが空のスタッフのセルをクリックすると全時間帯がonAddAssignmentで呼ばれる', async () => {
    const s = makeStaff('s1', { availableSlots: [] })
    const onAddAssignment = vi.fn()
    const user = userEvent.setup()
    render(
      <ShiftTable
        {...defaultProps}
        dates={['2025-01-06']}
        staff={[s]}
        onAddAssignment={onAddAssignment}
      />,
    )

    const rows = screen.getAllByRole('row')
    const staffRow = rows.find((r) => r.textContent?.includes('スタッフs1'))
    const dateCells = staffRow?.querySelectorAll('td')
    const dateCell = dateCells?.[1]
    await user.click(dateCell!)

    // 全3時間帯 (morning, afternoon, evening) 分呼ばれること
    expect(onAddAssignment).toHaveBeenCalledTimes(3)
    expect(onAddAssignment).toHaveBeenCalledWith('s1', '2025-01-06', 'morning', false)
    expect(onAddAssignment).toHaveBeenCalledWith('s1', '2025-01-06', 'afternoon', false)
    expect(onAddAssignment).toHaveBeenCalledWith('s1', '2025-01-06', 'evening', false)
  })

  it('アサインありセルをクリックするとonRemoveAssignmentが全アサイン分呼ばれる', async () => {
    const s = makeStaff('s1')
    const onRemoveAssignment = vi.fn()
    const user = userEvent.setup()
    const assignments: ShiftAssignment[] = [
      { id: 'a1', staffId: 's1', date: '2025-01-06', timeSlot: 'morning', parkingSpot: null, isLocked: false },
      { id: 'a2', staffId: 's1', date: '2025-01-06', timeSlot: 'afternoon', parkingSpot: null, isLocked: false },
    ]
    render(
      <ShiftTable
        {...defaultProps}
        dates={['2025-01-06']}
        staff={[s]}
        assignments={assignments}
        onRemoveAssignment={onRemoveAssignment}
      />,
    )

    const rows = screen.getAllByRole('row')
    const staffRow = rows.find((r) => r.textContent?.includes('スタッフs1'))
    const dateCells = staffRow?.querySelectorAll('td')
    const dateCell = dateCells?.[1]
    await user.click(dateCell!)

    // 全アサイン (morning, afternoon) 分 onRemoveAssignment が呼ばれること
    expect(onRemoveAssignment).toHaveBeenCalledTimes(2)
    expect(onRemoveAssignment).toHaveBeenCalledWith('s1', '2025-01-06', 'morning')
    expect(onRemoveAssignment).toHaveBeenCalledWith('s1', '2025-01-06', 'afternoon')
  })

  // --- spec: shift-assignment / 週上限チェック（ブロック） ---

  it('週上限に達している場合にアサインがブロックされてonAddAssignmentが呼ばれない', async () => {
    // maxWeeklyShifts=2, 既に2日分のアサインがある（月・火）
    const s = makeStaff('s1', { maxWeeklyShifts: 2, availableSlots: ['morning'] })
    const onAddAssignment = vi.fn()
    const user = userEvent.setup()
    const assignments: ShiftAssignment[] = [
      { id: 'a1', staffId: 's1', date: '2025-01-06', timeSlot: 'morning', parkingSpot: null, isLocked: false },
      { id: 'a2', staffId: 's1', date: '2025-01-07', timeSlot: 'morning', parkingSpot: null, isLocked: false },
    ]
    render(
      <ShiftTable
        {...defaultProps}
        dates={['2025-01-08']}
        staff={[s]}
        assignments={assignments}
        onAddAssignment={onAddAssignment}
      />,
    )

    const rows = screen.getAllByRole('row')
    const staffRow = rows.find((r) => r.textContent?.includes('スタッフs1'))
    const dateCells = staffRow?.querySelectorAll('td')
    const dateCell = dateCells?.[1]
    await user.click(dateCell!)

    // ブロックされるのでonAddAssignmentは呼ばれない
    expect(onAddAssignment).not.toHaveBeenCalled()
    // 警告トーストが表示される
    expect(screen.getByText(/週.*上限|上限.*週/)).toBeTruthy()
  })

  it('週上限未満の場合はアサインが保存される', async () => {
    const s = makeStaff('s1', { maxWeeklyShifts: 3, availableSlots: ['morning'] })
    const onAddAssignment = vi.fn()
    const user = userEvent.setup()
    const assignments: ShiftAssignment[] = [
      { id: 'a1', staffId: 's1', date: '2025-01-06', timeSlot: 'morning', parkingSpot: null, isLocked: false },
    ]
    render(
      <ShiftTable
        {...defaultProps}
        dates={['2025-01-08']}
        staff={[s]}
        assignments={assignments}
        onAddAssignment={onAddAssignment}
      />,
    )

    const rows = screen.getAllByRole('row')
    const staffRow = rows.find((r) => r.textContent?.includes('スタッフs1'))
    const dateCells = staffRow?.querySelectorAll('td')
    const dateCell = dateCells?.[1]
    await user.click(dateCell!)

    // 上限未満なのでアサインが保存される
    expect(onAddAssignment).toHaveBeenCalledWith('s1', '2025-01-08', 'morning', false)
  })

  // --- spec: shift-assignment / 出勤不可時間帯警告 ---

  it('出勤不可時間帯を含む一括アサイン時に警告トーストが表示される', async () => {
    // availableSlots: ['morning'] のみ → 'afternoon', 'evening' は出勤不可
    const s = makeStaff('s1', { availableSlots: ['morning'] })
    const onAddAssignment = vi.fn()
    const user = userEvent.setup()
    render(
      <ShiftTable
        {...defaultProps}
        dates={['2025-01-06']}
        staff={[s]}
        onAddAssignment={onAddAssignment}
      />,
    )

    const rows = screen.getAllByRole('row')
    const staffRow = rows.find((r) => r.textContent?.includes('スタッフs1'))
    const dateCells = staffRow?.querySelectorAll('td')
    const dateCell = dateCells?.[1]
    await user.click(dateCell!)

    // アサイン自体は保存される（availableSlots の morning 分）
    expect(onAddAssignment).toHaveBeenCalled()
    // 警告トーストが表示される
    expect(screen.getByText(/出勤不可/)).toBeTruthy()
  })

  it('出勤不可時間帯を含む場合もアサイン自体は保存される', async () => {
    const s = makeStaff('s1', { availableSlots: ['morning'] })
    const onAddAssignment = vi.fn()
    const user = userEvent.setup()
    render(
      <ShiftTable
        {...defaultProps}
        dates={['2025-01-06']}
        staff={[s]}
        onAddAssignment={onAddAssignment}
      />,
    )

    const rows = screen.getAllByRole('row')
    const staffRow = rows.find((r) => r.textContent?.includes('スタッフs1'))
    const dateCells = staffRow?.querySelectorAll('td')
    const dateCell = dateCells?.[1]
    await user.click(dateCell!)

    // availableSlots の morning のみアサインされる
    expect(onAddAssignment).toHaveBeenCalledWith('s1', '2025-01-06', 'morning', false)
  })
})

// --- spec: shift-schedule-view / スタッフ名列にアサイン可能時間帯を表示 ---

describe('ShiftTable / スタッフ名列へのアサイン可能時間帯表示', () => {
  it('通常スタッフの名前列にavailableSlotsのラベルが表示される', () => {
    const s = makeStaff('s1', { availableSlots: ['morning', 'afternoon'] })
    render(<ShiftTable {...defaultProps} dates={['2025-01-06']} staff={[s]} />)

    const rows = screen.getAllByRole('row')
    const staffRow = rows.find((r) => r.textContent?.includes('スタッフs1'))
    const nameCell = staffRow?.querySelectorAll('td')[0]
    expect(nameCell?.textContent).toContain('午前')
    expect(nameCell?.textContent).toContain('午後')
  })

  it('availableSlotsが空の場合は全時間帯ラベルが表示される', () => {
    const s = makeStaff('s1', { availableSlots: [] })
    render(<ShiftTable {...defaultProps} dates={['2025-01-06']} staff={[s]} />)

    const rows = screen.getAllByRole('row')
    const staffRow = rows.find((r) => r.textContent?.includes('スタッフs1'))
    const nameCell = staffRow?.querySelectorAll('td')[0]
    expect(nameCell?.textContent).toContain('午前')
    expect(nameCell?.textContent).toContain('午後')
    expect(nameCell?.textContent).toContain('夕方')
  })

  it('ヘルプスタッフの名前列にavailableSlotsのラベルが表示される', () => {
    const hs = makeHelpStaff('h1', '佐々木')
    // makeHelpStaff は availableSlots: ['morning', 'afternoon'] で作成される
    render(<ShiftTable {...defaultProps} dates={['2025-01-06']} helpStaff={[hs]} />)

    const rows = screen.getAllByRole('row')
    const helpRow = rows.find((r) => r.textContent?.includes('佐々木'))
    const nameCell = helpRow?.querySelectorAll('td')[0]
    expect(nameCell?.textContent).toContain('午前')
    expect(nameCell?.textContent).toContain('午後')
  })
})

// --- spec: shift-schedule-view / アサイン有無を◯で表示 ---

describe('ShiftTable / アサインセルの◯表示', () => {
  it('アサインありセルに◯が表示される（通常スタッフ）', () => {
    const s = makeStaff('s1')
    const assignment: ShiftAssignment = {
      id: 'a1',
      staffId: 's1',
      date: '2025-01-06',
      timeSlot: 'morning',
      parkingSpot: null,
      isLocked: false,
    }
    render(
      <ShiftTable
        {...defaultProps}
        dates={['2025-01-06']}
        staff={[s]}
        assignments={[assignment]}
      />,
    )

    const rows = screen.getAllByRole('row')
    const staffRow = rows.find((r) => r.textContent?.includes('スタッフs1'))
    const dateCell = staffRow?.querySelectorAll('td')[1]
    expect(dateCell?.textContent).toContain('◯')
  })

  it('アサインがないセルには◯が表示されない', () => {
    const s = makeStaff('s1')
    render(
      <ShiftTable
        {...defaultProps}
        dates={['2025-01-06']}
        staff={[s]}
        assignments={[]}
      />,
    )

    const rows = screen.getAllByRole('row')
    const staffRow = rows.find((r) => r.textContent?.includes('スタッフs1'))
    const dateCell = staffRow?.querySelectorAll('td')[1]
    expect(dateCell?.textContent).not.toContain('◯')
  })
})
