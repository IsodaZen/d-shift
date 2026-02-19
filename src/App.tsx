// タスク1.3, 1.4: AppShell + タブ切り替え（ボトムナビゲーション）
import { useState } from 'react'
import { ShiftPage } from './pages/ShiftPage'
import { StaffPage } from './pages/StaffPage'
import { SettingsPage } from './pages/SettingsPage'

type Tab = 'shift' | 'staff' | 'settings'

const TABS: { id: Tab; label: string; icon: string }[] = [
  { id: 'shift', label: 'シフト表', icon: '📅' },
  { id: 'staff', label: 'スタッフ', icon: '👤' },
  { id: 'settings', label: '設定', icon: '⚙️' },
]

export default function App() {
  const [activeTab, setActiveTab] = useState<Tab>('shift')

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* ヘッダー */}
      <header className="bg-indigo-600 text-white px-4 py-3 safe-top">
        <h1 className="text-base font-bold tracking-wide">D-Shift</h1>
      </header>

      {/* コンテンツ */}
      <main className="flex-1 overflow-auto pb-20">
        {activeTab === 'shift' && <ShiftPage />}
        {activeTab === 'staff' && <StaffPage />}
        {activeTab === 'settings' && <SettingsPage />}
      </main>

      {/* ボトムナビゲーション */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 flex safe-bottom z-30">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={[
              'flex-1 flex flex-col items-center justify-center py-2 gap-0.5 transition-colors',
              activeTab === tab.id ? 'text-indigo-600' : 'text-gray-400',
            ].join(' ')}
          >
            <span className="text-xl leading-none">{tab.icon}</span>
            <span className="text-[10px] font-medium">{tab.label}</span>
          </button>
        ))}
      </nav>
    </div>
  )
}
