import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { StaffForm } from './StaffForm'

// --- spec: staff-management / バリデーション ---

const mockSubmit = vi.fn()
const mockCancel = vi.fn()

const renderForm = () =>
  render(<StaffForm onSubmit={mockSubmit} onCancel={mockCancel} />)

describe('StaffForm', () => {
  beforeEach(() => {
    mockSubmit.mockClear()
    mockCancel.mockClear()
  })

  it('氏名を入力して保存するとonSubmitが呼ばれる', async () => {
    // spec: 必須項目を入力して登録できる
    const user = userEvent.setup()
    renderForm()

    await user.clear(screen.getByPlaceholderText('山田 花子'))
    await user.type(screen.getByPlaceholderText('山田 花子'), '鈴木 太郎')
    await user.click(screen.getByRole('button', { name: '保存' }))

    expect(mockSubmit).toHaveBeenCalledOnce()
    expect(mockSubmit).toHaveBeenCalledWith(
      expect.objectContaining({ name: '鈴木 太郎' }),
    )
  })

  it('氏名が空のまま保存しようとするとエラーメッセージが表示される', async () => {
    // spec: 氏名が未入力の場合は登録できない
    const user = userEvent.setup()
    renderForm()

    await user.clear(screen.getByPlaceholderText('山田 花子'))
    await user.click(screen.getByRole('button', { name: '保存' }))

    expect(screen.getByText('氏名は必須です')).toBeInTheDocument()
    expect(mockSubmit).not.toHaveBeenCalled()
  })

  it('週上限回数がmin値（1）のとき−ボタンが無効化され、値を減らせない', async () => {
    // spec: 週上限出勤回数に0以下の値を入力した場合は登録できない
    const user = userEvent.setup()
    renderForm()

    // デフォルト値は3なので、1になるまで−ボタンを押す
    const decrementBtn = screen.getByRole('button', { name: '減らす' })
    await user.click(decrementBtn) // 3→2
    await user.click(decrementBtn) // 2→1
    // 1のとき−ボタンが無効化されている
    expect(decrementBtn).toBeDisabled()
  })

  it('キャンセルボタンを押すとonCancelが呼ばれる', async () => {
    const user = userEvent.setup()
    renderForm()

    await user.click(screen.getByRole('button', { name: 'キャンセル' }))

    expect(mockCancel).toHaveBeenCalledOnce()
  })

  it('initialDataが渡された場合、既存の値がフォームに反映される', () => {
    render(
      <StaffForm
        initialData={{
          name: '既存 スタッフ',
          maxWeeklyShifts: 4,
          availableSlots: ['morning'],
          usesParking: true,
        }}
        onSubmit={mockSubmit}
        onCancel={mockCancel}
      />,
    )

    const nameInput = screen.getByPlaceholderText('山田 花子') as HTMLInputElement
    expect(nameInput.value).toBe('既存 スタッフ')
  })
})
