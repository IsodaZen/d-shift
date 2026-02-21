import { format, startOfWeek, addDays, startOfMonth, endOfMonth, eachDayOfInterval, getDay, parseISO } from 'date-fns'
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

/**
 * 指定年のN番目の特定曜日の日を返す
 * @param year 年
 * @param month 月（1-12）
 * @param dayOfWeek 曜日（0=日曜〜6=土曜）
 * @param nth 何番目か（1始まり）
 */
function nthWeekdayOfMonth(year: number, month: number, dayOfWeek: number, nth: number): number {
  const first = new Date(year, month - 1, 1)
  const firstDay = first.getDay()
  const diff = (dayOfWeek - firstDay + 7) % 7
  return 1 + diff + (nth - 1) * 7
}

/**
 * 固定祝日（年を問わず同じ月日）の月・日リストを返す
 * ハッピーマンデー対象は含まない
 */
function getFixedHolidays(): Array<{ month: number; day: number }> {
  return [
    { month: 1, day: 1 },   // 元日
    { month: 2, day: 11 },  // 建国記念の日
    { month: 2, day: 23 },  // 天皇誕生日
    { month: 4, day: 29 },  // 昭和の日
    { month: 5, day: 3 },   // 憲法記念日
    { month: 5, day: 4 },   // みどりの日
    { month: 5, day: 5 },   // こどもの日
    { month: 8, day: 11 },  // 山の日
    { month: 11, day: 3 },  // 文化の日
    { month: 11, day: 23 }, // 勤労感謝の日
  ]
}

/**
 * 春分・秋分の日を計算する（概算式）
 * 春分: 3月20日〜21日、秋分: 9月22日〜23日
 */
function getVernalEquinox(year: number): number {
  // 春分の日の概算式（1900〜2099年対応）
  return Math.floor(20.8431 + 0.242194 * (year - 1980) - Math.floor((year - 1980) / 4))
}

function getAutumnalEquinox(year: number): number {
  // 秋分の日の概算式（1900〜2099年対応）
  return Math.floor(23.2488 + 0.242194 * (year - 1980) - Math.floor((year - 1980) / 4))
}

/**
 * 指定年のハッピーマンデーの日付リストを返す (YYYY-MM-DD形式)
 */
function getHappyMondayDates(year: number): string[] {
  const results: string[] = []

  // 成人の日: 1月第2月曜
  const seijin = nthWeekdayOfMonth(year, 1, 1, 2)
  results.push(`${year}-01-${String(seijin).padStart(2, '0')}`)

  // 海の日: 7月第3月曜
  const umi = nthWeekdayOfMonth(year, 7, 1, 3)
  results.push(`${year}-07-${String(umi).padStart(2, '0')}`)

  // 敬老の日: 9月第3月曜
  const keiro = nthWeekdayOfMonth(year, 9, 1, 3)
  results.push(`${year}-09-${String(keiro).padStart(2, '0')}`)

  // スポーツの日（旧体育の日）: 10月第2月曜
  const sports = nthWeekdayOfMonth(year, 10, 1, 2)
  results.push(`${year}-10-${String(sports).padStart(2, '0')}`)

  return results
}

/**
 * 指定年のすべての祝日（固定・ハッピーマンデー・春分・秋分）をセットで返す
 * 振替休日・国民の休日は含まない
 */
function getBasicHolidaysSet(year: number): Set<string> {
  const holidays = new Set<string>()

  // 固定祝日
  for (const { month, day } of getFixedHolidays()) {
    holidays.add(`${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`)
  }

  // 春分の日
  const vernal = getVernalEquinox(year)
  holidays.add(`${year}-03-${String(vernal).padStart(2, '0')}`)

  // 秋分の日
  const autumnal = getAutumnalEquinox(year)
  holidays.add(`${year}-09-${String(autumnal).padStart(2, '0')}`)

  // ハッピーマンデー
  for (const d of getHappyMondayDates(year)) {
    holidays.add(d)
  }

  return holidays
}

/**
 * 日付文字列 (YYYY-MM-DD) から Date オブジェクトを生成する
 */
function parseDate(dateStr: string): Date {
  return new Date(dateStr + 'T00:00:00')
}

/**
 * 日付文字列 (YYYY-MM-DD) から曜日を返す（0=日曜〜6=土曜）
 */
