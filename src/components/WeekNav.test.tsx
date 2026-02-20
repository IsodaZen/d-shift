import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { WeekNav } from './WeekNav'

// --- spec: shift-schedule-view / 週ナビゲーションをシフト作成期間内に制限する ---

// 2025-02-03(月) を含む週: 2025-02-03〜2025-02-09
const weekOf0203 = new Date('2025-02-03T00:00:00')
// 2025-01-27(月) を含む週: 2025-01-27〜2025-02-02
const weekOf0127 = new Date('2025-01-27T00:00:00')

describe('WeekNav', () => {
  describe('期間制限なし（従来動作）', () => {
    it('前後の週ナビボタンが表示される', () => {
      render(<WeekNav weekStart={weekOf0203} onPrev={vi.fn()} onNext={vi.fn()} />)
      expect(screen.getByLabelText('前の週')).toBeInTheDocument()
      expect(screen.getByLabelText('次の週')).toBeInTheDocument()
    })

    it('minDate/maxDate未指定時は両ボタンが有効', () => {
      render(<WeekNav weekStart={weekOf0203} onPrev={vi.fn()} onNext={vi.fn()} />)
      expect(screen.getByLabelText('前の週')).not.toBeDisabled()
      expect(screen.getByLabelText('次の週')).not.toBeDisabled()
    })
  })

  describe('期間制限あり', () => {
    it('表示週がminDateを含む週のとき「前の週」ボタンが無効になる', () => {
      // spec: 開始週では「前の週」ボタンが無効化される
      // minDate=2025-02-01(土) → その週の月曜=2025-01-27 → weekStart=2025-01-27 が開始週
      render(
        <WeekNav
          weekStart={weekOf0127}
          onPrev={vi.fn()}
          onNext={vi.fn()}
          minDate={new Date('2025-02-01T00:00:00')}
          maxDate={new Date('2025-02-28T00:00:00')}
        />,
      )
      expect(screen.getByLabelText('前の週')).toBeDisabled()
      expect(screen.getByLabelText('次の週')).not.toBeDisabled()
    })

    it('表示週がmaxDateを含む週のとき「次の週」ボタンが無効になる', () => {
      // spec: 終了週では「次の週」ボタンが無効化される
      // maxDate=2025-02-05(水) → その週の月曜=2025-02-03 → weekStart=2025-02-03 が終了週
      render(
        <WeekNav
          weekStart={weekOf0203}
          onPrev={vi.fn()}
          onNext={vi.fn()}
          minDate={new Date('2025-01-01T00:00:00')}
          maxDate={new Date('2025-02-05T00:00:00')}
        />,
      )
      expect(screen.getByLabelText('前の週')).not.toBeDisabled()
      expect(screen.getByLabelText('次の週')).toBeDisabled()
    })

    it('期間内の中間週では両ボタンが有効', () => {
      // spec: 期間内の中間週では両方のボタンが有効である
      // weekStart=2025-02-03, minDate週=2025-01-27, maxDate週=2025-02-10 → 中間
      render(
        <WeekNav
          weekStart={weekOf0203}
          onPrev={vi.fn()}
          onNext={vi.fn()}
          minDate={new Date('2025-01-27T00:00:00')}
          maxDate={new Date('2025-02-10T00:00:00')}
        />,
      )
      expect(screen.getByLabelText('前の週')).not.toBeDisabled()
      expect(screen.getByLabelText('次の週')).not.toBeDisabled()
    })

    it('無効な「前の週」ボタンを押してもonPrevは呼ばれない', async () => {
      const user = userEvent.setup()
      const mockPrev = vi.fn()
      // weekStart=開始週のため prevDisabled
      render(
        <WeekNav
          weekStart={weekOf0127}
          onPrev={mockPrev}
          onNext={vi.fn()}
          minDate={new Date('2025-01-28T00:00:00')}
          maxDate={new Date('2025-02-28T00:00:00')}
        />,
      )
      // disabled ボタンはクリックイベントが発生しないことを確認
      await user.click(screen.getByLabelText('前の週'))
      expect(mockPrev).not.toHaveBeenCalled()
    })
  })
})
