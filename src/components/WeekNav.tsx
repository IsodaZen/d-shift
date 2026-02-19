// タスク8.1: 週ナビゲーションコンポーネント
import { format } from 'date-fns'
import { ja } from 'date-fns/locale'

interface WeekNavProps {
  weekStart: Date
  onPrev: () => void
  onNext: () => void
}

export function WeekNav({ weekStart, onPrev, onNext }: WeekNavProps) {
  const label = format(weekStart, 'yyyy年M月d日', { locale: ja }) + '週'

  return (
    <div className="flex items-center justify-between px-4 py-2 bg-white border-b border-gray-200">
      <button
        onClick={onPrev}
        className="p-2 rounded-full hover:bg-gray-100 active:bg-gray-200 text-gray-600 text-xl leading-none"
        aria-label="前の週"
      >
        ‹
      </button>
      <span className="text-sm font-medium text-gray-700">{label}</span>
      <button
        onClick={onNext}
        className="p-2 rounded-full hover:bg-gray-100 active:bg-gray-200 text-gray-600 text-xl leading-none"
        aria-label="次の週"
      >
        ›
      </button>
    </div>
  )
}
