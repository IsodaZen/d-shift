// ルーティングベースの AppShell（React Router）
import { Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { ShiftPage } from './pages/ShiftPage'
import { StaffPage } from './pages/StaffPage'
import { SettingsPage } from './pages/SettingsPage'
import { AppHeader } from './components/AppHeader'

function AppContent() {
  const location = useLocation()
  const pathname = location.pathname

  // 現在のパスに対応するタイトルを返す
  const getTitle = () => {
    if (pathname.startsWith('/settings')) return '設定'
    if (pathname === '/shift') return 'シフト表'
    return 'スタッフ'
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <AppHeader title={getTitle()} />

      <main className="flex-1 overflow-auto">
        <Routes>
          <Route path="/" element={<StaffPage />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="/settings/:tab" element={<SettingsPage />} />
          <Route path="/shift" element={<ShiftPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
    </div>
  )
}

export default function App() {
  return <AppContent />
}
