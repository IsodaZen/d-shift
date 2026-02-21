import { describe, it, expect } from 'vitest'
import { assignParking, getWeeklyAssignmentCount, isAvailableSlot } from './shiftUtils'
import type { ShiftAssignment, Staff } from '../types'

// --- テスト用ヘルパー ---

const makeAssignment = (
  overrides: Partial<ShiftAssignment> & { staffId: string; date: string },
): ShiftAssignment => ({
  id: 'test-id',
  timeSlot: 'morning',
  parkingSpot: null,
  ...overrides,
})

const makeStaff = (overrides: Partial<Staff> = {}): Staff => ({
  id: 'staff-1',
  name: '山田 花子',
  maxWeeklyShifts: 3,
  availableSlots: ['morning', 'afternoon'],
  usesParking: false,
  ...overrides,
})

// --- spec: shift-assignment / 駐車場自動割り当て ---

describe('assignParking', () => {
  const allSpots = ['A1', 'A2', 'A3', 'A4', 'B1']

  it('駐車場枠が空いている場合、A優先で最初の空き枠を返す', () => {
    // spec: 駐車場枠が空いている場合に自動割り当てされる
    const result = assignParking('2025-01-06', 'morning', allSpots, [])
    expect(result).toBe('A1')
  })

  it('A1が使用済みの場合、A2を返す', () => {
    const existing = [makeAssignment({ staffId: 's1', date: '2025-01-06', parkingSpot: 'A1' })]
    const result = assignParking('2025-01-06', 'morning', allSpots, existing)
    expect(result).toBe('A2')
  })

  it('A枠がすべて埋まっている場合、B1を返す', () => {
    const existing = ['A1', 'A2', 'A3', 'A4'].map((spot, i) =>
      makeAssignment({ staffId: `s${i}`, date: '2025-01-06', parkingSpot: spot }),
    )
    const result = assignParking('2025-01-06', 'morning', allSpots, existing)
    expect(result).toBe('B1')
  })

  it('全枠が満杯の場合、nullを返す', () => {
    // spec: 駐車場枠が満杯の場合は割り当てなしになる
    const existing = ['A1', 'A2', 'A3', 'A4', 'B1'].map((spot, i) =>
      makeAssignment({ staffId: `s${i}`, date: '2025-01-06', parkingSpot: spot }),
    )
    const result = assignParking('2025-01-06', 'morning', allSpots, existing)
    expect(result).toBeNull()
  })

  it('別の日の使用済み枠は考慮しない', () => {
    // 別日にA1が使われていても、対象日は空き
    const existing = [makeAssignment({ staffId: 's1', date: '2025-01-07', parkingSpot: 'A1' })]
    const result = assignParking('2025-01-06', 'morning', allSpots, existing)
    expect(result).toBe('A1')
  })

  it('parkingSpotがnullのアサインは使用済みとしてカウントしない', () => {
    const existing = [makeAssignment({ staffId: 's1', date: '2025-01-06', parkingSpot: null })]
    const result = assignParking('2025-01-06', 'morning', allSpots, existing)
    expect(result).toBe('A1')
  })

  it('同一スタッフが同一日に複数時間帯でアサイン済みの場合、既存の枠を返す', () => {
    // spec: 同一スタッフが同一日に複数時間帯でアサインされる場合は既存枠を再利用する
    const existing = [
      makeAssignment({ staffId: 's1', date: '2025-01-06', timeSlot: 'morning', parkingSpot: 'A1' }),
    ]
    const result = assignParking('2025-01-06', 'afternoon', allSpots, existing, 's1')
    expect(result).toBe('A1')
  })

  it('同一スタッフでも別の日のアサインは再利用しない', () => {
    const existing = [
      makeAssignment({ staffId: 's1', date: '2025-01-07', timeSlot: 'morning', parkingSpot: 'A1' }),
    ]
    const result = assignParking('2025-01-06', 'morning', allSpots, existing, 's1')
    expect(result).toBe('A1') // 別日なので新規割り当て
  })

  it('同一スタッフのparkingSpotがnullの場合は再利用せず新規割り当てする', () => {
    const existing = [
      makeAssignment({ staffId: 's1', date: '2025-01-06', timeSlot: 'morning', parkingSpot: null }),
    ]
    const result = assignParking('2025-01-06', 'morning', allSpots, existing, 's1')
    expect(result).toBe('A1') // nullは再利用対象外
  })
})

