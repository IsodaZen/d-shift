import { describe, it, expect } from 'vitest'
import { generateAutoShift } from './autoShiftGenerator'
import type { Staff, ShiftAssignment } from '../types'

// --- spec: auto-shift-generation / lockedStaffDates ---

const makeStaff = (overrides: Partial<Staff> & { id: string; name: string }): Staff => ({
  maxWeeklyShifts: 5,
  availableSlots: ['morning', 'afternoon', 'evening'],
  usesParking: false,
  ...overrides,
})

const allParkingSpots = ['A1', 'A2', 'A3', 'A4', 'B1']

describe('generateAutoShift / 固定アサインスキップ', () => {
  it('固定アサインがある staffId+date の組み合わせには新しいアサインを生成しない', () => {
    // spec: isLocked: true のアサインが存在するスタッフ・日付への新規アサイン生成を行ってはならない
    const staff = [makeStaff({ id: 's1', name: '山田' })]
    const lockedStaffDates = new Set(['s1_2025-02-03'])

    const result = generateAutoShift({
      periodDates: ['2025-02-03'],
      staff,
      dayOffs: [],
      getRequiredCount: () => 2,
      allParkingSpots,
      lockedStaffDates,
    })

    expect(result.filter((a) => a.staffId === 's1')).toHaveLength(0)
  })

  it('固定アサインがない staffId+date の組み合わせは通常どおり生成される', () => {
    // spec: 固定アサインがない日は通常どおり自動生成される
    const staff = [makeStaff({ id: 's1', name: '山田' })]
    const lockedStaffDates = new Set<string>() // 固定なし

    const result = generateAutoShift({
      periodDates: ['2025-02-03'],
      staff,
      dayOffs: [],
      getRequiredCount: (_, slot) => (slot === 'morning' ? 1 : 0),
      allParkingSpots,
      lockedStaffDates,
    })

    expect(result.filter((a) => a.staffId === 's1')).toHaveLength(1)
  })

  it('固定アサインがある日はスキップし、固定なしの日は生成する', () => {
    // 複数日テスト
    const staff = [makeStaff({ id: 's1', name: '山田' })]
    // s1 の 2/3 は固定、2/4 は固定なし
    const lockedStaffDates = new Set(['s1_2025-02-03'])

    const result = generateAutoShift({
      periodDates: ['2025-02-03', '2025-02-04'],
      staff,
      dayOffs: [],
      getRequiredCount: (_, slot) => (slot === 'morning' ? 1 : 0),
      allParkingSpots,
      lockedStaffDates,
    })

    expect(result.filter((a) => a.staffId === 's1' && a.date === '2025-02-03')).toHaveLength(0)
    expect(result.filter((a) => a.staffId === 's1' && a.date === '2025-02-04')).toHaveLength(1)
  })
})

describe('generateAutoShift / 固定アサインの週カウント算入', () => {
  it('固定アサインが週カウントに算入され、週上限を超えない', () => {
    // バグ再現: maxWeeklyShifts=3、月曜に固定アサイン1件 → 自動生成は2日以内
    // 実際は lockedAssignments が getWeeklyCount に渡されていなかったため
    // 固定アサインが週カウントに含まれず、3日分が自動生成されてしまう問題
    const staff = [makeStaff({ id: 's1', name: '山田', maxWeeklyShifts: 3 })]
    // 月曜（2025-02-03）に固定アサイン済み → その日はスキップ
    const lockedStaffDates = new Set(['s1_2025-02-03'])
    const lockedAssignments: ShiftAssignment[] = [
      { id: 'locked-1', staffId: 's1', date: '2025-02-03', timeSlot: 'morning', parkingSpot: null, isLocked: true },
    ]

    // 火〜金（同じ週）で自動生成
    const result = generateAutoShift({
      periodDates: ['2025-02-04', '2025-02-05', '2025-02-06', '2025-02-07'],
      staff,
      dayOffs: [],
      getRequiredCount: (_, slot) => (slot === 'morning' ? 1 : 0),
      allParkingSpots,
      lockedStaffDates,
      lockedAssignments,
    })

    // 固定1件 + 自動生成 ≤ 3件（週上限）→ 自動生成は最大2件
    const s1Assignments = result.filter((a) => a.staffId === 's1')
    expect(s1Assignments).toHaveLength(2) // 週上限3 - 固定1 = 自動2
  })
})

