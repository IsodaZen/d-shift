// --- spec: auto-shift-generation / ローディング表示 ---
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { OptimizingOverlay } from './OptimizingOverlay'

describe('OptimizingOverlay', () => {
  it('isOptimizing=true のとき表示される', () => {
    render(<OptimizingOverlay isOptimizing={true} progress={0} />)
    expect(screen.getByRole('status')).toBeInTheDocument()
  })

  it('isOptimizing=false のとき表示されない', () => {
    render(<OptimizingOverlay isOptimizing={false} progress={0} />)
    expect(screen.queryByRole('status')).not.toBeInTheDocument()
  })

  it('progress が表示される', () => {
    render(<OptimizingOverlay isOptimizing={true} progress={42} />)
    expect(screen.getByText('42%')).toBeInTheDocument()
  })

  it('progress が 0% のとき正しく表示される', () => {
    render(<OptimizingOverlay isOptimizing={true} progress={0} />)
    expect(screen.getByText('0%')).toBeInTheDocument()
  })

  it('progress が 100% のとき正しく表示される', () => {
    render(<OptimizingOverlay isOptimizing={true} progress={100} />)
    expect(screen.getByText('100%')).toBeInTheDocument()
  })

  it('プログレスバーの幅が progress に合わせて変化する', () => {
    const { rerender } = render(<OptimizingOverlay isOptimizing={true} progress={30} />)
    const progressBar = screen.getByRole('progressbar')
    expect(progressBar).toHaveAttribute('aria-valuenow', '30')

    rerender(<OptimizingOverlay isOptimizing={true} progress={80} />)
    expect(progressBar).toHaveAttribute('aria-valuenow', '80')
  })

  it('ローディングメッセージが表示される', () => {
    render(<OptimizingOverlay isOptimizing={true} progress={50} />)
    // シフトを最適化中であることを示すメッセージ
    expect(screen.getByText(/最適化中/)).toBeInTheDocument()
  })
})
