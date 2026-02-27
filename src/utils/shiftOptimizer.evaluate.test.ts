// --- spec: shift-optimization / 評価関数 ---
import { describe, it, expect } from 'vitest'
import { evaluate, isBetter } from './shiftOptimizer'
import type { EvalResult } from '../types'

// 評価関数のテストで使う内部表現のヘルパー
// working[staffIndex][dateIndex]: そのスタッフがその日に出勤するか
// staffIsParking[staffIndex]: 駐車場使用フラグ
// isRegularStaff[staffIndex]: 通常スタッフ（trueならfairnessVarianceの計算対象）
// weeklyCapacity[staffIndex]: 期間内の週上限合計（通常スタッフのみ）
// dates: 日付一覧
// requiredCounts[dateIndex][slotIndex]: 必要人数
// staffSlots[staffIndex]: 出勤可能な時間帯インデックスのリスト

describe('isBetter', () => {
  it('shortfallPeakが小さい解が優先される（基準1）', () => {
    // 解Aの最大不足が2人、解Bの最大不足が1人 → 解Bが優先
    const evalA: EvalResult = { shortfallPeak: 2, fairnessVariance: 0, parkingPeak: 0 }
    const evalB: EvalResult = { shortfallPeak: 1, fairnessVariance: 0, parkingPeak: 0 }
    expect(isBetter(evalB, evalA)).toBe(true)
    expect(isBetter(evalA, evalB)).toBe(false)
  })

  it('shortfallPeakが同値の場合、fairnessVarianceが小さい解が優先される（基準2）', () => {
    // 解Aの母分散=1.56、解Bの母分散=0.22 → 解Bが優先
    const evalA: EvalResult = { shortfallPeak: 0, fairnessVariance: 1.56, parkingPeak: 0 }
    const evalB: EvalResult = { shortfallPeak: 0, fairnessVariance: 0.22, parkingPeak: 0 }
    expect(isBetter(evalB, evalA)).toBe(true)
    expect(isBetter(evalA, evalB)).toBe(false)
  })

  it('基準1が異なる場合、基準2は比較に使わない', () => {
    // 解Aの最大不足=1・母分散=0.1, 解Bの最大不足=0・母分散=2.0 → 解Bが優先
    const evalA: EvalResult = { shortfallPeak: 1, fairnessVariance: 0.1, parkingPeak: 0 }
    const evalB: EvalResult = { shortfallPeak: 0, fairnessVariance: 2.0, parkingPeak: 0 }
    expect(isBetter(evalB, evalA)).toBe(true)
  })

  it('基準1・2が同値の場合、parkingPeakが小さい解が優先される（基準3）', () => {
    const evalA: EvalResult = { shortfallPeak: 0, fairnessVariance: 0, parkingPeak: 5 }
    const evalB: EvalResult = { shortfallPeak: 0, fairnessVariance: 0, parkingPeak: 4 }
    expect(isBetter(evalB, evalA)).toBe(true)
    expect(isBetter(evalA, evalB)).toBe(false)
  })

  it('全基準が同値の場合はfalseを返す（同等）', () => {
    const evalA: EvalResult = { shortfallPeak: 1, fairnessVariance: 0.5, parkingPeak: 3 }
    const evalB: EvalResult = { shortfallPeak: 1, fairnessVariance: 0.5, parkingPeak: 3 }
    expect(isBetter(evalA, evalB)).toBe(false)
    expect(isBetter(evalB, evalA)).toBe(false)
  })
})

