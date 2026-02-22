// spec: help-staff-management（カレンダーUIで稼働可能日付を設定できる）
import React, { useState } from 'react'
import { format, parseISO } from 'date-fns'
import { ja } from 'date-fns/locale'
import { getCalendarMonths, buildCalendarGrid } from '../utils/dateUtils'

interface HelpStaffAvailabilityCalendarProps {
  /** シフト期間内の日付一覧（YYYY-MM-DD） */
  periodDates: string[]
  /** 初期選択済み日付一覧 */
  selectedDates: string[]
  /** 保存コールバック */
  onSave: (dates: string[]) => void
}

const DAY_LABELS = ['日', '月', '火', '水', '木', '金', '土']

export const HelpStaffAvailabilityCalendar: React.FC<HelpStaffAvailabilityCalendarProps> = ({
  periodDates,
  selectedDates: initialSelectedDates,
  onSave,
}) => {
  const months = getCalendarMonths(periodDates)
  const [currentMonthIndex, setCurrentMonthIndex] = useState(0)
  const [selected, setSelected] = useState<Set<string>>(new Set(initialSelectedDates))

  const currentMonth = months[currentMonthIndex]
  const grid = buildCalendarGrid(currentMonth)

  const periodDateSet = new Set(periodDates)

  const isPrevDisabled = currentMonthIndex === 0
  const isNextDisabled = currentMonthIndex === months.length - 1

  const handleToggle = (date: string) => {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(date)) {
        next.delete(date)
      } else {
        next.add(date)
      }
      return next
    })
  }

  const handleSave = () => {
    onSave([...selected].sort())
  }

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
          const isSelected = selected.has(date)
          const dayNum = parseInt(date.slice(8), 10)

          return (
            <button
              key={date}
              onClick={() => inPeriod && handleToggle(date)}
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

      {/* 保存ボタン */}
      <div className="mt-3">
        <button
          onClick={handleSave}
          className="w-full bg-indigo-500 text-white py-2.5 rounded-lg text-sm font-medium hover:bg-indigo-600 active:bg-indigo-700"
        >
          保存
        </button>
      </div>
    </div>
  )
}