// --- spec: shift-assignment / 駐車場自動割り当て（時間帯ベース共有） ---

describe('assignParking（時間帯ベース共有）', () => {
  const allSpots = ['A1', 'A2', 'A3', 'A4', 'B1']

  it('AMのみのスタッフがA1を使用している状態で、PMのみのスタッフがA1を取得できる', () => {
    // spec: AMのみのスタッフとPMのみのスタッフが同一枠を共有できる
    const existing = [
      makeAssignment({ staffId: 's1', date: '2025-01-06', timeSlot: 'morning', parkingSpot: 'A1' }),
    ]
    const result = assignParking('2025-01-06', 'afternoon', allSpots, existing)
    expect(result).toBe('A1')
  })

  it('同一時間帯に別スタッフがA1を使用している場合、A2が割り当てられる', () => {
    // spec: 同一時間帯にすでに枠が使用されている場合は別の枠が割り当てられる
    const existing = [
      makeAssignment({ staffId: 's1', date: '2025-01-06', timeSlot: 'morning', parkingSpot: 'A1' }),
    ]
    const result = assignParking('2025-01-06', 'morning', allSpots, existing)
    expect(result).toBe('A2')
  })

  it('同一スタッフが同一日のAM・PM両方に出勤する場合、PM時も同じスロットを再利用する', () => {
    // spec: 同一スタッフが同一日に複数時間帯でアサインされる場合は既存枠を再利用する
    // PMにA1が別スタッフで使用中でも、同一スタッフ優先で再利用される
    const existing = [
      makeAssignment({ staffId: 's1', date: '2025-01-06', timeSlot: 'morning', parkingSpot: 'A1' }),
      makeAssignment({ staffId: 's2', date: '2025-01-06', timeSlot: 'afternoon', parkingSpot: 'A1' }),
    ]
    const result = assignParking('2025-01-06', 'afternoon', allSpots, existing, 's1')
    expect(result).toBe('A1')
  })

  it('全スロットが同一時間帯に埋まっている場合はnullを返す', () => {
    // spec: 同一時間帯の全枠が満杯の場合は割り当てなしになる
    const existing = ['A1', 'A2', 'A3', 'A4', 'B1'].map((spot, i) =>
      makeAssignment({ staffId: `s${i}`, date: '2025-01-06', timeSlot: 'morning', parkingSpot: spot }),
    )
    const result = assignParking('2025-01-06', 'morning', allSpots, existing)
    expect(result).toBeNull()
  })

  it('夕方のスタッフと午前のスタッフが同一枠を共有できる', () => {
    // spec: 夕方のスタッフと午前のスタッフが同一枠を共有できる
    const existing = [
      makeAssignment({ staffId: 's1', date: '2025-01-06', timeSlot: 'morning', parkingSpot: 'A1' }),
    ]
    const result = assignParking('2025-01-06', 'evening', allSpots, existing)
    expect(result).toBe('A1')
  })
})

// --- spec: shift-assignment / 週上限チェック ---

