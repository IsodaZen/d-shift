// Web Worker を使ってシフト最適化を非同期実行するカスタムフック
import { useState, useRef, useCallback } from 'react'
import type { OptimizerInput, ShiftAssignment, WorkerMessage } from '../types'

export interface UseShiftOptimizerResult {
  /** 最適化処理中フラグ */
  isOptimizing: boolean
  /** 進捗（0〜100） */
  progress: number
  /** 最適化を開始する */
  optimize: (
    input: OptimizerInput,
    allParkingSpots: string[],
    onComplete: (assignments: ShiftAssignment[]) => void,
    onError?: () => void,
  ) => void
}

/**
 * Web Worker を使ったシフト最適化フック。
 * 最適化処理を非同期で実行し、進捗・完了・エラーを通知する。
 */
export function useShiftOptimizer(): UseShiftOptimizerResult {
  const [isOptimizing, setIsOptimizing] = useState(false)
  const [progress, setProgress] = useState(0)
  const workerRef = useRef<Worker | null>(null)

  const optimize = useCallback(
    (
      input: OptimizerInput,
      allParkingSpots: string[],
      onComplete: (assignments: ShiftAssignment[]) => void,
      onError?: () => void,
    ) => {
      // 既存のWorkerがあれば終了
      if (workerRef.current) {
        workerRef.current.terminate()
      }

      setIsOptimizing(true)
      setProgress(0)

      const worker = new Worker(
        new URL('../utils/shiftOptimizer.worker.ts', import.meta.url),
        { type: 'module' },
      )
      workerRef.current = worker

      worker.onmessage = (event: MessageEvent<WorkerMessage>) => {
        const msg = event.data
        if (msg.type === 'progress') {
          setProgress(msg.progress)
        } else if (msg.type === 'result') {
          setIsOptimizing(false)
          setProgress(100)
          worker.terminate()
          workerRef.current = null
          onComplete(msg.assignments)
        } else if (msg.type === 'error') {
          setIsOptimizing(false)
          worker.terminate()
          workerRef.current = null
          onError?.()
        }
      }

      worker.onerror = () => {
        setIsOptimizing(false)
        worker.terminate()
        workerRef.current = null
        onError?.()
      }

      // getRequiredCount は関数なので、Worker に送るために事前計算した形式に変換
      // Web Worker は関数を postMessage できないため、シリアライズ可能な形式で送る
      const serializableInput = {
        ...input,
        // getRequiredCount は Worker 内では再現できないため、事前計算したマップとして送る
        getRequiredCount: undefined,
        requiredCountMap: buildRequiredCountMap(input),
      }

      worker.postMessage({
        input: { ...serializableInput, getRequiredCount: null },
        allParkingSpots,
        requiredCountMap: buildRequiredCountMap(input),
      })
    },
    [],
  )

  return { isOptimizing, progress, optimize }
}

/**
 * getRequiredCount 関数を シリアライズ可能なマップに変換する。
 * Worker に渡すために使用する。
 */
function buildRequiredCountMap(
  input: OptimizerInput,
): Record<string, number> {
  const map: Record<string, number> = {}
  for (const date of input.periodDates) {
    for (const slot of ['morning', 'afternoon', 'evening'] as const) {
      map[`${date}_${slot}`] = input.getRequiredCount(date, slot)
    }
  }
  return map
}
