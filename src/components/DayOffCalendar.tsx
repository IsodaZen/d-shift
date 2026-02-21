// spec: preferred-day-off（カレンダーUIで希望休を編集・保存できる）
import React, { useState } from 'react'
import { format, parseISO } from 'date-fns'
import { ja } from 'date-fns/locale'
import { getCalendarMonths, buildCalendarGrid } from '../utils/dateUtils'

interface DayOffCalendarProps {
  /** シフト期間内の日付一覧（YYYY-MM-DD） */
  periodDates: string[]
  /** 選択中の日付一覧（外部 state） */
  selectedDates: string[]
  /** 日付タップ時のコールバック */
  onToggle: (date: string) => void
}

const DAY_LABELS = ['日', '月', '火', '水', '木', '金', '土']

export const DayOffCalendar: React.FC<DayOffCalendarProps> = ({ periodDates, selectedDates, onToggle }) => {
  const months = getCalendarMonths(periodDates)
  const [currentMonthIndex, setCurrentMonthIndex] = useState(0)

  const currentMonth = months[currentMonthIndex]
  const grid = buildCalendarGrid(currentMonth)

  const periodDateSet = new Set(periodDates)
  const selectedDateSet = new Set(selectedDates)

  const isPrevDisabled = currentMonthIndex === 0
  const isNextDisabled = currentMonthIndex === months.length - 1

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-3">
      {/* ヘッダー: 月ナビゲーション */}
      <div className="flex items-center justify-between mb-3">
        <button
          onClick={() => setCurrentMonthIndex((i) => i - 1)}
          disabled={isPrevDisabled}
          className={[
            'px-3 py-1 rounded text-sm font-medium transition-colors',
            isPrevDisabled ? 'text-gray-300 cursor-not-allowed' : 'text-indigo-600 hover:bg-indigo-50',
          ].join(' ')}
        >
          前月
        </button>

        <span className="text-sm font-semibold text-gray-700">
          {format(parseISO(currentMonth + '-01'), 'yyyy年M月', { locale: ja })}
        </span>

        <button
          onClick={() => setCurrentMonthIndex((i) => i + 1)}
          disabled={isNextDisabled}
          className={[
            'px-3 py-1 rounded text-sm font-medium transition-colors',
            isNextDisabled ? 'text-gray-300 cursor-not-allowed' : 'text-indigo-600 hover:bg-indigo-50',
          ].join(' ')}
        >
          翌月
        </button>
      </div>

      {/* 曜日ラベル */}
      <div className="grid grid-cols-7 mb-1">
        {DAY_LABELS.map((label, i) => (
          <div
            key={label}
            className={[
              'text-center text-xs font-medium py-1',
              i === 0 ? 'text-red-400' : i === 6 ? 'text-blue-400' : 'text-gray-500',
            ].join(' ')}
          >
            {label}
          </div>
        ))}
      </div>

      {/* 日付グリッド */}
      <div className="grid grid-cols-7 gap-y-1">
        {grid.map((date, idx) => {
          if (date === null) {
            return <div key={`empty-${idx}`} />
          }

          const inPeriod = periodDateSet.has(date)
          const isSelected = selectedDateSet.has(date)
          const dayNum = parseInt(date.slice(8), 10)

          return (
            <button
              key={date}
              onClick={() => inPeriod && onToggle(date)}
              disabled={!inPeriod}
              aria-label={String(dayNum)}
              className={[
                'w-full aspect-square flex items-center justify-center rounded-full text-sm transition-colors',
                inPeriod
                  ? isSelected
                    ? 'bg-indigo-500 text-white font-semibold'
                    : 'text-gray-800 hover:bg-indigo-50'
                  : 'text-gray-300 cursor-not-allowed',
              ].join(' ')}
            >
              {dayNum}
            </button>
          )
        })}
      </div>
    </div>
  )
}
