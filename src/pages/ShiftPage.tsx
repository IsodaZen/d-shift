// シフト表ページ
import { useState } from 'react'
import { addWeeks, subWeeks, startOfWeek, parseISO } from 'date-fns'
import { WeekNav } from '../components/WeekNav'
import { ShiftTable } from '../components/ShiftTable'
import { useStaff } from '../hooks/useStaff'
import { useAssignments } from '../hooks/useAssignments'
import { useDayOffs } from '../hooks/useDayOffs'
import { useShiftConfig } from '../hooks/useShiftConfig'
import { useParkingConfig } from '../hooks/useParkingConfig'
import { useHelpAlert } from '../hooks/useHelpAlert'
import { useShiftPeriod } from '../hooks/useShiftPeriod'
import { getWeekDates, getDefaultWeekStart } from '../utils/dateUtils'
import { generateAutoShift } from '../utils/autoShiftGenerator'

export function ShiftPage() {
  const { shiftPeriod, getPeriodDates } = useShiftPeriod()

  const [weekStart, setWeekStart] = useState(() => {
    if (shiftPeriod) {
      return startOfWeek(parseISO(shiftPeriod.startDate), { weekStartsOn: 1 })
    }
    return getDefaultWeekStart()
  })

  const [showConfirm, setShowConfirm] = useState(false)

  const { staff } = useStaff()
  const { getAllSpots } = useParkingConfig()
  const { assignments, addAssignment, removeAssignment, bulkSetAssignments } =
    useAssignments(getAllSpots)
  const { dayOffs } = useDayOffs()
  const { configs, getRequiredCount } = useShiftConfig()

  const dates = getWeekDates(weekStart)
  const helpAlerts = useHelpAlert(dates, staff, assignments, dayOffs, configs)

  const periodDates = getPeriodDates()

  const minDate = shiftPeriod ? parseISO(shiftPeriod.startDate) : undefined
  const maxDate = shiftPeriod ? parseISO(shiftPeriod.endDate) : undefined

  const handleAutoGenerate = () => {
    const hasExisting = periodDates.some((d) => assignments.some((a) => a.date === d))
    if (hasExisting) {
      setShowConfirm(true)
    } else {
      applyAutoShift()
    }
  }

  const applyAutoShift = () => {
    const newAssignments = generateAutoShift({
      periodDates,
      staff,
      dayOffs,
      getRequiredCount,
      allParkingSpots: getAllSpots(),
    })
    bulkSetAssignments(newAssignments, periodDates)
    setShowConfirm(false)
  }

  if (staff.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-gray-400 px-4">
        <p className="text-4xl mb-3">📅</p>
        <p className="text-sm font-medium">スタッフが登録されていません</p>
        <p className="text-xs mt-1 text-center">「スタッフ」タブからメンバーを追加してください</p>
      </div>
    )
  }

  return (
    <div>
      <div className="flex items-center gap-2">
        <div className="flex-1">
          <WeekNav
            weekStart={weekStart}
            onPrev={() => setWeekStart((d) => subWeeks(d, 1))}
            onNext={() => setWeekStart((d) => addWeeks(d, 1))}
            minDate={minDate}
            maxDate={maxDate}
          />
        </div>
        {shiftPeriod && (
          <button
            onClick={handleAutoGenerate}
            className="mr-3 px-3 py-1.5 bg-indigo-500 text-white text-sm font-medium rounded-lg hover:bg-indigo-600 whitespace-nowrap"
          >
            自動生成
          </button>
        )}
      </div>
      <ShiftTable
        dates={dates}
        staff={staff}
        assignments={assignments}
        dayOffs={dayOffs}
        helpAlerts={helpAlerts}
        onAddAssignment={addAssignment}
        onRemoveAssignment={removeAssignment}
        getRequiredCount={getRequiredCount}
      />

      {/* 上書き確認ダイアログ */}
      {showConfirm && (
        <div role="dialog" aria-modal="true" className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-xl">
            <p className="text-sm font-medium text-gray-800 mb-2">既存のアサインを上書きしますか？</p>
            <p className="text-xs text-gray-500 mb-5">
              シフト作成期間内のすべてのアサインが削除され、自動生成の結果に置き換えられます。
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowConfirm(false)}
                className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-600 hover:bg-gray-50"
              >
                キャンセル
              </button>
              <button
                onClick={applyAutoShift}
                className="flex-1 py-2.5 rounded-xl bg-indigo-500 text-white text-sm font-medium hover:bg-indigo-600"
              >
                上書きして生成
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
