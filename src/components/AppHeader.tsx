// AppHeader: 全ページ共通ヘッダー（タイトル・アイコンナビゲーション）
import { useLocation, useNavigate } from 'react-router-dom'

interface AppHeaderProps {
  title: string
}

interface NavItem {
  label: string
  icon: string
  path: string
  /** アクティブ判定（pathname が startsWith で一致する場合も含む） */
  matchPrefix?: boolean
}

const NAV_ITEMS: NavItem[] = [
  { label: 'スタッフ', icon: '👤', path: '/' },
  { label: '設定', icon: '⚙️', path: '/settings', matchPrefix: true },
  { label: 'シフト表', icon: '📅', path: '/shift' },
]

export function AppHeader({ title }: AppHeaderProps) {
  const location = useLocation()
  const navigate = useNavigate()

  const isActive = (item: NavItem) => {
    if (item.matchPrefix) {
      return location.pathname === item.path || location.pathname.startsWith(item.path + '/')
    }
    return location.pathname === item.path
  }

  return (
    <header className="bg-indigo-600 text-white px-4 py-3 safe-top flex items-center justify-between">
      {/* 左エリア: ロゴ */}
      <span className="text-base font-bold tracking-wide">D-Shift</span>

      {/* 中央: ページタイトル */}
      <span className="text-sm font-semibold">{title}</span>

      {/* 右エリア: アイコンナビゲーション */}
      <nav className="flex items-center gap-1">
        {NAV_ITEMS.map((item) => (
          <button
            key={item.path}
            aria-label={item.label}
            onClick={() => navigate(item.path)}
            className={[
              'p-2 rounded-lg transition-colors text-lg leading-none',
              isActive(item) ? 'text-indigo-600 bg-white' : 'text-gray-400 hover:text-white',
            ].join(' ')}
          >
            {item.icon}
          </button>
        ))}
      </nav>
    </header>
  )
}
