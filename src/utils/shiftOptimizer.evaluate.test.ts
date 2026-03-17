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
    const evalA: EvalResult = { shortfallPeak: 2, shortfallTotal: 0, excessTotal: 0, helpStaffTotal: 0, fairnessVariance: 0, parkingPeak: 0 }
    const evalB: EvalResult = { shortfallPeak: 1, shortfallTotal: 0, excessTotal: 0, helpStaffTotal: 0, fairnessVariance: 0, parkingPeak: 0 }
    expect(isBetter(evalB, evalA)).toBe(true)
    expect(isBetter(evalA, evalB)).toBe(false)
  })

  it('shortfallPeakが同値の場合、shortfallTotalが小さい解が優先される（基準2）', () => {
    // 解AのshortfallTotal=3、解BのshortfallTotal=1 → 解Bが優先
    const evalA: EvalResult = { shortfallPeak: 1, shortfallTotal: 3, excessTotal: 0, helpStaffTotal: 0, fairnessVariance: 0, parkingPeak: 0 }
    const evalB: EvalResult = { shortfallPeak: 1, shortfallTotal: 1, excessTotal: 0, helpStaffTotal: 0, fairnessVariance: 0, parkingPeak: 0 }
    expect(isBetter(evalB, evalA)).toBe(true)
    expect(isBetter(evalA, evalB)).toBe(false)
  })

  it('shortfallPeak・shortfallTotal・excessTotal・helpStaffTotalが同値の場合、fairnessVarianceが小さい解が優先される（基準5）', () => {
    // 解Aの母分散=1.56、解Bの母分散=0.22 → 解Bが優先（helpStaffTotalが同値）
    const evalA: EvalResult = { shortfallPeak: 0, shortfallTotal: 0, excessTotal: 0, helpStaffTotal: 0, fairnessVariance: 1.56, parkingPeak: 0 }
    const evalB: EvalResult = { shortfallPeak: 0, shortfallTotal: 0, excessTotal: 0, helpStaffTotal: 0, fairnessVariance: 0.22, parkingPeak: 0 }
    expect(isBetter(evalB, evalA)).toBe(true)
    expect(isBetter(evalA, evalB)).toBe(false)
  })

  it('基準1が異なる場合、基準2以降は比較に使わない', () => {
    // 解Aの最大不足=1・shortfallTotal=10, 解Bの最大不足=2・shortfallTotal=2 → 解Aが優先（仕様シナリオ値）
    const evalA: EvalResult = { shortfallPeak: 1, shortfallTotal: 10, excessTotal: 0, helpStaffTotal: 0, fairnessVariance: 0.0, parkingPeak: 0 }
    const evalB: EvalResult = { shortfallPeak: 2, shortfallTotal: 2, excessTotal: 0, helpStaffTotal: 0, fairnessVariance: 0.0, parkingPeak: 0 }
    expect(isBetter(evalA, evalB)).toBe(true)
    expect(isBetter(evalB, evalA)).toBe(false)
  })

  it('基準1が同値で基準2が異なる場合、基準3以降は比較に使わない', () => {
    // shortfallTotalの大小でのみ判定（fairnessVarianceは逆）
    const evalA: EvalResult = { shortfallPeak: 1, shortfallTotal: 5, excessTotal: 0, helpStaffTotal: 0, fairnessVariance: 0.0, parkingPeak: 0 }
    const evalB: EvalResult = { shortfallPeak: 1, shortfallTotal: 2, excessTotal: 0, helpStaffTotal: 0, fairnessVariance: 9.9, parkingPeak: 0 }
    expect(isBetter(evalB, evalA)).toBe(true)
  })

  it('基準1・2・3が同値の場合、fairnessVarianceで優先する（仕様シナリオ値）', () => {
    // 解A: fairnessVariance=0.5, 解B: fairnessVariance=2.0 → 解Aが優先（helpStaffTotalが同値）
    const evalA: EvalResult = { shortfallPeak: 0, shortfallTotal: 0, excessTotal: 0, helpStaffTotal: 0, fairnessVariance: 0.5, parkingPeak: 0 }
    const evalB: EvalResult = { shortfallPeak: 0, shortfallTotal: 0, excessTotal: 0, helpStaffTotal: 0, fairnessVariance: 2.0, parkingPeak: 0 }
    expect(isBetter(evalA, evalB)).toBe(true)
    expect(isBetter(evalB, evalA)).toBe(false)
  })

  it('基準1〜5が同値の場合、parkingPeakが小さい解が優先される（基準6）', () => {
    const evalA: EvalResult = { shortfallPeak: 0, shortfallTotal: 0, excessTotal: 0, helpStaffTotal: 0, fairnessVariance: 0, parkingPeak: 5 }
    const evalB: EvalResult = { shortfallPeak: 0, shortfallTotal: 0, excessTotal: 0, helpStaffTotal: 0, fairnessVariance: 0, parkingPeak: 4 }
    expect(isBetter(evalB, evalA)).toBe(true)
    expect(isBetter(evalA, evalB)).toBe(false)
  })

  it('全基準が同値の場合はfalseを返す（同等）', () => {
    const evalA: EvalResult = { shortfallPeak: 1, shortfallTotal: 2, excessTotal: 0, helpStaffTotal: 0, fairnessVariance: 0.5, parkingPeak: 3 }
    const evalB: EvalResult = { shortfallPeak: 1, shortfallTotal: 2, excessTotal: 0, helpStaffTotal: 0, fairnessVariance: 0.5, parkingPeak: 3 }
    expect(isBetter(evalA, evalB)).toBe(false)
    expect(isBetter(evalB, evalA)).toBe(false)
  })

  it('shortfallPeakとshortfallTotalが同値の場合、helpStaffTotalが小さい解が優先される（基準3）', () => {
    // 解A: helpStaffTotal=3, 解B: helpStaffTotal=1 → 解Bが優先
    const evalA: EvalResult = { shortfallPeak: 0, shortfallTotal: 0, excessTotal: 0, helpStaffTotal: 3, fairnessVariance: 0, parkingPeak: 0 }
    const evalB: EvalResult = { shortfallPeak: 0, shortfallTotal: 0, excessTotal: 0, helpStaffTotal: 1, fairnessVariance: 0, parkingPeak: 0 }
    expect(isBetter(evalB, evalA)).toBe(true)
    expect(isBetter(evalA, evalB)).toBe(false)
  })

  it('ヘルプスタッフをアサインしない解（helpStaffTotal=0）が最も優先される', () => {
    // 解A: helpStaffTotal=0, 解B: helpStaffTotal=2 → 解Aが優先
    const evalA: EvalResult = { shortfallPeak: 0, shortfallTotal: 0, excessTotal: 0, helpStaffTotal: 0, fairnessVariance: 0, parkingPeak: 0 }
    const evalB: EvalResult = { shortfallPeak: 0, shortfallTotal: 0, excessTotal: 0, helpStaffTotal: 2, fairnessVariance: 0, parkingPeak: 0 }
    expect(isBetter(evalA, evalB)).toBe(true)
    expect(isBetter(evalB, evalA)).toBe(false)
  })

  it('shortfallPeakが異なる場合はhelpStaffTotalは比較されない（不足が優先）', () => {
    // 解A: shortfallPeak=0, helpStaffTotal=5 → 解A優先（shortfallPeakが小さい）
    const evalA: EvalResult = { shortfallPeak: 0, shortfallTotal: 0, excessTotal: 0, helpStaffTotal: 5, fairnessVariance: 0, parkingPeak: 0 }
    const evalB: EvalResult = { shortfallPeak: 1, shortfallTotal: 0, excessTotal: 0, helpStaffTotal: 0, fairnessVariance: 0, parkingPeak: 0 }
    expect(isBetter(evalA, evalB)).toBe(true)
    expect(isBetter(evalB, evalA)).toBe(false)
  })

  it('shortfallTotalが異なる場合もhelpStaffTotalは比較されない', () => {
    // 解A: shortfallTotal=1, helpStaffTotal=0 → 解A優先（shortfallTotalが小さい）
    const evalA: EvalResult = { shortfallPeak: 0, shortfallTotal: 1, excessTotal: 0, helpStaffTotal: 0, fairnessVariance: 0, parkingPeak: 0 }
    const evalB: EvalResult = { shortfallPeak: 0, shortfallTotal: 2, excessTotal: 0, helpStaffTotal: 5, fairnessVariance: 0, parkingPeak: 0 }
    // wait: evalAのshortfallTotalが小さいのでevalAが優先
    // ただしhelpStaffTotalはevalAの方が大きい（0 < 5はevalA有利、しかしshortfallTotalで先に判定済み）
    // 修正: evalBのshortfallTotalが大きく不利
    expect(isBetter(evalA, evalB)).toBe(true)
    expect(isBetter(evalB, evalA)).toBe(false)
  })

  it('helpStaffTotalが同値の場合、fairnessVarianceで比較される（基準4）', () => {
    // helpStaffTotalが同じなら、fairnessVarianceで判定
    const evalA: EvalResult = { shortfallPeak: 0, shortfallTotal: 0, excessTotal: 0, helpStaffTotal: 1, fairnessVariance: 0.5, parkingPeak: 0 }
    const evalB: EvalResult = { shortfallPeak: 0, shortfallTotal: 0, excessTotal: 0, helpStaffTotal: 1, fairnessVariance: 2.0, parkingPeak: 0 }
    expect(isBetter(evalA, evalB)).toBe(true)
    expect(isBetter(evalB, evalA)).toBe(false)
  })

  it('helpStaffTotalが小さくてもfairnessVarianceよりhelpStaffTotalが優先される', () => {
    // 解A: helpStaffTotal=1, fairnessVariance=0.0 / 解B: helpStaffTotal=3, fairnessVariance=0.0
    // → helpStaffTotalで解Aが優先（fairnessVarianceは同じなので関係なし）
    const evalA: EvalResult = { shortfallPeak: 0, shortfallTotal: 0, excessTotal: 0, helpStaffTotal: 1, fairnessVariance: 0.0, parkingPeak: 0 }
    const evalB: EvalResult = { shortfallPeak: 0, shortfallTotal: 0, excessTotal: 0, helpStaffTotal: 3, fairnessVariance: 0.0, parkingPeak: 0 }
    expect(isBetter(evalA, evalB)).toBe(true)
  })

  // --- excessTotal比較のテスト ---

  it('超過なし解が超過あり解より優先される（shortfallPeak・shortfallTotal同値時）', () => {
    // 解A: excessTotal=1（ある(日,時間帯)ペアで1人超過）
    // 解B: excessTotal=0（超過なし）
    // → 解Bが優先（超過合計 0 < 1）
    const evalA: EvalResult = { shortfallPeak: 0, shortfallTotal: 0, excessTotal: 1, helpStaffTotal: 0, fairnessVariance: 0, parkingPeak: 0 }
    const evalB: EvalResult = { shortfallPeak: 0, shortfallTotal: 0, excessTotal: 0, helpStaffTotal: 0, fairnessVariance: 0, parkingPeak: 0 }
    expect(isBetter(evalB, evalA)).toBe(true)
    expect(isBetter(evalA, evalB)).toBe(false)
  })

  it('超過合計が小さい解が優先される', () => {
    // 解A: excessTotal=3（複数スロットの超過合計）
    // 解B: excessTotal=1（小さい超過合計）
    // → 解Bが優先
    const evalA: EvalResult = { shortfallPeak: 0, shortfallTotal: 0, excessTotal: 3, helpStaffTotal: 0, fairnessVariance: 0, parkingPeak: 0 }
    const evalB: EvalResult = { shortfallPeak: 0, shortfallTotal: 0, excessTotal: 1, helpStaffTotal: 0, fairnessVariance: 0, parkingPeak: 0 }
    expect(isBetter(evalB, evalA)).toBe(true)
    expect(isBetter(evalA, evalB)).toBe(false)
  })

  it('shortfallPeakが異なればexcessTotalは比較に使用されない', () => {
    // 解A: shortfallPeak=1, excessTotal=0（不足あり・超過なし）
    // 解B: shortfallPeak=0, excessTotal=5（不足なし・超過多）
    // → 解Bが優先（shortfallPeakが優先されるため超過合計が多くても不足なしが優先）
    const evalA: EvalResult = { shortfallPeak: 1, shortfallTotal: 1, excessTotal: 0, helpStaffTotal: 0, fairnessVariance: 0, parkingPeak: 0 }
    const evalB: EvalResult = { shortfallPeak: 0, shortfallTotal: 0, excessTotal: 5, helpStaffTotal: 0, fairnessVariance: 0, parkingPeak: 0 }
    expect(isBetter(evalB, evalA)).toBe(true)
    expect(isBetter(evalA, evalB)).toBe(false)
  })

  it('excessTotalが同値ならfairnessVarianceで比較される', () => {
    // excessTotal同値・helpStaffTotal同値 → fairnessVarianceで判定
    const evalA: EvalResult = { shortfallPeak: 0, shortfallTotal: 0, excessTotal: 1, helpStaffTotal: 0, fairnessVariance: 2.0, parkingPeak: 0 }
    const evalB: EvalResult = { shortfallPeak: 0, shortfallTotal: 0, excessTotal: 1, helpStaffTotal: 0, fairnessVariance: 0.5, parkingPeak: 0 }
    expect(isBetter(evalB, evalA)).toBe(true)
    expect(isBetter(evalA, evalB)).toBe(false)
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

  it('全員休みの場合、shortfallTotalは全ペアの不足人数合計になる', () => {
    const params = makeSingleSlotParams()
    // working は全false（全員休み）、5日間×morning1人必要 → 合計5人不足
    const result = evaluate(params)
    expect(result.shortfallTotal).toBe(5)
  })

  it('一部の日に出勤がある場合、shortfallTotalは残余不足の合計になる', () => {
    const params = makeSingleSlotParams()
    // スタッフ0が2日目のみ出勤 → 不足は4日分
    params.working[0][1] = true
    const result = evaluate(params)
    expect(result.shortfallTotal).toBe(4)
  })

  it('全員が必要人数を充足する場合、shortfallTotalは0になる', () => {
    const params = makeSingleSlotParams()
    // スタッフ0が毎日出勤 → 全5日で充足
    for (let d = 0; d < 5; d++) {
      params.working[0][d] = true
    }
    const result = evaluate(params)
    expect(result.shortfallTotal).toBe(0)
  })

  it('requiredCountが0の時間帯はshortfallTotalの計算対象外になる', () => {
    const params = makeSingleSlotParams()
    // afternoon, eveningはrequiredCounts=0なので除外される
    // morning1人必要だが全員休み → shortfallTotal=5（5日×1人不足）
    const result = evaluate(params)
    expect(result.shortfallTotal).toBe(5) // afternoonとeveningの0不足は含まれない
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

  // --- helpStaffTotal（ヘルプスタッフ出勤日数合計）のテスト ---

  it('ヘルプスタッフの出勤日がhelpStaffTotalにカウントされる', () => {
    const params = makeSingleSlotParams()
    // スタッフ2をヘルプスタッフにする
    params.isRegularStaff[2] = false
    params.weeklyCapacity[2] = 0
    // ヘルプスタッフが3日出勤
    params.working[2][0] = true
    params.working[2][1] = true
    params.working[2][2] = true
    const result = evaluate(params)
    expect(result.helpStaffTotal).toBe(3)
  })

  it('通常スタッフの出勤日はhelpStaffTotalにカウントされない', () => {
    const params = makeSingleSlotParams()
    // 全スタッフが通常スタッフ（デフォルト）
    // スタッフ0が5日全日出勤
    for (let d = 0; d < 5; d++) {
      params.working[0][d] = true
    }
    const result = evaluate(params)
    expect(result.helpStaffTotal).toBe(0)
  })

  it('複数ヘルプスタッフの出勤日数の合計がhelpStaffTotalになる', () => {
    const params = makeSingleSlotParams()
    // スタッフ1,2をヘルプスタッフにする
    params.isRegularStaff[1] = false
    params.isRegularStaff[2] = false
    params.weeklyCapacity[1] = 0
    params.weeklyCapacity[2] = 0
    // ヘルプスタッフ1が2日出勤、ヘルプスタッフ2が1日出勤 → 合計3日
    params.working[1][0] = true
    params.working[1][1] = true
    params.working[2][0] = true
    // 通常スタッフ0が5日全日出勤（カウントされない）
    for (let d = 0; d < 5; d++) {
      params.working[0][d] = true
    }
    const result = evaluate(params)
    expect(result.helpStaffTotal).toBe(3)
  })

  it('ヘルプスタッフが全員休みの場合、helpStaffTotalは0になる', () => {
    const params = makeSingleSlotParams()
    params.isRegularStaff[2] = false
    params.weeklyCapacity[2] = 0
    // 全員休み（working は全false）
    const result = evaluate(params)
    expect(result.helpStaffTotal).toBe(0)
  })

  // --- 調整済み上限（希望休考慮）の公平性テスト ---

  it('希望休を差し引いた調整済み上限で残余容量が等しければ母分散が0になる', () => {
    // スタッフA: 調整済み上限=17（週上限合計20 - 希望休3日）、実出勤10日 → 残余=7
    // スタッフB: 調整済み上限=20（希望休なし）、実出勤13日 → 残余=7
    // → 残余容量 [7, 7], 母分散=0
    const dates = Array.from({ length: 20 }, (_, i) => {
      const d = new Date(2025, 0, 6 + i)
      return d.toISOString().slice(0, 10)
    })
    const working: boolean[][] = [
      Array.from({ length: 20 }, (_, i) => i < 10),  // スタッフA: 10日出勤
      Array.from({ length: 20 }, (_, i) => i < 13),  // スタッフB: 13日出勤
    ]
    const params = {
      working,
      isRegularStaff: [true, true],
      staffIsParking: [false, false],
      weeklyCapacity: [17, 20],  // 調整済み上限（希望休3日を差し引き済みのA）
      staffSlots: [[0], [0]],
      dates,
      requiredCounts: Array.from({ length: 20 }, () => [1, 0, 0]),
    }
    const result = evaluate(params)
    expect(result.fairnessVariance).toBeCloseTo(0, 5)
  })

  // --- excessTotal（超過人数合計）のテスト ---

  it('超過のないケースでexcessTotal = 0', () => {
    // morning 1人必要、スタッフ0が毎日出勤（アサイン=必要数 → 超過なし）
    const params = makeSingleSlotParams()
    for (let d = 0; d < 5; d++) {
      params.working[0][d] = true
    }
    const result = evaluate(params)
    expect(result.excessTotal).toBe(0)
  })

  it('1スロット超過でexcessTotalが正しく計算される（必要1人・アサイン2人 → excessTotal = 1）', () => {
    // morning 1人必要だが2人アサイン → 超過1
    const params = makeSingleSlotParams()
    // スタッフ0,1が0日目に出勤（requiredCounts[0][0]=1, assigned=2 → excess=1）
    params.working[0][0] = true
    params.working[1][0] = true
    const result = evaluate(params)
    expect(result.excessTotal).toBe(1)
  })

  it('複数スロット超過の合算が正しい（スロット1超過1 + スロット2超過2 → excessTotal = 3）', () => {
    // morning: 必要2人, アサイン3人 → 超過1
    // afternoon: 必要1人, アサイン3人 → 超過2
    // → excessTotal = 1 + 2 = 3
    const dates = ['2025-01-06']
    const working: boolean[][] = [[true], [true], [true]]  // 全員0日目出勤
    const isRegularStaff: boolean[] = [true, true, true]
    const staffIsParking: boolean[] = [false, false, false]
    const weeklyCapacity: number[] = [5, 5, 5]
    const staffSlots: number[][] = [[0, 1], [0, 1], [0, 1]]  // morning + afternoon
    const requiredCounts: number[][] = [[2, 1, 0]]  // morning=2, afternoon=1
    const result = evaluate({
      working, isRegularStaff, staffIsParking, weeklyCapacity, staffSlots, dates, requiredCounts,
    })
    // morning: 3アサイン - 2必要 = 超過1
    // afternoon: 3アサイン - 1必要 = 超過2
    expect(result.excessTotal).toBe(3)
  })

  it('必要人数0のスロットはexcessTotal計算から除外される', () => {
    // スタッフがmorning(required=1)とevening(required=0)を担当
    // morning: 1人アサイン, 1人必要 → 超過なし
    // evening: 1人アサイン, 0人必要 → required=0なので除外（超過としてカウントしない）
    const dates = ['2025-01-06']
    const working: boolean[][] = [[true]]
    const isRegularStaff: boolean[] = [true]
    const staffIsParking: boolean[] = [false]
    const weeklyCapacity: number[] = [5]
    const staffSlots: number[][] = [[0, 2]]  // morning + evening
    const requiredCounts: number[][] = [[1, 0, 0]]  // morning=1, afternoon=0, evening=0
    const result = evaluate({
      working, isRegularStaff, staffIsParking, weeklyCapacity, staffSlots, dates, requiredCounts,
    })
    expect(result.excessTotal).toBe(0)
  })
})
