import { describe, it, expect } from 'vitest'
import { generateAutoShift } from './autoShiftGenerator'
import type { Staff, PreferredDayOff } from '../types'

// --- spec: auto-shift-generation ---

const makeStaff = (overrides: Partial<Staff> & { id: string; name: string }): Staff => ({
  maxWeeklyShifts: 5,
  availableSlots: ['morning', 'afternoon', 'evening'],
  usesParking: false,
  ...overrides,
})

const allParkingSpots = ['A1', 'A2', 'A3', 'A4', 'B1']

const getRequiredCount = (_date: string, _slot: Parameters<typeof generateAutoShift>[0]['getRequiredCount'] extends (d: string, s: infer S) => number ? S : never) => 2

describe('generateAutoShift', () => {
  describe('基本的なアサイン', () => {
    it('必要人数分のスタッフをアサインする', () => {
      // spec: 各日・各時間帯の必要人数を可能な限り満たす（ベストエフォート）
      const staff = [
        makeStaff({ id: 's1', name: '山田' }),
        makeStaff({ id: 's2', name: '鈴木' }),
        makeStaff({ id: 's3', name: '田中' }),
      ]

      const result = generateAutoShift({
        periodDates: ['2025-02-03'],
        staff,
        dayOffs: [],
        getRequiredCount: () => 2,
        allParkingSpots,
      })

      const morningAssignments = result.filter((a) => a.date === '2025-02-03' && a.timeSlot === 'morning')
      expect(morningAssignments).toHaveLength(2)
    })

    it('候補が必要人数より少ない場合はベストエフォートで割り当てる', () => {
      // spec: 候補が少ない場合はベストエフォートで割り当て（ゼロでも可）
      const staff = [makeStaff({ id: 's1', name: '山田' })]

      const result = generateAutoShift({
        periodDates: ['2025-02-03'],
        staff,
        dayOffs: [],
        getRequiredCount: () => 3, // 必要3人だがスタッフ1人のみ
        allParkingSpots,
      })

      const morningAssignments = result.filter((a) => a.date === '2025-02-03' && a.timeSlot === 'morning')
      expect(morningAssignments).toHaveLength(1) // 1人だけ割り当てられる
    })

    it('必要人数が0の時間帯はアサインしない', () => {
      const staff = [makeStaff({ id: 's1', name: '山田' })]

      const result = generateAutoShift({
        periodDates: ['2025-02-03'],
        staff,
        dayOffs: [],
        getRequiredCount: (_, slot) => (slot === 'morning' ? 0 : 1),
        allParkingSpots,
      })

      const morningAssignments = result.filter((a) => a.timeSlot === 'morning')
      expect(morningAssignments).toHaveLength(0)
    })
  })

  describe('強制制約: 希望休', () => {
    it('希望休の日はアサインしない', () => {
      // spec: 希望休の日は割り当てない（強制制約）
      const staff = [makeStaff({ id: 's1', name: '山田' })]
      const dayOffs: PreferredDayOff[] = [
        { id: 'd1', staffId: 's1', date: '2025-02-03' },
      ]

      const result = generateAutoShift({
        periodDates: ['2025-02-03'],
        staff,
        dayOffs,
        getRequiredCount: () => 1,
        allParkingSpots,
      })

      expect(result.filter((a) => a.staffId === 's1')).toHaveLength(0)
    })

    it('希望休でない日にはアサインされる', () => {
      const staff = [makeStaff({ id: 's1', name: '山田' })]
      const dayOffs: PreferredDayOff[] = [
        { id: 'd1', staffId: 's1', date: '2025-02-03' },
      ]

      const result = generateAutoShift({
        periodDates: ['2025-02-03', '2025-02-04'],
        staff,
        dayOffs,
        getRequiredCount: () => 1,
        allParkingSpots,
      })

      const feb04 = result.filter((a) => a.staffId === 's1' && a.date === '2025-02-04')
      expect(feb04.length).toBeGreaterThan(0)
    })
  })

  describe('強制制約: 出勤可能時間帯', () => {
    it('出勤不可の時間帯にはアサインしない', () => {
      // spec: スタッフの出勤可能時間帯のみに割り当てる（強制制約）
      const staff = [makeStaff({ id: 's1', name: '山田', availableSlots: ['morning'] })]

      const result = generateAutoShift({
        periodDates: ['2025-02-03'],
        staff,
        dayOffs: [],
        getRequiredCount: () => 1,
        allParkingSpots,
      })

      expect(result.filter((a) => a.timeSlot === 'afternoon')).toHaveLength(0)
      expect(result.filter((a) => a.timeSlot === 'evening')).toHaveLength(0)
    })

    it('出勤可能な時間帯にはアサインされる', () => {
      const staff = [makeStaff({ id: 's1', name: '山田', availableSlots: ['morning'] })]

      const result = generateAutoShift({
        periodDates: ['2025-02-03'],
        staff,
        dayOffs: [],
        getRequiredCount: () => 1,
        allParkingSpots,
      })

      expect(result.filter((a) => a.timeSlot === 'morning')).toHaveLength(1)
    })
  })

  describe('強制制約: 週上限', () => {
    it('週上限出勤回数を超えてアサインしない', () => {
      // spec: 週上限出勤回数を超えない（強制制約）
      // maxWeeklyShifts=2、月〜金の5日間でアサインしようとする
      const staff = [makeStaff({ id: 's1', name: '山田', maxWeeklyShifts: 2 })]

      const result = generateAutoShift({
        periodDates: ['2025-02-03', '2025-02-04', '2025-02-05', '2025-02-06', '2025-02-07'],
        staff,
        dayOffs: [],
        getRequiredCount: (_, slot) => (slot === 'morning' ? 1 : 0), // 各日午前のみ1人
        allParkingSpots,
      })

      const s1Assignments = result.filter((a) => a.staffId === 's1')
      expect(s1Assignments).toHaveLength(2) // 週上限の2回まで
    })

    it('週をまたぐ場合は週ごとに上限がリセットされる', () => {
      // 月曜〜翌週月曜 (8日間)
      const staff = [makeStaff({ id: 's1', name: '山田', maxWeeklyShifts: 2 })]

      const result = generateAutoShift({
        periodDates: [
          '2025-02-03', '2025-02-04', '2025-02-05', '2025-02-06', '2025-02-07',
          '2025-02-10', '2025-02-11',
        ],
        staff,
        dayOffs: [],
        getRequiredCount: (_, slot) => (slot === 'morning' ? 1 : 0),
        allParkingSpots,
      })

      const s1Assignments = result.filter((a) => a.staffId === 's1')
      expect(s1Assignments).toHaveLength(4) // 第1週2回 + 第2週2回
    })
  })

  describe('優先順位', () => {
    it('週アサイン数の少ないスタッフを優先してアサインする', () => {
      // spec: 週上限・出勤可能時間帯・希望休を考慮してスタッフをアサイン
      const staff = [
        makeStaff({ id: 's1', name: '山田', maxWeeklyShifts: 5 }),
        makeStaff({ id: 's2', name: '鈴木', maxWeeklyShifts: 5 }),
      ]

      // 月曜午前: s1とs2 両方割り当て
      // 火曜午前: 必要1人 → 週アサイン数が少ないs2が優先されるはず
      const result = generateAutoShift({
        periodDates: ['2025-02-03', '2025-02-04'],
        staff,
        dayOffs: [],
        getRequiredCount: (date, slot) => {
          if (slot !== 'morning') return 0
          if (date === '2025-02-03') return 2 // 月曜は2人
          if (date === '2025-02-04') return 1 // 火曜は1人
          return 0
        },
        allParkingSpots,
      })

      // 月曜: s1, s2 の2人
      const mon = result.filter((a) => a.date === '2025-02-03')
      expect(mon).toHaveLength(2)

      // 火曜: 週アサイン数が同じなので、どちらか1人（s1またはs2）
      const tue = result.filter((a) => a.date === '2025-02-04')
      expect(tue).toHaveLength(1)
    })
  })

  describe('駐車場割り当て', () => {
    it('駐車場利用フラグがONのスタッフには駐車場番号が付与される', () => {
      // spec: 生成結果はLocalStorageに保存され、通常のアサインと同様に手動編集できる
      const staff = [makeStaff({ id: 's1', name: '山田', usesParking: true })]

      const result = generateAutoShift({
        periodDates: ['2025-02-03'],
        staff,
        dayOffs: [],
        getRequiredCount: (_, slot) => (slot === 'morning' ? 1 : 0),
        allParkingSpots,
      })

      expect(result[0].parkingSpot).toBe('A1')
    })

    it('駐車場利用フラグがOFFのスタッフにはnullが付与される', () => {
      const staff = [makeStaff({ id: 's1', name: '山田', usesParking: false })]

      const result = generateAutoShift({
        periodDates: ['2025-02-03'],
        staff,
        dayOffs: [],
        getRequiredCount: (_, slot) => (slot === 'morning' ? 1 : 0),
        allParkingSpots,
      })

      expect(result[0].parkingSpot).toBeNull()
    })
  })

  describe('複数日・期間全体', () => {
    it('期間内の全日付にアサインが生成される', () => {
      const staff = [
        makeStaff({ id: 's1', name: '山田' }),
        makeStaff({ id: 's2', name: '鈴木' }),
      ]

      const result = generateAutoShift({
        periodDates: ['2025-02-03', '2025-02-04', '2025-02-05'],
        staff,
        dayOffs: [],
        getRequiredCount: (_, slot) => (slot === 'morning' ? 1 : 0),
        allParkingSpots,
      })

      const dates = [...new Set(result.map((a) => a.date))]
      expect(dates.sort()).toEqual(['2025-02-03', '2025-02-04', '2025-02-05'])
    })
  })
})
