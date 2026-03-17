// --- spec: shift-optimization / 結合テスト (E2Eフロー) ---
import { describe, it, expect } from 'vitest'
import { generateAutoShift } from './autoShiftGenerator'
import { optimizeShift } from './shiftOptimizer'
import type { Staff, HelpStaff, PreferredDayOff } from '../types'

const allParkingSpots = ['A1', 'A2', 'A3', 'A4', 'B1']

describe('グリーディ生成 → 最適化 結合テスト', () => {
  it('グリーディ結果を初期解として最適化が動作する', () => {
    const staff: Staff[] = [
      { id: 's1', name: '山田', maxWeeklyShifts: 5, availableSlots: ['morning'], usesParking: false },
      { id: 's2', name: '鈴木', maxWeeklyShifts: 5, availableSlots: ['morning'], usesParking: false },
      { id: 's3', name: '田中', maxWeeklyShifts: 5, availableSlots: ['morning'], usesParking: false },
    ]
    const dates = ['2025-01-06', '2025-01-07', '2025-01-08', '2025-01-09', '2025-01-10']
    const getRequiredCount = (_date: string, slot: string) => slot === 'morning' ? 1 : 0

    // 1. グリーディ生成
    const greedyAssignments = generateAutoShift({
      periodDates: dates,
      staff,
      dayOffs: [],
      getRequiredCount,
      allParkingSpots,
    })

    expect(greedyAssignments.length).toBeGreaterThan(0)

    // 2. 最適化（グリーディ結果を初期解として使用）
    const optimized = optimizeShift(
      {
        initialAssignments: greedyAssignments,
        staff,
        helpStaff: [],
        dayOffs: [],
        periodDates: dates,
        getRequiredCount,
        totalParkingSpots: allParkingSpots.length,
        config: { maxIterations: 1000, noImprovementLimit: 200 },
      },
      allParkingSpots,
    )

    // 3. 結果検証: ShiftAssignment[] として有効な形式
    expect(Array.isArray(optimized)).toBe(true)
    for (const a of optimized) {
      expect(a).toHaveProperty('id')
      expect(a).toHaveProperty('staffId')
      expect(a).toHaveProperty('date')
      expect(a).toHaveProperty('timeSlot')
      expect(a).toHaveProperty('parkingSpot')
      expect(a).toHaveProperty('isLocked')
      // 固定アサインはない
      expect(a.isLocked).toBe(false)
    }
  })

  it('強制制約（希望休）はグリーディと最適化の両方で維持される', () => {
    const staff: Staff[] = [
      { id: 's1', name: '山田', maxWeeklyShifts: 5, availableSlots: ['morning'], usesParking: false },
      { id: 's2', name: '鈴木', maxWeeklyShifts: 5, availableSlots: ['morning'], usesParking: false },
    ]
    const dates = ['2025-01-06', '2025-01-07', '2025-01-08']
    const dayOffs: PreferredDayOff[] = [
      { id: 'd1', staffId: 's1', date: '2025-01-06' },
    ]
    const getRequiredCount = (_date: string, slot: string) => slot === 'morning' ? 1 : 0

    // グリーディ生成
    const greedyAssignments = generateAutoShift({
      periodDates: dates,
      staff,
      dayOffs,
      getRequiredCount,
      allParkingSpots,
    })

    // 希望休の日にs1はアサインされていないことを確認
    expect(greedyAssignments.some((a) => a.staffId === 's1' && a.date === '2025-01-06')).toBe(false)

    // 最適化
    const optimized = optimizeShift(
      {
        initialAssignments: greedyAssignments,
        staff,
        helpStaff: [],
        dayOffs,
        periodDates: dates,
        getRequiredCount,
        totalParkingSpots: allParkingSpots.length,
        config: { maxIterations: 1000 },
      },
      allParkingSpots,
    )

    // 最適化後も希望休の日にs1はアサインされていない
    expect(optimized.some((a) => a.staffId === 's1' && a.date === '2025-01-06')).toBe(false)
  })

  it('ヘルプスタッフを含む場合も正常に動作する', () => {
    const staff: Staff[] = [
      { id: 's1', name: '山田', maxWeeklyShifts: 5, availableSlots: ['morning'], usesParking: false },
    ]
    const helpStaff: HelpStaff[] = [
      {
        id: 'h1',
        name: 'ヘルプ',
        availableSlots: ['morning'],
        availableDates: ['2025-01-06', '2025-01-07'],
        usesParking: false,
      },
    ]
    const dates = ['2025-01-06', '2025-01-07', '2025-01-08']
    const getRequiredCount = (_date: string, slot: string) => slot === 'morning' ? 2 : 0

    // グリーディ生成
    const greedyAssignments = generateAutoShift({
      periodDates: dates,
      staff,
      helpStaff,
      dayOffs: [],
      getRequiredCount,
      allParkingSpots,
    })

    // 最適化（ヘルプスタッフはavailableDates外に出勤させないことを確認）
    const optimized = optimizeShift(
      {
        initialAssignments: greedyAssignments,
        staff,
        helpStaff,
        dayOffs: [],
        periodDates: dates,
        getRequiredCount,
        totalParkingSpots: allParkingSpots.length,
        config: { maxIterations: 500 },
      },
      allParkingSpots,
    )

    // ヘルプスタッフがavailableDates外（2025-01-08）に出勤していない
    expect(optimized.some((a) => a.staffId === 'h1' && a.date === '2025-01-08')).toBe(false)
  })

  it('午前のみスタッフと午後のみスタッフは同じ駐車場枠を共有できる', () => {
    // 問題: toAssignments()が日単位でusedSpotsを管理するため、
    // 午前スタッフがA1を使うと午後スタッフもA1を使用中とみなしてA2を割り当ててしまう
    const staff: Staff[] = [
      {
        id: 's1',
        name: '山田',
        maxWeeklyShifts: 5,
        availableSlots: ['morning'],
        usesParking: true,
      },
      {
        id: 's2',
        name: '鈴木',
        maxWeeklyShifts: 5,
        availableSlots: ['afternoon'],
        usesParking: true,
      },
    ]
    const dates = ['2025-01-06']
    const twoSpots = ['A1', 'A2']
    const getRequiredCount = (_date: string, slot: string) => {
      if (slot === 'morning') return 1
      if (slot === 'afternoon') return 1
      return 0
    }

    // グリーディ生成: 午前に山田、午後に鈴木がアサインされる
    const greedyAssignments = generateAutoShift({
      periodDates: dates,
      staff,
      dayOffs: [],
      getRequiredCount,
      allParkingSpots: twoSpots,
    })

    // 最適化（configにmaxIterations指定で確実に収束させる）
    const optimized = optimizeShift(
      {
        initialAssignments: greedyAssignments,
        staff,
        helpStaff: [],
        dayOffs: [],
        periodDates: dates,
        getRequiredCount,
        totalParkingSpots: twoSpots.length,
        config: { maxIterations: 100 },
      },
      twoSpots,
    )

    // 両スタッフがアサインされていることを確認
    const morningAssignment = optimized.find((a) => a.staffId === 's1' && a.date === '2025-01-06')
    const afternoonAssignment = optimized.find((a) => a.staffId === 's2' && a.date === '2025-01-06')
    expect(morningAssignment).toBeDefined()
    expect(afternoonAssignment).toBeDefined()

    // 時間帯が異なるため、同じ駐車場枠を共有できる（両方ともA1を使えるはず）
    expect(morningAssignment?.parkingSpot).not.toBeNull()
    expect(afternoonAssignment?.parkingSpot).not.toBeNull()
    expect(morningAssignment?.parkingSpot).toBe(afternoonAssignment?.parkingSpot)
  })

  it('駐車場利用者の制約が最適化後も維持される', () => {
    const staff: Staff[] = [
      { id: 's1', name: '山田', maxWeeklyShifts: 5, availableSlots: ['morning'], usesParking: true },
      { id: 's2', name: '鈴木', maxWeeklyShifts: 5, availableSlots: ['morning'], usesParking: true },
      { id: 's3', name: '田中', maxWeeklyShifts: 5, availableSlots: ['morning'], usesParking: false },
    ]
    const dates = ['2025-01-06']
    const limitedParkingSpots = ['A1'] // 駐車場1台のみ
    const getRequiredCount = (_date: string, slot: string) => slot === 'morning' ? 2 : 0

    const greedyAssignments = generateAutoShift({
      periodDates: dates,
      staff,
      dayOffs: [],
      getRequiredCount,
      allParkingSpots: limitedParkingSpots,
    })

    const optimized = optimizeShift(
      {
        initialAssignments: greedyAssignments,
        staff,
        helpStaff: [],
        dayOffs: [],
        periodDates: dates,
        getRequiredCount,
        totalParkingSpots: limitedParkingSpots.length,
        config: { maxIterations: 500 },
      },
      limitedParkingSpots,
    )

    // 同一日に駐車場利用スタッフが2人以上出勤していない
    const parkingOnDate = optimized.filter(
      (a) => a.date === '2025-01-06' && a.parkingSpot !== null,
    )
    // 駐車場スポットの重複がない
    const spots = parkingOnDate.map((a) => a.parkingSpot)
    const uniqueSpots = new Set(spots)
    expect(spots.length).toBe(uniqueSpots.size)
  })
})
