import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { HelpStaffForm } from './HelpStaffForm'

// --- spec: help-staff-management ---

const mockSubmit = vi.fn()
const mockCancel = vi.fn()

const renderForm = (props?: { initialData?: Parameters<typeof HelpStaffForm>[0]['initialData'] }) =>
  render(<HelpStaffForm onSubmit={mockSubmit} onCancel={mockCancel} {...props} />)

describe('HelpStaffForm', () => {
  beforeEach(() => {
    mockSubmit.mockClear()
    mockCancel.mockClear()
  })

  it('名前を入力して登録できる', async () => {
    // spec: 必須項目を入力してヘルプスタッフを登録できる
    const user = userEvent.setup()
    renderForm()

    await user.type(screen.getByPlaceholderText('田中 太郎'), 'ヘルプ 太郎')
    // デフォルトで全時間帯が選択されている
    await user.click(screen.getByRole('button', { name: '保存' }))

    expect(mockSubmit).toHaveBeenCalledOnce()
    expect(mockSubmit).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'ヘルプ 太郎' }),
    )
  })

  it('名前が空の場合はバリデーションエラーが表示される', async () => {
    // spec: 氏名が未入力の場合は登録できない
    const user = userEvent.setup()
    renderForm()

    await user.clear(screen.getByPlaceholderText('田中 太郎'))
    await user.click(screen.getByRole('button', { name: '保存' }))

    expect(screen.getByText('氏名は必須です')).toBeInTheDocument()
    expect(mockSubmit).not.toHaveBeenCalled()
  })

  it('出勤可能時間帯が未選択の場合はバリデーションエラーが表示される', async () => {
    // spec: 出勤可能時間帯が未選択の場合は登録できない
    const user = userEvent.setup()
    renderForm()

    await user.type(screen.getByPlaceholderText('田中 太郎'), 'テスト')
    // 全時間帯のチェックを外す
    await user.click(screen.getByLabelText('午前'))
    await user.click(screen.getByLabelText('午後'))
    await user.click(screen.getByLabelText('夕方'))
    await user.click(screen.getByRole('button', { name: '保存' }))

    expect(screen.getByText('出勤可能時間帯を1つ以上選択してください')).toBeInTheDocument()
    expect(mockSubmit).not.toHaveBeenCalled()
  })

  it('出勤可能時間帯を選択できる', async () => {
    const user = userEvent.setup()
    renderForm()

    await user.type(screen.getByPlaceholderText('田中 太郎'), 'テスト')
    // デフォルトで全選択されているので、夕方を外す
    await user.click(screen.getByLabelText('夕方'))
    await user.click(screen.getByRole('button', { name: '保存' }))

    expect(mockSubmit).toHaveBeenCalledWith(
      expect.objectContaining({
        availableSlots: ['morning', 'afternoon'],
      }),
    )
  })

  it('駐車場利用有無を設定できる', async () => {
    const user = userEvent.setup()
    renderForm()

    await user.type(screen.getByPlaceholderText('田中 太郎'), 'テスト')
    await user.click(screen.getByLabelText('駐車場を利用する'))
    await user.click(screen.getByRole('button', { name: '保存' }))

    expect(mockSubmit).toHaveBeenCalledWith(
      expect.objectContaining({ usesParking: true }),
    )
  })

  it('編集モードで既存値が初期表示される', () => {
    // spec: ヘルプスタッフ情報を変更して保存できる
    renderForm({
      initialData: {
        name: '既存 ヘルプ',
        availableSlots: ['morning'],
        usesParking: true,
      },
    })

    const nameInput = screen.getByPlaceholderText('田中 太郎') as HTMLInputElement
    expect(nameInput.value).toBe('既存 ヘルプ')
  })

  it('キャンセルボタンを押すとonCancelが呼ばれる', async () => {
    const user = userEvent.setup()
    renderForm()

    await user.click(screen.getByRole('button', { name: 'キャンセル' }))

    expect(mockCancel).toHaveBeenCalledOnce()
  })
})
