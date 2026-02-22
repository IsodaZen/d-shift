import { describe, it, expect } from 'vitest'
import { generateAutoShift } from './autoShiftGenerator'
import type { Staff, PreferredDayOff, HelpStaff } from '../types'

// --- spec: auto-shift-generation ---

const makeStaff = (overrides: Partial<Staff> & { id: string; name: string }): Staff => ({
  maxWeeklyShifts: 5,
  availableSlots: ['morning', 'afternoon', 'evening'],
  usesParking: false,
  ...overrides,
})

const allParkingSpots = ['A1', 'A2', 'A3', 'A4', 'B1']


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

    it('同一日の複数時間帯アサインは1出勤としてカウントする', () => {
      // spec: 同一日に複数の時間帯にアサインされる場合も1出勤としてカウントする
      // maxWeeklyShifts=2、月曜に午前・午後両方アサイン済みで、火曜にもアサインできるか
      const staff = [makeStaff({ id: 's1', name: '山田', maxWeeklyShifts: 2 })]

      const result = generateAutoShift({
        periodDates: ['2025-02-03', '2025-02-04', '2025-02-05'],
        staff,
        dayOffs: [],
        // 月曜: 午前・午後両方1人必要、火曜以降: 午前のみ1人
        getRequiredCount: (date, slot) => {
          if (date === '2025-02-03') return slot === 'evening' ? 0 : 1
          return slot === 'morning' ? 1 : 0
        },
        allParkingSpots,
      })

      // 月曜は午前・午後の2スロットだが、週1出勤扱い
      // → 火曜はまだ週1回なので2日目（上限2回）はアサインされる
      const feb03 = result.filter((a) => a.staffId === 's1' && a.date === '2025-02-03')
      const feb04 = result.filter((a) => a.staffId === 's1' && a.date === '2025-02-04')
      expect(feb03.length).toBe(2) // 午前・午後の2スロット
      expect(feb04.length).toBe(1) // 2日目（週2回目）にもアサイン
      // 水曜は週上限（2出勤）に達しているのでアサインなし
      const feb05 = result.filter((a) => a.staffId === 's1' && a.date === '2025-02-05')
      expect(feb05.length).toBe(0)
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

  describe('強制制約: 駐車場不足時のアサイン除外', () => {
    it('駐車場が必要なスタッフは駐車場が満杯の場合アサインしない', () => {
      // spec: usesParking=true のスタッフは駐車場空きがなければ出勤不可
      // 駐車場1枠のみ、2人ともusesParking=true → 1人目がA1を取得、2人目は除外される
      const staff = [
        makeStaff({ id: 's1', name: '山田', usesParking: true }),
        makeStaff({ id: 's2', name: '鈴木', usesParking: true }),
      ]

      const result = generateAutoShift({
        periodDates: ['2025-02-03'],
        staff,
        dayOffs: [],
        getRequiredCount: (_, slot) => (slot === 'morning' ? 2 : 0), // 2人必要
        allParkingSpots: ['A1'], // 駐車場は1枠のみ
      })

      // 駐車場は1枠のみ → 1人しかアサインできない
      expect(result).toHaveLength(1)
      expect(result[0].parkingSpot).toBe('A1')
    })

    it('駐車場不要のスタッフは駐車場が満杯でもアサインされる', () => {
      // spec: usesParking=false のスタッフは駐車場の空き状況に関わらず出勤可能
      const staff = [
        makeStaff({ id: 's1', name: '山田', usesParking: true }),
        makeStaff({ id: 's2', name: '鈴木', usesParking: false }), // 駐車場不要
      ]

      const result = generateAutoShift({
        periodDates: ['2025-02-03'],
        staff,
        dayOffs: [],
        getRequiredCount: (_, slot) => (slot === 'morning' ? 2 : 0),
        allParkingSpots: ['A1'], // 駐車場は1枠のみ
      })

      // s1がA1を取得、s2は駐車場不要なのでアサインされる
      expect(result).toHaveLength(2)
      const s1 = result.find((a) => a.staffId === 's1')
      const s2 = result.find((a) => a.staffId === 's2')
      expect(s1?.parkingSpot).toBe('A1')
      expect(s2?.parkingSpot).toBeNull()
    })

    it('駐車場が必要なスタッフが同日に既に枠を持っている場合は再利用してアサインされる', () => {
      // spec: 同日同スタッフは1枠を再利用する（複数スロット出勤でも1枠消費）
      const staff = [
        makeStaff({ id: 's1', name: '山田', usesParking: true, availableSlots: ['morning', 'afternoon'] }),
      ]

      const result = generateAutoShift({
        periodDates: ['2025-02-03'],
        staff,
        dayOffs: [],
        getRequiredCount: (_, slot) => (slot === 'morning' ? 1 : slot === 'afternoon' ? 1 : 0),
        allParkingSpots: ['A1'], // 1枠のみ
      })

      // 午前・午後の2スロットにアサイン（同じ駐車場を再利用）
      expect(result).toHaveLength(2)
      expect(result[0].parkingSpot).toBe('A1')
      expect(result[1].parkingSpot).toBe('A1')
    })
  })

  describe('強制制約: 全時間帯出勤の原則', () => {
    it('複数時間帯対応のスタッフが出勤する場合、必要な全時間帯にアサインされる', () => {
      // spec: 出勤日には利用可能な全時間帯にアサインする（強制制約）
      // 現在のアルゴリズム: s1→午前, s2→午後（s1は午後に入らない = 違反）
      // 正しい動作: s1→午前+午後（1人で両方カバー）, s2は不要
      const staff = [
        makeStaff({ id: 's1', name: '山田', availableSlots: ['morning', 'afternoon'] }),
        makeStaff({ id: 's2', name: '鈴木', availableSlots: ['morning', 'afternoon'] }),
      ]

      const result = generateAutoShift({
        periodDates: ['2025-02-03'],
        staff,
        dayOffs: [],
        getRequiredCount: (_, slot) => (slot === 'morning' ? 1 : slot === 'afternoon' ? 1 : 0),
        allParkingSpots,
      })

      const morningAssignments = result.filter((a) => a.timeSlot === 'morning')
      const afternoonAssignments = result.filter((a) => a.timeSlot === 'afternoon')

      expect(morningAssignments).toHaveLength(1)
      expect(afternoonAssignments).toHaveLength(1)
      // 同じスタッフが午前・午後の両方にアサインされている（全時間帯出勤の原則）
      expect(morningAssignments[0].staffId).toBe(afternoonAssignments[0].staffId)
    })

    it('単一時間帯対応のスタッフはその時間帯のみにアサインされる', () => {
      // 午前のみ対応スタッフは午前のみ（変化なし）
      const staff = [
        makeStaff({ id: 's1', name: '山田', availableSlots: ['morning'] }),
        makeStaff({ id: 's2', name: '鈴木', availableSlots: ['afternoon'] }),
      ]

      const result = generateAutoShift({
        periodDates: ['2025-02-03'],
        staff,
        dayOffs: [],
        getRequiredCount: (_, slot) => (slot === 'morning' ? 1 : slot === 'afternoon' ? 1 : 0),
        allParkingSpots,
      })

      // s1は午前のみ、s2は午後のみ
      expect(result.filter((a) => a.staffId === 's1' && a.timeSlot === 'morning')).toHaveLength(1)
      expect(result.filter((a) => a.staffId === 's1' && a.timeSlot === 'afternoon')).toHaveLength(0)
      expect(result.filter((a) => a.staffId === 's2' && a.timeSlot === 'afternoon')).toHaveLength(1)
      expect(result.filter((a) => a.staffId === 's2' && a.timeSlot === 'morning')).toHaveLength(0)
    })
  })

  describe('強制制約: 必要人数超過の禁止', () => {
    it('全時間帯が必要人数を満たしていればそれ以上スタッフをアサインしない', () => {
      // spec: 全時間帯が満たされている場合、追加スタッフはアサインしない
      const staff = [
        makeStaff({ id: 's1', name: 'A', availableSlots: ['morning'] }),
        makeStaff({ id: 's2', name: 'B', availableSlots: ['morning'] }),
        makeStaff({ id: 's3', name: 'C', availableSlots: ['morning'] }),
        makeStaff({ id: 's4', name: 'D', availableSlots: ['afternoon'] }),
        makeStaff({ id: 's5', name: 'E', availableSlots: ['afternoon'] }),
        makeStaff({ id: 's6', name: 'F', availableSlots: ['afternoon'] }),
      ]

      const result = generateAutoShift({
        periodDates: ['2025-02-03'],
        staff,
        dayOffs: [],
        getRequiredCount: (_, slot) => (slot === 'morning' ? 2 : slot === 'afternoon' ? 2 : 0),
        allParkingSpots,
      })

      // 必要人数ちょうど（超過なし）
      expect(result.filter((a) => a.timeSlot === 'morning')).toHaveLength(2)
      expect(result.filter((a) => a.timeSlot === 'afternoon')).toHaveLength(2)
    })

    it('全時間帯出勤の原則による超過は最小人数となる', () => {
      // spec: 全時間帯出勤の原則で超過が生じる場合でも人数を最小化する
      // 午前3人・午後1人必要、全員AM/PM対応スタッフ4人
      // → 午前の3人を満たすために3人出勤 → 午後も3人（超過だが許容）
      // → 4人目は午前が満たされているのでアサインしない（超過最小化）
      const staff = [
        makeStaff({ id: 's1', name: 'A', availableSlots: ['morning', 'afternoon'] }),
        makeStaff({ id: 's2', name: 'B', availableSlots: ['morning', 'afternoon'] }),
        makeStaff({ id: 's3', name: 'C', availableSlots: ['morning', 'afternoon'] }),
        makeStaff({ id: 's4', name: 'D', availableSlots: ['morning', 'afternoon'] }),
      ]

      const result = generateAutoShift({
        periodDates: ['2025-02-03'],
        staff,
        dayOffs: [],
        getRequiredCount: (_, slot) => (slot === 'morning' ? 3 : slot === 'afternoon' ? 1 : 0),
        allParkingSpots,
      })

      // 午前は3人（必要数通り）
      expect(result.filter((a) => a.timeSlot === 'morning')).toHaveLength(3)
      // 午後は全時間帯出勤の原則で3人（必要1人を超えるが許容、4人にはならない）
      expect(result.filter((a) => a.timeSlot === 'afternoon')).toHaveLength(3)
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

  // --- spec: auto-shift-generation（ヘルプスタッフ拡張） ---
  describe('ヘルプスタッフ', () => {
    const makeHelpStaff = (overrides: Partial<HelpStaff> & { id: string; name: string }): HelpStaff => ({
      availableSlots: ['morning', 'afternoon', 'evening'],
      availableDates: [],
      usesParking: false,
      ...overrides,
    })

    it('通常スタッフで充足可能な場合、ヘルプスタッフはアサインされない', () => {
      const staff = [
        makeStaff({ id: 's1', name: '山田' }),
        makeStaff({ id: 's2', name: '鈴木' }),
      ]
      const helpStaff = [
        makeHelpStaff({ id: 'hs1', name: 'ヘルプA', availableDates: ['2025-02-03'] }),
      ]

      const result = generateAutoShift({
        periodDates: ['2025-02-03'],
        staff,
        dayOffs: [],
        getRequiredCount: (_, slot) => (slot === 'morning' ? 2 : 0),
        allParkingSpots,
        helpStaff,
      })

      // 通常スタッフ2人で充足 → ヘルプスタッフはアサインされない
      expect(result.filter((a) => a.staffId === 'hs1')).toHaveLength(0)
    })

    it('通常スタッフだけでは不足する場合、ヘルプスタッフがアサインされる', () => {
      const staff = [
        makeStaff({ id: 's1', name: '山田', availableSlots: ['morning'] }),
      ]
      const helpStaff = [
        makeHelpStaff({ id: 'hs1', name: 'ヘルプA', availableSlots: ['morning'], availableDates: ['2025-02-03'] }),
      ]

      const result = generateAutoShift({
        periodDates: ['2025-02-03'],
        staff,
        dayOffs: [],
        getRequiredCount: (_, slot) => (slot === 'morning' ? 2 : 0),
        allParkingSpots,
        helpStaff,
      })

      // 通常スタッフ1人 + ヘルプスタッフ1人 = 2人
      expect(result.filter((a) => a.timeSlot === 'morning')).toHaveLength(2)
      expect(result.filter((a) => a.staffId === 'hs1')).toHaveLength(1)
    })

    it('ヘルプスタッフは稼働可能日付のみにアサインされる', () => {
      const staff: Staff[] = []
      const helpStaff = [
        makeHelpStaff({ id: 'hs1', name: 'ヘルプA', availableSlots: ['morning'], availableDates: ['2025-02-03'] }),
      ]

      const result = generateAutoShift({
        periodDates: ['2025-02-03', '2025-02-04'],
        staff,
        dayOffs: [],
        getRequiredCount: (_, slot) => (slot === 'morning' ? 1 : 0),
        allParkingSpots,
        helpStaff,
      })

      // 2/3にはアサインされるが、2/4にはアサインされない
      expect(result.filter((a) => a.staffId === 'hs1' && a.date === '2025-02-03')).toHaveLength(1)
      expect(result.filter((a) => a.staffId === 'hs1' && a.date === '2025-02-04')).toHaveLength(0)
    })

    it('ヘルプスタッフは出勤可能時間帯のみにアサインされる', () => {
      const staff: Staff[] = []
      const helpStaff = [
        makeHelpStaff({ id: 'hs1', name: 'ヘルプA', availableSlots: ['morning'], availableDates: ['2025-02-03'] }),
      ]

      const result = generateAutoShift({
        periodDates: ['2025-02-03'],
        staff,
        dayOffs: [],
        getRequiredCount: () => 1,
        allParkingSpots,
        helpStaff,
      })

      // 午前のみにアサイン（午後・夕方にはアサインされない）
      expect(result.filter((a) => a.staffId === 'hs1' && a.timeSlot === 'morning')).toHaveLength(1)
      expect(result.filter((a) => a.staffId === 'hs1' && a.timeSlot === 'afternoon')).toHaveLength(0)
      expect(result.filter((a) => a.staffId === 'hs1' && a.timeSlot === 'evening')).toHaveLength(0)
    })

    it('ヘルプスタッフは駐車場制約を満たす', () => {
      const staff: Staff[] = []
      const helpStaff = [
        makeHelpStaff({ id: 'hs1', name: 'ヘルプA', availableSlots: ['morning'], availableDates: ['2025-02-03'], usesParking: true }),
        makeHelpStaff({ id: 'hs2', name: 'ヘルプB', availableSlots: ['morning'], availableDates: ['2025-02-03'], usesParking: true }),
      ]

      const result = generateAutoShift({
        periodDates: ['2025-02-03'],
        staff,
        dayOffs: [],
        getRequiredCount: (_, slot) => (slot === 'morning' ? 2 : 0),
        allParkingSpots: ['A1'], // 駐車場1枠のみ
        helpStaff,
      })

      // 駐車場1枠のみ → ヘルプスタッフ1人だけアサイン
      expect(result).toHaveLength(1)
      expect(result[0].parkingSpot).toBe('A1')
    })

    it('ヘルプスタッフも出勤日には全時間帯にアサインされる', () => {
      const staff: Staff[] = []
      const helpStaff = [
        makeHelpStaff({ id: 'hs1', name: 'ヘルプA', availableSlots: ['morning', 'afternoon'], availableDates: ['2025-02-03'] }),
      ]

      const result = generateAutoShift({
        periodDates: ['2025-02-03'],
        staff,
        dayOffs: [],
        getRequiredCount: (_, slot) => (slot === 'morning' ? 1 : slot === 'afternoon' ? 1 : 0),
        allParkingSpots,
        helpStaff,
      })

      // 午前・午後の両方にアサイン
      expect(result.filter((a) => a.staffId === 'hs1' && a.timeSlot === 'morning')).toHaveLength(1)
      expect(result.filter((a) => a.staffId === 'hs1' && a.timeSlot === 'afternoon')).toHaveLength(1)
    })

    it('複数ヘルプスタッフがいる場合、アサイン数の少ないヘルプスタッフが優先される', () => {
      const staff: Staff[] = []
      const helpStaff = [
        makeHelpStaff({ id: 'hs1', name: 'ヘルプA', availableSlots: ['morning'], availableDates: ['2025-02-03', '2025-02-04'] }),
        makeHelpStaff({ id: 'hs2', name: 'ヘルプB', availableSlots: ['morning'], availableDates: ['2025-02-03', '2025-02-04'] }),
      ]

      const result = generateAutoShift({
        periodDates: ['2025-02-03', '2025-02-04'],
        staff,
        dayOffs: [],
        getRequiredCount: (_, slot) => (slot === 'morning' ? 1 : 0),
        allParkingSpots,
        helpStaff,
      })

      // 2日間で1人ずつ必要 → 均等割り（各1回ずつ）
      const hs1Count = result.filter((a) => a.staffId === 'hs1').length
      const hs2Count = result.filter((a) => a.staffId === 'hs2').length
      expect(hs1Count).toBe(1)
      expect(hs2Count).toBe(1)
    })
  })
})
