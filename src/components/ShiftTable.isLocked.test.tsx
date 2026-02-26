import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ShiftTable } from './ShiftTable'
import type { Staff, ShiftAssignment } from '../types'

// --- spec: shift-schedule-view / 固定アサイン表示・トグル ---

const makeStaff = (id: string): Staff => ({
  id,
  name: `スタッフ${id}`,
  maxWeeklyShifts: 5,
  availableSlots: ['morning', 'afternoon', 'evening'],
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
  onSetCellLocked: noOp,
}

describe('ShiftTable / 固定インジケーター', () => {
  it('isLocked: true のアサインがあるセルに固定インジケーターが表示される', () => {
    // spec: 固定アサインがあるセルには固定されていることを示すアイコンまたはバッジを表示する
    const assignments: ShiftAssignment[] = [
      { id: 'a1', staffId: 's1', date: '2025-01-06', timeSlot: 'morning', parkingSpot: null, isLocked: true },
    ]

    render(<ShiftTable {...defaultProps} dates={['2025-01-06']} assignments={assignments} />)

    // 固定インジケーターが表示されること（鍵アイコン）
    const rows = screen.getAllByRole('row')
    const staffRow = rows.find((r) => r.textContent?.includes('スタッフs1'))
    expect(staffRow?.innerHTML).toMatch(/🔒|lock|固定/)
  })

  it('isLocked: false のアサインのみのセルには固定インジケーターが表示されない', () => {
    // spec: 固定でないアサインのセルにはインジケーターが表示されない
    const assignments: ShiftAssignment[] = [
      { id: 'a1', staffId: 's1', date: '2025-01-06', timeSlot: 'morning', parkingSpot: null, isLocked: false },
    ]

    render(<ShiftTable {...defaultProps} dates={['2025-01-06']} assignments={assignments} />)

    const rows = screen.getAllByRole('row')
    const staffRow = rows.find((r) => r.textContent?.includes('スタッフs1'))
    const cells = staffRow?.querySelectorAll('td')
    const dateCell = cells?.[1] // 日付セル

    // セル内に lock クラスや 🔒 アイコンがないこと
    expect(dateCell?.innerHTML).not.toMatch(/🔒|lock-indicator/)
  })

  it('アサインが存在しないセルには固定インジケーターが表示されない', () => {
    // spec: アサインが存在しない空白セルにはインジケーターが表示されない
    render(<ShiftTable {...defaultProps} dates={['2025-01-06']} assignments={[]} />)

    const rows = screen.getAllByRole('row')
    const staffRow = rows.find((r) => r.textContent?.includes('スタッフs1'))
    const cells = staffRow?.querySelectorAll('td')
    const dateCell = cells?.[1]

    expect(dateCell?.innerHTML).not.toMatch(/🔒|lock-indicator/)
  })

  it('固定と非固定が混在するセルにも固定インジケーターが表示される', () => {
    // spec: 固定アサインが1件以上あれば表示
    const assignments: ShiftAssignment[] = [
      { id: 'a1', staffId: 's1', date: '2025-01-06', timeSlot: 'morning', parkingSpot: null, isLocked: true },
      { id: 'a2', staffId: 's1', date: '2025-01-06', timeSlot: 'afternoon', parkingSpot: null, isLocked: false },
    ]

    render(<ShiftTable {...defaultProps} dates={['2025-01-06']} assignments={assignments} />)

    const rows = screen.getAllByRole('row')
    const staffRow = rows.find((r) => r.textContent?.includes('スタッフs1'))
    expect(staffRow?.innerHTML).toMatch(/🔒|lock|固定/)
  })
})

describe('ShiftTable / 固定トグルボタン', () => {
  it('アサインが存在するセルにトグルボタンが表示される', () => {
    // spec: アサインが存在するセルに固定/非固定を切り替えるボタンを操作できる
    const assignments: ShiftAssignment[] = [
      { id: 'a1', staffId: 's1', date: '2025-01-06', timeSlot: 'morning', parkingSpot: null, isLocked: false },
    ]

    render(<ShiftTable {...defaultProps} dates={['2025-01-06']} assignments={assignments} />)

    // トグルボタンが存在すること（aria-label で特定）
    const toggleButtons = screen.getAllByRole('button', { name: /固定|lock/i })
    expect(toggleButtons.length).toBeGreaterThan(0)
  })

  it('アサインが存在しないセルにはトグルボタンが表示されない', () => {
    // spec: アサインが存在しないセルにはトグルボタンは表示されない
    render(<ShiftTable {...defaultProps} dates={['2025-01-06']} assignments={[]} />)

    const toggleButtons = screen.queryAllByRole('button', { name: /固定|lock/i })
    expect(toggleButtons).toHaveLength(0)
  })

  it('トグルボタンを押すと onSetCellLocked が呼ばれる', async () => {
    // spec: セルの固定/非固定をシフト表からトグルできる
    const onSetCellLocked = vi.fn()
    const user = userEvent.setup()
    const assignments: ShiftAssignment[] = [
      { id: 'a1', staffId: 's1', date: '2025-01-06', timeSlot: 'morning', parkingSpot: null, isLocked: false },
    ]

    render(
      <ShiftTable
        {...defaultProps}
        dates={['2025-01-06']}
        assignments={assignments}
        onSetCellLocked={onSetCellLocked}
      />,
    )

    const toggleButton = screen.getByRole('button', { name: /固定|lock/i })
    await user.click(toggleButton)

    // 非固定セルなので isLocked: true を渡す（固定化）
    expect(onSetCellLocked).toHaveBeenCalledWith('s1', '2025-01-06', true)
  })

  it('全固定のセルのトグルボタンを押すと isLocked: false を渡す', async () => {
    // spec: 固定セルのトグルボタンを押すと非固定になる
    const onSetCellLocked = vi.fn()
    const user = userEvent.setup()
    const assignments: ShiftAssignment[] = [
      { id: 'a1', staffId: 's1', date: '2025-01-06', timeSlot: 'morning', parkingSpot: null, isLocked: true },
    ]

    render(
      <ShiftTable
        {...defaultProps}
        dates={['2025-01-06']}
        assignments={assignments}
        onSetCellLocked={onSetCellLocked}
      />,
    )

    const toggleButton = screen.getByRole('button', { name: /固定|lock/i })
    await user.click(toggleButton)

    // 全固定セルなので isLocked: false を渡す（解除）
    expect(onSetCellLocked).toHaveBeenCalledWith('s1', '2025-01-06', false)
  })
})