describe('evaluate', () => {
  // テストヘルパー: シンプルなケースのパラメータを作成
  // スタッフ3人、5日間、毎日午前1人必要
  const makeSingleSlotParams = () => {
    const dates = ['2025-01-06', '2025-01-07', '2025-01-08', '2025-01-09', '2025-01-10']
    const numStaff = 3
    const numDates = 5
    // working[staff][date]
    const working: boolean[][] = Array.from({ length: numStaff }, () =>
      Array(numDates).fill(false),
    )
    // 全スタッフが通常スタッフ
    const isRegularStaff: boolean[] = Array(numStaff).fill(true)
    // 駐車場なし
    const staffIsParking: boolean[] = Array(numStaff).fill(false)
    // 週上限: 各スタッフ5日
    const weeklyCapacity: number[] = Array(numStaff).fill(5)
    // スタッフの出勤可能スロット: slot 0（morning）のみ
    const staffSlots: number[][] = Array.from({ length: numStaff }, () => [0])
    // 必要人数: 毎日 morning=1
    const requiredCounts: number[][] = Array.from({ length: numDates }, () => [1, 0, 0])

    return {
      working,
      isRegularStaff,
      staffIsParking,
      weeklyCapacity,
      staffSlots,
      dates,
      requiredCounts,
    }
  }

  it('全員休みの場合、shortfallPeakは最大不足人数になる', () => {
    const params = makeSingleSlotParams()
    // working は全false（全員休み）
    const result = evaluate(params)
    // 毎日morning1人必要だが0人出勤 → 不足1人/日 → peak = 1
    expect(result.shortfallPeak).toBe(1)
  })

  it('1人が毎日出勤する場合、shortfallPeakは0になる', () => {
    const params = makeSingleSlotParams()
    // スタッフ0が毎日出勤
    for (let d = 0; d < 5; d++) {
      params.working[0][d] = true
    }
    const result = evaluate(params)
    expect(result.shortfallPeak).toBe(0)
  })

  it('不足が分散する解のshortfallPeakは不足を集中させた解より小さい', () => {
    // 解A: 1日に2人不足・他は0  → peak = 2
    const paramsA = makeSingleSlotParams()
    // morning必要人数を2にする（0日目のみ）
    paramsA.requiredCounts[0] = [2, 0, 0]
    // 全員休み
    const evalA = evaluate(paramsA)

    // 解B: 2日にそれぞれ1人不足  → peak = 1
    const paramsB = makeSingleSlotParams()
    // morning必要人数を2日間に1人ずつ設定（2日間）
    paramsB.requiredCounts[0] = [1, 0, 0]
    paramsB.requiredCounts[1] = [1, 0, 0]
    // 全員休み
    const evalB = evaluate(paramsB)

    expect(evalB.shortfallPeak).toBeLessThan(evalA.shortfallPeak)
  })

  it('fairnessVarianceはスタッフ残余容量の母分散', () => {
    const params = makeSingleSlotParams()
    // スタッフ0が5日全日出勤（残余容量=5-5=0）
    // スタッフ1が3日出勤（残余容量=5-3=2）
    // スタッフ2が2日出勤（残余容量=5-2=3）
    // → 残余容量 = [0, 2, 3], 平均 = 5/3, 母分散 = ((0-5/3)^2+(2-5/3)^2+(3-5/3)^2) / 3
    for (let d = 0; d < 5; d++) params.working[0][d] = true
    for (let d = 0; d < 3; d++) params.working[1][d] = true
    for (let d = 0; d < 2; d++) params.working[2][d] = true

    const result = evaluate(params)
    // 残余容量: [0, 2, 3], 平均=5/3≈1.667
    // 母分散 = ((0-5/3)^2 + (2-5/3)^2 + (3-5/3)^2) / 3
    //       = (25/9 + 1/9 + 16/9) / 3 = (42/9) / 3 = 42/27 ≈ 1.556
    const expected = 42 / 27
    expect(result.fairnessVariance).toBeCloseTo(expected, 3)
  })

  it('ヘルプスタッフはfairnessVarianceの計算から除外される', () => {
    const params = makeSingleSlotParams()
    // スタッフ2をヘルプスタッフとしてマーク
    params.isRegularStaff[2] = false
    // 週容量はヘルプには不要（除外されるため適当な値）
    params.weeklyCapacity[2] = 0

    // スタッフ0,1それぞれ2.5日出勤（5日中2日ずつ出勤）→ 残余容量=3
    for (let d = 0; d < 2; d++) {
      params.working[0][d] = true
      params.working[1][d] = true
    }

    const result = evaluate(params)
    // 通常スタッフ0: 残余容量=5-2=3, スタッフ1: 残余容量=5-2=3
    // → 分散=0
    expect(result.fairnessVariance).toBeCloseTo(0, 5)
  })

  it('parkingPeakは各日の駐車場利用スタッフ数の最大値', () => {
    const params = makeSingleSlotParams()
    // スタッフ0のみ駐車場利用
    params.staffIsParking[0] = true
    // スタッフ0が0,1,2日目に出勤、スタッフ1が0日目のみ出勤
    params.working[0][0] = true
    params.working[0][1] = true
    params.working[0][2] = true
    params.working[1][0] = true

    const result = evaluate(params)
    // 各日の駐車場利用数: [1, 1, 1, 0, 0] → peak = 1
    expect(result.parkingPeak).toBe(1)
  })

  it('parkingPeakは駐車場利用スタッフが多い日に増加する', () => {
    const params = makeSingleSlotParams()
    // スタッフ0,1が駐車場利用
    params.staffIsParking[0] = true
    params.staffIsParking[1] = true
    // 0日目に2人出勤
    params.working[0][0] = true
    params.working[1][0] = true

    const result = evaluate(params)
    // 0日目: 2人、他は0 → peak = 2
    expect(result.parkingPeak).toBe(2)
  })
})
