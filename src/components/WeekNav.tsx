// タスク8.1: 週ナビゲーションコンポーネント
import { format, startOfWeek } from 'date-fns'
import { ja } from 'date-fns/locale'

interface WeekNavProps {
  weekStart: Date
  onPrev: () => void
  onNext: () => void
  minDate?: Date
  maxDate?: Date
}

export function WeekNav({ weekStart, onPrev, onNext, minDate, maxDate }: WeekNavProps) {
  const label = format(weekStart, 'yyyy年M月d日', { locale: ja }) + '週'

  const currentWeekStart = startOfWeek(weekStart, { weekStartsOn: 1 }).getTime()

  const isPrevDisabled =
    minDate !== undefined &&
    currentWeekStart <= startOfWeek(minDate, { weekStartsOn: 1 }).getTime()

  const isNextDisabled =
    maxDate !== undefined &&
    currentWeekStart >= startOfWeek(maxDate, { weekStartsOn: 1 }).getTime()

  return (
    <div className="flex items-center justify-between px-4 py-2 bg-white border-b border-gray-200">
      <button
        onClick={onPrev}
        disabled={isPrevDisabled}
        className="p-2 rounded-full hover:bg-gray-100 active:bg-gray-200 text-gray-600 text-xl leading-none disabled:opacity-30 disabled:cursor-not-allowed"
        aria-label="前の週"
      >
        ‹
      </button>
      <span className="text-sm font-medium text-gray-700">{label}</span>
      <button
        onClick={onNext}
        disabled={isNextDisabled}
        className="p-2 rounded-full hover:bg-gray-100 active:bg-gray-200 text-gray-600 text-xl leading-none disabled:opacity-30 disabled:cursor-not-allowed"
        aria-label="次の週"
      >
        ›
      </button>
    </div>
  )
}
