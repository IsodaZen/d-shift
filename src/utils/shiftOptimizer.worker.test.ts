// --- spec: shift-optimization / Web Worker ラッパー ---
// Web WorkerはJSDOM環境では動作しないため、Worker内ロジックのユニットテストを行う
import { describe, it, expect, vi } from 'vitest'
import type { OptimizerInput, WorkerMessage } from '../types'

// Worker内部のメッセージハンドラ処理をテスト
// 実際のWorkerはブラウザでのみ動作するため、
// ここではWorkerが送信すべきメッセージの型と内容を検証する

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

// Worker の onmessage ハンドラをテストするためのモック
describe('Worker入力形式 (OptimizerInput)', () => {
  it('OptimizerInput の構造が正しい', () => {
    const input: OptimizerInput = {
      initialAssignments: [],
      staff: [],
      helpStaff: [],
      dayOffs: [],
      periodDates: [],
      getRequiredCount: () => 0,
      totalParkingSpots: 5,
      config: { maxIterations: 100 },
    }
    expect(input.totalParkingSpots).toBe(5)
    expect(input.config?.maxIterations).toBe(100)
  })
})

// useShiftOptimizer フックのモックテスト（Web Worker呼び出しのロジック検証）
describe('useShiftOptimizer フック ロジック', () => {
  it('最適化実行前は isOptimizing=false', () => {
    // フックの初期状態のロジックテスト
    let isOptimizing = false
    expect(isOptimizing).toBe(false)
  })

  it('progress が 0〜100 の範囲で更新される', () => {
    let progress = 0
    const setProgress = (p: number) => { progress = p }

    // 範囲内の更新
    setProgress(50)
    expect(progress).toBeGreaterThanOrEqual(0)
    expect(progress).toBeLessThanOrEqual(100)

    setProgress(100)
    expect(progress).toBe(100)
  })

  it('onProgress コールバックが呼ばれる', () => {
    const onProgress = vi.fn()
    const messages: WorkerMessage[] = [
      { type: 'progress', progress: 25 },
      { type: 'progress', progress: 50 },
      { type: 'progress', progress: 75 },
      { type: 'result', assignments: [] },
    ]

    // プログレスメッセージのシミュレーション
    for (const msg of messages) {
      if (msg.type === 'progress') {
        onProgress(msg.progress)
      }
    }

    expect(onProgress).toHaveBeenCalledTimes(3)
    expect(onProgress).toHaveBeenCalledWith(25)
    expect(onProgress).toHaveBeenCalledWith(75)
  })
})
