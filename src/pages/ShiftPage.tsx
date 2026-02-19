// シフト表ページ
import { useState } from 'react'
import { addWeeks, subWeeks, startOfWeek } from 'date-fns'
import { WeekNav } from '../components/WeekNav'
import { ShiftTable } from '../components/ShiftTable'
import { useStaff } from '../hooks/useStaff'
import { useAssignments } from '../hooks/useAssignments'
import { useDayOffs } from '../hooks/useDayOffs'
import { useShiftConfig } from '../hooks/useShiftConfig'
import { useParkingConfig } from '../hooks/useParkingConfig'
import { useHelpAlert } from '../hooks/useHelpAlert'
import { getWeekDates } from '../utils/dateUtils'

export function ShiftPage() {
  const [weekStart, setWeekStart] = useState(() =>
    startOfWeek(new Date(), { weekStartsOn: 1 }),
  )
  const { staff } = useStaff()
  const { getAllSpots } = useParkingConfig()
  const { assignments, addAssignment, removeAssignment } = useAssignments(getAllSpots)
  const { dayOffs } = useDayOffs()
  const { configs } = useShiftConfig()

  const dates = getWeekDates(weekStart)
  const helpAlerts = useHelpAlert(dates, staff, assignments, dayOffs, configs)

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
      <WeekNav
        weekStart={weekStart}
        onPrev={() => setWeekStart((d) => subWeeks(d, 1))}
        onNext={() => setWeekStart((d) => addWeeks(d, 1))}
      />
      <ShiftTable
        dates={dates}
        staff={staff}
        assignments={assignments}
        dayOffs={dayOffs}
        helpAlerts={helpAlerts}
        onAddAssignment={addAssignment}
        onRemoveAssignment={removeAssignment}
      />
    </div>
  )
}
