import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import App from './App'

// --- spec: screen-navigation / App ルーティング ---

beforeEach(() => {
  localStorage.clear()
})

function renderApp(initialPath: string) {
  return render(
    <MemoryRouter initialEntries={[initialPath]}>
      <App />
    </MemoryRouter>,
  )
}

describe('App ルーティング', () => {
  it('/ → StaffPage が表示される（スタッフ管理見出し）', () => {
    renderApp('/')
    expect(screen.getByText('スタッフ管理')).toBeInTheDocument()
  })

  it('/settings → SettingsPage が表示される（シフト期間タブ）', () => {
    renderApp('/settings')
    expect(screen.getByRole('button', { name: 'シフト期間' })).toBeInTheDocument()
  })

  it('/shift → ShiftPage が表示される（シフト表見出し）', () => {
    renderApp('/shift')
    expect(screen.getByText('シフト表')).toBeInTheDocument()
  })

  it('未定義パス /foo → StaffPage にフォールバックする', () => {
    renderApp('/foo')
    expect(screen.getByText('スタッフ管理')).toBeInTheDocument()
  })
})
