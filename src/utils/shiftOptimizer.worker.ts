// Web Worker: シフト最適化処理をメインスレッドから分離して実行する
import { optimizeShift } from './shiftOptimizer'
import type { OptimizerInput, WorkerMessage } from '../types'

/**
 * Web Worker のメッセージハンドラ。
 * メインスレッドから OptimizerInput を受け取り、最適化を実行する。
 *
 * 入力メッセージ: { input: OptimizerInput; allParkingSpots: string[] }
 * 出力メッセージ:
 *   - { type: 'progress', progress: number } — 進捗通知
 *   - { type: 'result', assignments: ShiftAssignment[] } — 完了通知
 *   - { type: 'error', message: string } — エラー通知
 */
self.onmessage = (
  event: MessageEvent<{ input: OptimizerInput; allParkingSpots: string[] }>,
) => {
  const { input, allParkingSpots } = event.data
  try {
    const assignments = optimizeShift(input, allParkingSpots, (progress) => {
      const msg: WorkerMessage = { type: 'progress', progress }
      self.postMessage(msg)
    })
    const result: WorkerMessage = { type: 'result', assignments }
    self.postMessage(result)
  } catch (err) {
    const errorMsg: WorkerMessage = {
      type: 'error',
      message: err instanceof Error ? err.message : '最適化中に予期しないエラーが発生しました',
    }
    self.postMessage(errorMsg)
  }
}