function getDayOfWeek(dateStr: string): number {
  return parseDate(dateStr).getDay()
}

/**
 * 日付を1日進めた文字列を返す
 */
function addOneDay(dateStr: string): string {
  const d = parseDate(dateStr)
  d.setDate(d.getDate() + 1)
  return format(d, 'yyyy-MM-dd')
}

/**
 * 指定年の振替休日・国民の休日を含む全祝日セットを返す
 */
function getAllHolidaysSet(year: number): Set<string> {
  const basicCurrent = getBasicHolidaysSet(year)
  const holidays = new Set<string>([...basicCurrent])

  // 振替休日: 基本祝日が日曜の場合、翌月曜が振替休日
  // 翌年の基本祝日も nextYearBasic に含めることで、振替先が翌年祝日と重なる場合を回避する
  // ※ 年をまたぐ振替（12月末の日曜祝日→翌年1月の振替）は非対応。
  //   日本の祝日カレンダーでは12月に祝日が存在しないため実用上問題なし。
  const nextYearBasic = getBasicHolidaysSet(year + 1)

  for (const holiday of basicCurrent) {
    const dow = getDayOfWeek(holiday)
    if (dow === 0) {
      // 日曜が祝日 → 翌月曜が振替
      let candidate = addOneDay(holiday)
      // 振替先がすでに祝日なら、さらに次の日へ（連休時の振替）
      while (holidays.has(candidate) || nextYearBasic.has(candidate)) {
        candidate = addOneDay(candidate)
      }
      // 振替先が翌年になる場合は対象外（実際には発生しない）
      if (candidate.startsWith(String(year))) {
        holidays.add(candidate)
      }
    }
  }

  // 国民の休日: 祝日に挟まれた平日（前後両方が祝日の平日）
  // シンプルに全日付をチェックする
  for (let month = 1; month <= 12; month++) {
    const daysInMonth = new Date(year, month, 0).getDate()
    for (let day = 2; day <= daysInMonth - 1; day++) {
      const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
      if (holidays.has(dateStr)) continue
      const dow = getDayOfWeek(dateStr)
      if (dow === 0 || dow === 6) continue // 土日はスキップ
      const prev = `${year}-${String(month).padStart(2, '0')}-${String(day - 1).padStart(2, '0')}`
      const next = `${year}-${String(month).padStart(2, '0')}-${String(day + 1).padStart(2, '0')}`
      if (holidays.has(prev) && holidays.has(next)) {
        holidays.add(dateStr)
      }
    }
  }

  return holidays
}

/**
 * 指定日付が日本の祝日かどうかを返す
 * @param dateStr YYYY-MM-DD 形式の日付文字列
 */
export function isJapaneseHoliday(dateStr: string): boolean {
  const year = parseInt(dateStr.substring(0, 4), 10)
  return getAllHolidaysSet(year).has(dateStr)
}

/**
 * 指定日付の種別を返す
 * @param dateStr YYYY-MM-DD 形式の日付文字列
 * @returns 'holiday' | 'sunday' | 'saturday' | 'weekday'
 */
export function getDayType(dateStr: string): 'weekday' | 'saturday' | 'sunday' | 'holiday' {
  if (isJapaneseHoliday(dateStr)) return 'holiday'
  const dow = getDayOfWeek(dateStr)
  if (dow === 0) return 'sunday'
  if (dow === 6) return 'saturday'
  return 'weekday'
}

/** periodDates から月一覧を取得（YYYY-MM 形式、昇順・重複なし） */
export function getCalendarMonths(periodDates: string[]): string[] {
  const months = new Set(periodDates.map((d) => d.slice(0, 7)))
  return Array.from(months).sort()
}

/** 指定月のカレンダーグリッド（日曜始まり）を生成する（null = 空セル） */
export function buildCalendarGrid(yearMonth: string): (string | null)[] {
  const date = parseISO(yearMonth + '-01')
  const start = startOfMonth(date)
  const end = endOfMonth(date)
  const days = eachDayOfInterval({ start, end }).map((d) => format(d, 'yyyy-MM-dd'))

  const firstDow = getDay(start)
  const grid: (string | null)[] = Array(firstDow).fill(null)
  grid.push(...days)

  while (grid.length % 7 !== 0) {
    grid.push(null)
  }

  return grid
}
