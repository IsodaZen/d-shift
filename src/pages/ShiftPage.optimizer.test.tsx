// --- spec: auto-shift-generation / 最適化統合テスト ---
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

// Web Worker をモック化
const mockWorkerPostMessage = vi.fn()
const mockWorkerTerminate = vi.fn()

class MockWorkerClass {
  onmessage: ((event: MessageEvent) => void) | null = null
  onerror: ((event: ErrorEvent) => void) | null = null
  postMessage = mockWorkerPostMessage
  terminate = mockWorkerTerminate

  simulateMessage(data: unknown) {
    if (this.onmessage) {
      this.onmessage({ data } as MessageEvent)
    }
  }
}

let latestWorker: MockWorkerClass

vi.stubGlobal('Worker', class {
  onmessage: ((event: MessageEvent) => void) | null = null
  onerror: ((event: ErrorEvent) => void) | null = null
  postMessage = mockWorkerPostMessage
  terminate = mockWorkerTerminate

  constructor() {
    latestWorker = this as unknown as MockWorkerClass
  }

  simulateMessage(data: unknown) {
    if (this.onmessage) {
      this.onmessage({ data } as MessageEvent)
    }
  }
})

// ShiftPage をインポート（vi.stubGlobal の後）
const { ShiftPage } = await import('./ShiftPage')

function setupStaff() {
  localStorage.setItem(
    'd-shift:staff',
    JSON.stringify([
      {
        id: 's1',
        name: '山田',
        maxWeeklyShifts: 5,
        availableSlots: ['morning', 'afternoon', 'evening'],
        usesParking: false,
      },
    ]),
  )
}

function setupShiftPeriod(startDate: string, endDate: string) {
  localStorage.setItem('d-shift:shift-period', JSON.stringify({ startDate, endDate }))
}

beforeEach(() => {
  localStorage.clear()
  vi.clearAllMocks()
})

describe('ShiftPage - 最適化統合', () => {
  describe('ローディング表示', () => {
    it('自動生成承認後にローディングインジケーターが表示される', async () => {
      const user = userEvent.setup()
      setupStaff()
      setupShiftPeriod('2025-02-03', '2025-02-03')

      render(<ShiftPage />)
      await user.click(screen.getByRole('button', { name: /自動生成/ }))

      // ローディング表示が開始される（最適化中）
      expect(screen.getByRole('status')).toBeInTheDocument()
    })

    it('最適化完了後にローディングが消えて不足通知ダイアログが表示される', async () => {
      const user = userEvent.setup()
      setupStaff()
      setupShiftPeriod('2025-02-03', '2025-02-03')

      render(<ShiftPage />)
      await user.click(screen.getByRole('button', { name: /自動生成/ }))

      // ローディング中
      expect(screen.getByRole('status')).toBeInTheDocument()

      // Workerから結果を送信
      await waitFor(() => {
        expect(latestWorker).toBeDefined()
      })

      latestWorker.simulateMessage({ type: 'result', assignments: [] })

      // ローディング解除・不足通知ダイアログ表示
      await waitFor(() => {
        expect(screen.queryByRole('status')).not.toBeInTheDocument()
      })
      expect(screen.getByRole('alertdialog')).toBeInTheDocument()
    })

    it('最適化中に進捗率が表示される', async () => {
      const user = userEvent.setup()
      setupStaff()
      setupShiftPeriod('2025-02-03', '2025-02-03')

      render(<ShiftPage />)
      await user.click(screen.getByRole('button', { name: /自動生成/ }))

      await waitFor(() => {
        expect(latestWorker).toBeDefined()
      })

      // Worker からプログレス通知
      latestWorker.simulateMessage({ type: 'progress', progress: 60 })

      await waitFor(() => {
        expect(screen.getByText('60%')).toBeInTheDocument()
      })
    })
  })

  describe('エラーハンドリング', () => {
    it('最適化エラー時はグリーディ結果がフォールバックとして使用される', async () => {
      const user = userEvent.setup()
      setupStaff()
      setupShiftPeriod('2025-02-03', '2025-02-03')

      render(<ShiftPage />)
      await user.click(screen.getByRole('button', { name: /自動生成/ }))

      await waitFor(() => {
        expect(latestWorker).toBeDefined()
      })

      // Worker からエラー通知
      latestWorker.simulateMessage({ type: 'error', message: 'テストエラー' })

      // ローディングが解除され、不足通知ダイアログが表示される
      await waitFor(() => {
        expect(screen.queryByRole('status')).not.toBeInTheDocument()
      })
      expect(screen.getByRole('alertdialog')).toBeInTheDocument()
    })
  })

  describe('既存アサインありの場合（上書き確認）', () => {
    it('既存アサインがある場合は確認ダイアログ承認後にローディングが始まる', async () => {
      const user = userEvent.setup()
      setupStaff()
      setupShiftPeriod('2025-02-03', '2025-02-03')
      // 既存アサインを追加
      localStorage.setItem(
        'd-shift:assignments',
        JSON.stringify([
          { id: 'a1', staffId: 's1', date: '2025-02-03', timeSlot: 'morning', parkingSpot: null, isLocked: false },
        ]),
      )

      render(<ShiftPage />)
      await user.click(screen.getByRole('button', { name: /自動生成/ }))

      // 確認ダイアログが表示される
      expect(screen.getByRole('dialog')).toBeInTheDocument()

      // 「上書きして生成」を押す
      await user.click(screen.getByRole('button', { name: /上書きして生成/ }))

      // ローディングが開始される
      expect(screen.getByRole('status')).toBeInTheDocument()
    })
  })
})
