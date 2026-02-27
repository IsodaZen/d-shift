// Web Worker: シフト最適化処理をメインスレッドから分離して実行する
import { optimizeShift } from './shiftOptimizer'
import type { OptimizerInput, WorkerMessage } from '../types'

/** Worker に送信するメッセージの型（getRequiredCount を除き requiredCountMap で代替） */
type WorkerInput = {
  input: Omit<OptimizerInput, 'getRequiredCount'>
  allParkingSpots: string[]
  requiredCountMap: Record<string, number>
}

/**
 * Web Worker のメッセージハンドラ。
 * メインスレッドから OptimizerInput を受け取り、最適化を実行する。
 *
 * 入力メッセージ: { input: Omit<OptimizerInput, 'getRequiredCount'>, allParkingSpots, requiredCountMap }
 * 出力メッセージ:
 *   - { type: 'progress', progress: number } — 進捗通知
 *   - { type: 'result', assignments: ShiftAssignment[] } — 完了通知
 *   - { type: 'error', message: string } — エラー通知
 */
self.onmessage = (event: MessageEvent<WorkerInput>) => {
  const { input, allParkingSpots, requiredCountMap } = event.data
  // getRequiredCount は関数をシリアライズできないため、requiredCountMap から復元する
  const restoredInput: OptimizerInput = {
    ...input,
    getRequiredCount: (date, slot) => requiredCountMap[`${date}_${slot}`] ?? 0,
  }
  try {
    const assignments = optimizeShift(restoredInput, allParkingSpots, (progress) => {
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
