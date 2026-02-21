import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { ShiftTable } from './ShiftTable'
import type { Staff } from '../types'

// --- spec: shift-schedule-view / 土日祝の列ヘッダースタイル ---

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
