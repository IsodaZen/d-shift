import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { NumberStepper } from './NumberStepper'

// --- spec: モバイル対応の数値入力コンポーネント ---

describe('NumberStepper', () => {
  it('現在の値が表示される', () => {
    render(<NumberStepper value={3} onChange={vi.fn()} />)
    expect(screen.getByText('3')).toBeInTheDocument()
  })

  it('+ボタンを押すと値が1増える', async () => {
    const onChange = vi.fn()
    const user = userEvent.setup()
    render(<NumberStepper value={3} onChange={onChange} />)

    await user.click(screen.getByRole('button', { name: '増やす' }))
    expect(onChange).toHaveBeenCalledWith(4)
  })

  it('-ボタンを押すと値が1減る', async () => {
    const onChange = vi.fn()
    const user = userEvent.setup()
    render(<NumberStepper value={3} onChange={onChange} />)

    await user.click(screen.getByRole('button', { name: '減らす' }))
    expect(onChange).toHaveBeenCalledWith(2)
  })

  it('min値に達している場合、-ボタンで値が変わらない', async () => {
    const onChange = vi.fn()
    const user = userEvent.setup()
    render(<NumberStepper value={0} onChange={onChange} min={0} />)

    await user.click(screen.getByRole('button', { name: '減らす' }))
    expect(onChange).not.toHaveBeenCalled()
  })

  it('max値に達している場合、+ボタンで値が変わらない', async () => {
    const onChange = vi.fn()
    const user = userEvent.setup()
    render(<NumberStepper value={20} onChange={onChange} max={20} />)

    await user.click(screen.getByRole('button', { name: '増やす' }))
    expect(onChange).not.toHaveBeenCalled()
  })

  it('min未指定の場合、0以上であれば-ボタンが動作する', async () => {
    const onChange = vi.fn()
    const user = userEvent.setup()
    render(<NumberStepper value={1} onChange={onChange} />)

    await user.click(screen.getByRole('button', { name: '減らす' }))
    expect(onChange).toHaveBeenCalledWith(0)
  })

  it('size="sm"でもボタンと値が表示される', () => {
    render(<NumberStepper value={5} onChange={vi.fn()} size="sm" />)
    expect(screen.getByText('5')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '増やす' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '減らす' })).toBeInTheDocument()
  })
})