describe('generateAutoShift / 固定アサインの remaining カウント算入', () => {
  it('固定アサインが既存の必要数に算入され、不足分のみ自動生成される', () => {
    // spec: スタッフAの固定アサインを含めた午前のアサイン数が3人に達している場合、追加生成は行われない
    // 必要人数: morning 2人、fixed: s1 が morning に固定済み → 残り1人のみ生成
    const staff = [
      makeStaff({ id: 's1', name: '山田' }),
      makeStaff({ id: 's2', name: '鈴木' }),
      makeStaff({ id: 's3', name: '田中' }),
    ]
    const lockedStaffDates = new Set(['s1_2025-02-03'])
    const lockedAssignments: ShiftAssignment[] = [
      { id: 'locked-1', staffId: 's1', date: '2025-02-03', timeSlot: 'morning', parkingSpot: null, isLocked: true },
    ]

    const result = generateAutoShift({
      periodDates: ['2025-02-03'],
      staff,
      dayOffs: [],
      getRequiredCount: (_, slot) => (slot === 'morning' ? 2 : 0),
      allParkingSpots,
      lockedStaffDates,
      lockedAssignments,
    })

    // s1 はスキップ（固定），s2 か s3 のどちらか1人が生成される
    expect(result.filter((a) => a.date === '2025-02-03' && a.timeSlot === 'morning')).toHaveLength(1)
    expect(result.every((a) => a.staffId !== 's1')).toBe(true)
  })

  it('固定アサインが必要人数をすでに満たしている場合は追加生成しない', () => {
    // spec: 午前の必要人数が2人で、すでに isLocked: true のアサインが2件存在する場合、追加生成なし
    const staff = [
      makeStaff({ id: 's1', name: '山田' }),
      makeStaff({ id: 's2', name: '鈴木' }),
    ]
    const lockedStaffDates = new Set(['s1_2025-02-03', 's2_2025-02-03'])
    const lockedAssignments: ShiftAssignment[] = [
      { id: 'locked-1', staffId: 's1', date: '2025-02-03', timeSlot: 'morning', parkingSpot: null, isLocked: true },
      { id: 'locked-2', staffId: 's2', date: '2025-02-03', timeSlot: 'morning', parkingSpot: null, isLocked: true },
    ]

    const result = generateAutoShift({
      periodDates: ['2025-02-03'],
      staff,
      dayOffs: [],
      getRequiredCount: (_, slot) => (slot === 'morning' ? 2 : 0),
      allParkingSpots,
      lockedStaffDates,
      lockedAssignments,
    })

    // 固定アサインで必要人数を満たしているので、自動生成は追加しない
    expect(result.filter((a) => a.date === '2025-02-03')).toHaveLength(0)
  })

  it('固定アサインが必要人数を超過している場合も追加生成しない', () => {
    // spec: 午前の必要人数が2人で、すでに isLocked: true のアサインが3件存在する → 追加生成なし
    const staff = [
      makeStaff({ id: 's1', name: '山田' }),
      makeStaff({ id: 's2', name: '鈴木' }),
      makeStaff({ id: 's3', name: '田中' }),
    ]
    const lockedStaffDates = new Set(['s1_2025-02-03', 's2_2025-02-03', 's3_2025-02-03'])
    const lockedAssignments: ShiftAssignment[] = [
      { id: 'locked-1', staffId: 's1', date: '2025-02-03', timeSlot: 'morning', parkingSpot: null, isLocked: true },
      { id: 'locked-2', staffId: 's2', date: '2025-02-03', timeSlot: 'morning', parkingSpot: null, isLocked: true },
      { id: 'locked-3', staffId: 's3', date: '2025-02-03', timeSlot: 'morning', parkingSpot: null, isLocked: true },
    ]

    const result = generateAutoShift({
      periodDates: ['2025-02-03'],
      staff,
      dayOffs: [],
      getRequiredCount: (_, slot) => (slot === 'morning' ? 2 : 0),
      allParkingSpots,
      lockedStaffDates,
      lockedAssignments,
    })

    // 超過しているが、自動生成による追加はない
    expect(result.filter((a) => a.date === '2025-02-03')).toHaveLength(0)
  })
})
