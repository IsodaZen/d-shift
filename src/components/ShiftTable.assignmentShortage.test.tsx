import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { ShiftTable } from './ShiftTable'
import type { Staff, ShiftAssignment, TimeSlot } from '../types'

// --- spec: shift-schedule-view / 各日付列ヘッダーに不足インジケーター ---

const makeStaff = (id: string): Staff => ({
  id,
  name: `スタッフ${id}`,
  maxWeeklyShifts: 5,
  availableSlots: ['morning', 'afternoon', 'evening'],
  usesParking: false,
})

const makeAssignment = (staffId: string, date: string, timeSlot: TimeSlot): ShiftAssignment => ({
  id: `${staffId}-${date}-${timeSlot}`,
  staffId,
  date,
  timeSlot,
  parkingSpot: null,
})

const noOp = () => {}
const getRequiredCount = (_date: string, slot: TimeSlot) =>
  slot === 'morning' ? 2 : 0

describe('ShiftTable / 不足インジケーター', () => {
  const staff = [makeStaff('s1'), makeStaff('s2')]
  const dates = ['2025-02-03', '2025-02-04']

  it('アサイン数が必要人数を下回る日の列ヘッダーにインジケーターが表示される', () => {
    // spec: 不足がある日の列ヘッダーに不足を示すインジケーターが表示される
    // 2025-02-03: morning 必要2人, アサイン1人 → 不足
    // 2025-02-04: morning 必要2人, アサイン2人 → 充足
    const assignments = [
      makeAssignment('s1', '2025-02-03', 'morning'), // 1人だけ
      makeAssignment('s1', '2025-02-04', 'morning'),
      makeAssignment('s2', '2025-02-04', 'morning'),
    ]

    render(
      <ShiftTable
        dates={dates}
        staff={staff}
        assignments={assignments}
        dayOffs={[]}
        helpAlerts={[]}
        onAddAssignment={noOp}
        onRemoveAssignment={noOp}
        getRequiredCount={getRequiredCount}
      />,
    )

    // 2/3の列ヘッダーにインジケーターが表示される
    const headers = screen.getAllByRole('columnheader')
    const feb03Header = headers.find((h) => h.textContent?.includes('2/3'))
    expect(feb03Header?.textContent).toMatch(/[!！⚠]|不足/)

    // 2/4の列ヘッダーにはインジケーターが表示されない
    const feb04Header = headers.find((h) => h.textContent?.includes('2/4'))
    expect(feb04Header?.textContent).not.toMatch(/[!！⚠]|不足/)
  })

  it('複数の時間帯で不足がある場合、合計ではなく最大不足人数が表示される', () => {
    // spec: AM1人不足・PM1人不足の場合、合計2人ではなく最大値1人不足と表示する
    const getRequiredCountMultiple = (_date: string, slot: TimeSlot) =>
      slot === 'morning' || slot === 'afternoon' ? 2 : 0

    // 2025-02-03: morning 必要2人, アサイン1人 → 不足1
    //             afternoon 必要2人, アサイン1人 → 不足1
    // 合算すると2人不足だが、最大値は1人不足
    const assignments = [
      makeAssignment('s1', '2025-02-03', 'morning'),
      makeAssignment('s1', '2025-02-03', 'afternoon'),
    ]

    render(
      <ShiftTable
        dates={['2025-02-03']}
        staff={staff}
        assignments={assignments}
        dayOffs={[]}
        helpAlerts={[]}
        onAddAssignment={noOp}
        onRemoveAssignment={noOp}
        getRequiredCount={getRequiredCountMultiple}
      />,
    )

    const headers = screen.getAllByRole('columnheader')
    const feb03Header = headers.find((h) => h.textContent?.includes('2/3'))
    // 「不足1」が表示され、「不足2」は表示されない
    expect(feb03Header?.textContent).toMatch(/不足1/)
    expect(feb03Header?.textContent).not.toMatch(/不足2/)
  })

  it('すべての時間帯で必要人数を達成している日はインジケーターが表示されない', () => {
    // spec: すべての時間帯で必要人数を達成している日はインジケーターが表示されない
    const assignments = [
      makeAssignment('s1', '2025-02-03', 'morning'),
      makeAssignment('s2', '2025-02-03', 'morning'),
      makeAssignment('s1', '2025-02-04', 'morning'),
      makeAssignment('s2', '2025-02-04', 'morning'),
    ]

    render(
      <ShiftTable
        dates={dates}
        staff={staff}
        assignments={assignments}
        dayOffs={[]}
        helpAlerts={[]}
        onAddAssignment={noOp}
        onRemoveAssignment={noOp}
        getRequiredCount={getRequiredCount}
      />,
    )

    // 両日ともインジケーターなし
    const headers = screen.getAllByRole('columnheader')
    const feb03Header = headers.find((h) => h.textContent?.includes('2/3'))
    const feb04Header = headers.find((h) => h.textContent?.includes('2/4'))
    expect(feb03Header?.textContent).not.toMatch(/[!！⚠]|不足/)
    expect(feb04Header?.textContent).not.toMatch(/[!！⚠]|不足/)
  })
})
