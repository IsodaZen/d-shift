import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent, within } from '@testing-library/react'
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

  it('週上限回数を0に変更して保存しようとするとエラーが表示される', () => {
    // spec: 週上限出勤回数に0以下の値を入力した場合は登録できない
    // within(container) でDOMをスコープし、fireEvent.submit でフォーム送信を確実にトリガー
    const { container } = renderForm()
    const q = within(container)

    fireEvent.change(q.getByPlaceholderText('山田 花子'), { target: { value: '山田 花子' } })
    fireEvent.change(q.getByRole('spinbutton'), { target: { value: '0' } })
    fireEvent.submit(container.querySelector('form')!)

    expect(q.getByText('1以上を入力してください')).toBeInTheDocument()
    expect(mockSubmit).not.toHaveBeenCalled()
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
