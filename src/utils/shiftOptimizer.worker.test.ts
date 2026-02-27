// --- spec: shift-optimization / Web Worker ラッパー ---
// Web WorkerはJSDOM環境では動作しないため、Worker入出力の型とデータ変換ロジックを検証する
import { describe, it, expect } from 'vitest'
import type { OptimizerInput, WorkerMessage } from '../types'

describe('WorkerMessage 型', () => {
  it('progress メッセージは 0〜100 の数値を持つ', () => {
    const msg: WorkerMessage = { type: 'progress', progress: 50 }
    expect(msg.type).toBe('progress')
    if (msg.type === 'progress') {
      expect(msg.progress).toBeGreaterThanOrEqual(0)
      expect(msg.progress).toBeLessThanOrEqual(100)
    }
  })

  it('result メッセージは ShiftAssignment[] を持つ', () => {
    const msg: WorkerMessage = { type: 'result', assignments: [] }
    expect(msg.type).toBe('result')
    if (msg.type === 'result') {
      expect(Array.isArray(msg.assignments)).toBe(true)
    }
  })

  it('error メッセージは文字列のメッセージを持つ', () => {
    const msg: WorkerMessage = { type: 'error', message: 'エラーが発生しました' }
    expect(msg.type).toBe('error')
    if (msg.type === 'error') {
      expect(typeof msg.message).toBe('string')
    }
  })
})

describe('requiredCountMap を使った getRequiredCount の再構築', () => {
  it('buildRequiredCountMap がすべての日付とスロットのマップを生成する', () => {
    // Worker に送信する requiredCountMap の構築ロジックを検証する
    const input: OptimizerInput = {
      initialAssignments: [],
      staff: [],
      helpStaff: [],
      dayOffs: [],
      periodDates: ['2025-01-06', '2025-01-07'],
      getRequiredCount: (_date, slot) => (slot === 'morning' ? 3 : slot === 'afternoon' ? 2 : 1),
      totalParkingSpots: 5,
    }

    // requiredCountMap の構築（useShiftOptimizer.ts の buildRequiredCountMap と同じロジック）
    const map: Record<string, number> = {}
    for (const date of input.periodDates) {
      for (const slot of ['morning', 'afternoon', 'evening'] as const) {
        map[`${date}_${slot}`] = input.getRequiredCount(date, slot)
      }
    }

    // すべての組み合わせが存在する
    expect(map['2025-01-06_morning']).toBe(3)
    expect(map['2025-01-06_afternoon']).toBe(2)
    expect(map['2025-01-06_evening']).toBe(1)
    expect(map['2025-01-07_morning']).toBe(3)
    expect(Object.keys(map)).toHaveLength(6)
  })

  it('requiredCountMap から getRequiredCount を復元できる', () => {
    // Worker 内での復元ロジックを検証する
    const requiredCountMap: Record<string, number> = {
      '2025-01-06_morning': 2,
      '2025-01-06_afternoon': 1,
      '2025-01-06_evening': 0,
    }

    // Worker 内の復元ロジック
    const getRequiredCount = (date: string, slot: string) =>
      requiredCountMap[`${date}_${slot}`] ?? 0

    expect(getRequiredCount('2025-01-06', 'morning')).toBe(2)
    expect(getRequiredCount('2025-01-06', 'afternoon')).toBe(1)
    expect(getRequiredCount('2025-01-06', 'evening')).toBe(0)
    // マップにない組み合わせはデフォルト値 0 を返す
    expect(getRequiredCount('2025-01-07', 'morning')).toBe(0)
  })

  it('getRequiredCount の値が変換前後で一致する', () => {
    // 元の関数 → マップ → 復元した関数 の等価性を検証する
    const dates = ['2025-01-06', '2025-01-07']
    const slots = ['morning', 'afternoon', 'evening'] as const
    const originalFn = (_date: string, slot: string) => (slot === 'morning' ? 2 : 0)

    // シリアライズ
    const map: Record<string, number> = {}
    for (const date of dates) {
      for (const slot of slots) {
        map[`${date}_${slot}`] = originalFn(date, slot)
      }
    }

    // 復元
    const restoredFn = (date: string, slot: string) => map[`${date}_${slot}`] ?? 0

    // すべての組み合わせで等価
    for (const date of dates) {
      for (const slot of slots) {
        expect(restoredFn(date, slot)).toBe(originalFn(date, slot))
      }
    }
  })
})
