// --- spec: shift-optimization / useShiftOptimizer フック ---
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import type { OptimizerInput, ShiftAssignment } from '../types'

// Web Worker をモック化（クラスで定義してコンストラクタとして使えるようにする）
const mockPostMessage = vi.fn()
const mockTerminate = vi.fn()

class MockWorker {
  onmessage: ((event: MessageEvent) => void) | null = null
  onerror: ((event: ErrorEvent) => void) | null = null
  postMessage = mockPostMessage
  terminate = mockTerminate

  simulateMessage(data: unknown) {
    if (this.onmessage) {
      this.onmessage({ data } as MessageEvent)
    }
  }

  simulateError(message: string) {
    if (this.onerror) {
      this.onerror({ message } as ErrorEvent)
    }
  }
}

let mockWorkerInstance: MockWorker

vi.stubGlobal('Worker', class {
  onmessage: ((event: MessageEvent) => void) | null = null
  onerror: ((event: ErrorEvent) => void) | null = null
  postMessage = mockPostMessage
  terminate = mockTerminate

  constructor() {
    // eslint-disable-next-line @typescript-eslint/no-this-alias
    mockWorkerInstance = this as unknown as MockWorker
  }

  simulateMessage(data: unknown) {
    if (this.onmessage) {
      this.onmessage({ data } as MessageEvent)
    }
  }

  simulateError(message: string) {
    if (this.onerror) {
      this.onerror({ message } as ErrorEvent)
    }
  }
})

const makeInput = (): OptimizerInput => ({
  initialAssignments: [],
  staff: [],
  helpStaff: [],
  dayOffs: [],
  periodDates: [],
  getRequiredCount: () => 0,
  totalParkingSpots: 5,
  config: { maxIterations: 10 },
})

// フックをインポート（vi.stubGlobal の後に実行される）
const { useShiftOptimizer } = await import('./useShiftOptimizer')

describe('useShiftOptimizer', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('初期状態: isOptimizing=false, progress=0', () => {
    const { result } = renderHook(() => useShiftOptimizer())
    expect(result.current.isOptimizing).toBe(false)
    expect(result.current.progress).toBe(0)
  })

  it('optimize 呼び出しで isOptimizing=true になる', async () => {
    const { result } = renderHook(() => useShiftOptimizer())

    act(() => {
      result.current.optimize(makeInput(), [], vi.fn())
    })

    expect(result.current.isOptimizing).toBe(true)
  })

  it('progressメッセージで progress が更新される', async () => {
    const { result } = renderHook(() => useShiftOptimizer())

    act(() => {
      result.current.optimize(makeInput(), [], vi.fn())
    })

    act(() => {
      mockWorkerInstance.simulateMessage({ type: 'progress', progress: 50 })
    })

    expect(result.current.progress).toBe(50)
  })

  it('resultメッセージで最適化完了・isOptimizing=false になる', async () => {
    const onComplete = vi.fn()
    const { result } = renderHook(() => useShiftOptimizer())

    act(() => {
      result.current.optimize(makeInput(), [], onComplete)
    })

    const assignments: ShiftAssignment[] = []
    act(() => {
      mockWorkerInstance.simulateMessage({ type: 'result', assignments })
    })

    expect(result.current.isOptimizing).toBe(false)
    expect(result.current.progress).toBe(100)
    expect(onComplete).toHaveBeenCalledWith(assignments)
  })

  it('errorメッセージでフォールバックが呼ばれる', async () => {
    const onError = vi.fn()
    const { result } = renderHook(() => useShiftOptimizer())

    act(() => {
      result.current.optimize(makeInput(), [], vi.fn(), onError)
    })

    act(() => {
      mockWorkerInstance.simulateMessage({ type: 'error', message: 'テストエラー' })
    })

    expect(result.current.isOptimizing).toBe(false)
    expect(onError).toHaveBeenCalled()
  })

  it('Worker.onerror イベントでフォールバックが呼ばれる', async () => {
    // Worker.onerror（ネットワーク障害やWorkerロード失敗など）でもエラーハンドラが呼ばれる
    const onError = vi.fn()
    const { result } = renderHook(() => useShiftOptimizer())

    act(() => {
      result.current.optimize(makeInput(), [], vi.fn(), onError)
    })

    act(() => {
      mockWorkerInstance.simulateError('Worker load error')
    })

    expect(result.current.isOptimizing).toBe(false)
    expect(onError).toHaveBeenCalled()
  })

  it('optimize 呼び出し時に requiredCountMap を含むメッセージを Worker に送信する', () => {
    const { result } = renderHook(() => useShiftOptimizer())
    const input: OptimizerInput = {
      initialAssignments: [],
      staff: [],
      helpStaff: [],
      dayOffs: [],
      periodDates: ['2025-01-06'],
      getRequiredCount: (_date, slot) => (slot === 'morning' ? 2 : 0),
      totalParkingSpots: 5,
    }

    act(() => {
      result.current.optimize(input, ['A1'], vi.fn())
    })

    // Worker に送信されたメッセージに requiredCountMap が含まれる
    expect(mockPostMessage).toHaveBeenCalledTimes(1)
    const sentMessage = mockPostMessage.mock.calls[0][0]
    expect(sentMessage).toHaveProperty('requiredCountMap')
    expect(sentMessage.requiredCountMap['2025-01-06_morning']).toBe(2)
    expect(sentMessage.requiredCountMap['2025-01-06_afternoon']).toBe(0)
    // getRequiredCount 関数自体は送信されない
    expect(sentMessage.input).not.toHaveProperty('getRequiredCount')
  })
})