describe('getWeeklyAssignmentCount', () => {
  it('同じ週のアサイン数を正確に返す', () => {
    // spec: 週上限を超えた場合に警告が表示される（前提: カウントが正確）
    const assignments: ShiftAssignment[] = [
      makeAssignment({ id: '1', staffId: 'staff-1', date: '2025-01-06' }), // 月
      makeAssignment({ id: '2', staffId: 'staff-1', date: '2025-01-07' }), // 火
      makeAssignment({ id: '3', staffId: 'staff-1', date: '2025-01-08' }), // 水
    ]
    const count = getWeeklyAssignmentCount('staff-1', '2025-01-06', assignments)
    expect(count).toBe(3)
  })

  it('別のスタッフのアサインは含まない', () => {
    const assignments: ShiftAssignment[] = [
      makeAssignment({ id: '1', staffId: 'staff-1', date: '2025-01-06' }),
      makeAssignment({ id: '2', staffId: 'staff-2', date: '2025-01-06' }), // 別スタッフ
    ]
    const count = getWeeklyAssignmentCount('staff-1', '2025-01-06', assignments)
    expect(count).toBe(1)
  })

  it('前の週のアサインは含まない', () => {
    const assignments: ShiftAssignment[] = [
      makeAssignment({ id: '1', staffId: 'staff-1', date: '2024-12-30' }), // 前週
      makeAssignment({ id: '2', staffId: 'staff-1', date: '2025-01-06' }), // 今週月曜
    ]
    const count = getWeeklyAssignmentCount('staff-1', '2025-01-06', assignments)
    expect(count).toBe(1)
  })

  it('翌週のアサインは含まない', () => {
    const assignments: ShiftAssignment[] = [
      makeAssignment({ id: '1', staffId: 'staff-1', date: '2025-01-06' }), // 今週月曜
      makeAssignment({ id: '2', staffId: 'staff-1', date: '2025-01-13' }), // 翌週月曜
    ]
    const count = getWeeklyAssignmentCount('staff-1', '2025-01-06', assignments)
    expect(count).toBe(1)
  })

  it('アサインが0件の場合、0を返す', () => {
    const count = getWeeklyAssignmentCount('staff-1', '2025-01-06', [])
    expect(count).toBe(0)
  })

  it('同一日にAM・PMの複数時間帯があっても1日としてカウントする', () => {
    // バグ修正: 同日複数時間帯が「複数日分」としてカウントされていた
    const assignments: ShiftAssignment[] = [
      makeAssignment({ id: '1', staffId: 'staff-1', date: '2025-01-06', timeSlot: 'morning' }),
      makeAssignment({ id: '2', staffId: 'staff-1', date: '2025-01-06', timeSlot: 'afternoon' }),
    ]
    const count = getWeeklyAssignmentCount('staff-1', '2025-01-06', assignments)
    expect(count).toBe(1) // AM+PMでも1日分
  })

  it('週3日スタッフが3日に複数時間帯ずつアサインされても3日分としてカウントする', () => {
    // バグ修正: 3日目AM選択時点で超過判定されていた問題
    const assignments: ShiftAssignment[] = [
      makeAssignment({ id: '1', staffId: 'staff-1', date: '2025-01-06', timeSlot: 'morning' }),   // 月AM
      makeAssignment({ id: '2', staffId: 'staff-1', date: '2025-01-06', timeSlot: 'afternoon' }), // 月PM
      makeAssignment({ id: '3', staffId: 'staff-1', date: '2025-01-07', timeSlot: 'morning' }),   // 火AM
      makeAssignment({ id: '4', staffId: 'staff-1', date: '2025-01-07', timeSlot: 'afternoon' }), // 火PM
      makeAssignment({ id: '5', staffId: 'staff-1', date: '2025-01-08', timeSlot: 'morning' }),   // 水AM
    ]
    const count = getWeeklyAssignmentCount('staff-1', '2025-01-06', assignments)
    expect(count).toBe(3) // 月・火・水の3日分（アサイン件数5ではない）
  })
})

// --- spec: shift-assignment / 出勤可能時間帯チェック ---

describe('isAvailableSlot', () => {
  it('出勤可能な時間帯はtrueを返す', () => {
    // spec: 出勤不可時間帯への割り当て時に警告が表示される（前提）
    const staff = makeStaff({ availableSlots: ['morning', 'afternoon'] })
    expect(isAvailableSlot(staff, 'morning')).toBe(true)
    expect(isAvailableSlot(staff, 'afternoon')).toBe(true)
  })

  it('出勤不可の時間帯はfalseを返す', () => {
    const staff = makeStaff({ availableSlots: ['morning', 'afternoon'] })
    expect(isAvailableSlot(staff, 'evening')).toBe(false)
  })

  it('availableSlotsが空の場合はすべてfalse', () => {
    const staff = makeStaff({ availableSlots: [] })
    expect(isAvailableSlot(staff, 'morning')).toBe(false)
    expect(isAvailableSlot(staff, 'afternoon')).toBe(false)
    expect(isAvailableSlot(staff, 'evening')).toBe(false)
  })

  it('全時間帯が出勤可能な場合はすべてtrue', () => {
    const staff = makeStaff({ availableSlots: ['morning', 'afternoon', 'evening'] })
    expect(isAvailableSlot(staff, 'morning')).toBe(true)
    expect(isAvailableSlot(staff, 'afternoon')).toBe(true)
    expect(isAvailableSlot(staff, 'evening')).toBe(true)
  })
})
