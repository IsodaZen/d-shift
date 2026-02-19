import { format, startOfWeek, addDays } from 'date-fns'
import { ja } from 'date-fns/locale'

export function getWeekDates(weekStart: Date): string[] {
  return Array.from({ length: 7 }, (_, i) =>
    format(addDays(weekStart, i), 'yyyy-MM-dd'),
  )
}

export function getDefaultWeekStart(): Date {
  return startOfWeek(new Date(), { weekStartsOn: 1 })
}

export function formatDateLabel(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00')
  return format(d, 'M/d(E)', { locale: ja })
}
