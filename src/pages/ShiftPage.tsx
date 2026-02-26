// シフト表ページ
import { useState } from 'react'
import { addWeeks, subWeeks, startOfWeek, parseISO, format } from 'date-fns'
import { ja } from 'date-fns/locale'
import { WeekNav } from '../components/WeekNav'
import { ShiftTable } from '../components/ShiftTable'
import { useStaff } from '../hooks/useStaff'
import { useAssignments } from '../hooks/useAssignments'
import { useDayOffs } from '../hooks/useDayOffs'
import { useShiftConfig } from '../hooks/useShiftConfig'
import { useParkingConfig } from '../hooks/useParkingConfig'
import { useHelpAlert } from '../hooks/useHelpAlert'
import { useShiftPeriod } from '../hooks/useShiftPeriod'
import { useHelpStaff } from '../hooks/useHelpStaff'
import { getWeekDates, getDefaultWeekStart } from '../utils/dateUtils'
import { generateAutoShift } from '../utils/autoShiftGenerator'
import { ALL_TIME_SLOTS, TIME_SLOT_LABELS, type TimeSlot } from '../types'

interface ShortageEntry {
  date: string
  slot: TimeSlot
  shortage: number
}

export function ShiftPage() {
  const { shiftPeriod, getPeriodDates } = useShiftPeriod()

  const [weekStart, setWeekStart] = useState(() => {
    if (shiftPeriod) {
      return startOfWeek(parseISO(shiftPeriod.startDate), { weekStartsOn: 1 })
    }
    return getDefaultWeekStart()
  })

  const [showConfirm, setShowConfirm] = useState(false)
  const [shortageEntries, setShortageEntries] = useState<ShortageEntry[] | null>(null)

  const { staff } = useStaff()
  const { getAllSpots } = useParkingConfig()
  const { assignments, addAssignment, removeAssignment, bulkSetAssignments, setCellLocked } =
    useAssignments(getAllSpots)
  const { dayOffs } = useDayOffs()
  const { configs, getRequiredCount } = useShiftConfig()
  const { helpStaff } = useHelpStaff()

  const dates = getWeekDates(weekStart)
  const helpAlerts = useHelpAlert(dates, staff, assignments, dayOffs, configs, helpStaff)

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
    // 固定アサインがあるスタッフ・日付を収集する
    const lockedStaffDates = new Set(
      assignments
        .filter((a) => a.isLocked && periodDates.includes(a.date))
        .map((a) => `${a.staffId}_${a.date}`),
    )
    // 固定アサイン一覧（remaining カウント算入に使用）
    const lockedAssignments = assignments.filter((a) => a.isLocked && periodDates.includes(a.date))

    const newAssignments = generateAutoShift({
      periodDates,
      staff,
      dayOffs,
      getRequiredCount,
      allParkingSpots: getAllSpots(),
      helpStaff,
      lockedStaffDates,
      lockedAssignments,
    })
    bulkSetAssignments(newAssignments, periodDates)
    setShowConfirm(false)

    // 不足チェック: 必要人数を満たせなかった日付・時間帯を収集
    const shortages: ShortageEntry[] = []
    for (const date of periodDates) {
      for (const slot of ALL_TIME_SLOTS) {
        const required = getRequiredCount(date, slot)
        if (required <= 0) continue
        // 固定アサインも含めて充足チェックする
        const assigned = [...lockedAssignments, ...newAssignments].filter(
          (a) => a.date === date && a.timeSlot === slot,
        ).length
        if (assigned < required) {
          shortages.push({ date, slot, shortage: required - assigned })
        }
      }
    }
    setShortageEntries(shortages)
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
        helpStaff={helpStaff}
        onAddAssignment={addAssignment}
        onRemoveAssignment={removeAssignment}
        onSetCellLocked={setCellLocked}
        getRequiredCount={getRequiredCount}
      />

      {/* 自動生成後の不足通知 */}
      {shortageEntries !== null && (
        <div role="alertdialog" aria-modal="true" className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-xl max-h-[80vh] flex flex-col">
            <p className="text-sm font-medium text-gray-800 mb-3">自動生成が完了しました</p>
            {shortageEntries.length === 0 ? (
              <p className="text-sm text-green-600">必要人数をすべて満たしました</p>
            ) : (
              <>
                <p className="text-xs text-gray-500 mb-2">必要人数を満たせなかった時間帯：</p>
                <ul className="overflow-y-auto space-y-1 flex-1">
                  {shortageEntries.map((e) => (
                    <li key={`${e.date}-${e.slot}`} className="text-xs text-gray-700 flex justify-between">
                      <span>
                        {format(new Date(e.date + 'T00:00:00'), 'M月d日(E)', { locale: ja })}
                        　{TIME_SLOT_LABELS[e.slot]}
                      </span>
                      <span className="text-red-500 font-medium">不足{e.shortage}人</span>
                    </li>
                  ))}
                </ul>
              </>
            )}
            <button
              onClick={() => setShortageEntries(null)}
              className="mt-4 w-full py-2.5 rounded-xl bg-indigo-500 text-white text-sm font-medium hover:bg-indigo-600"
            >
              閉じる
            </button>
          </div>
        </div>
      )}

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
