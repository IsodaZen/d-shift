import { describe, it, expect } from 'vitest'
import { isJapaneseHoliday, getDayType } from './dateUtils'

// --- spec: shift-schedule-view / 日本の祝日判定 ---

describe('isJapaneseHoliday', () => {
  it('元日（1月1日）は祝日と判定される', () => {
    expect(isJapaneseHoliday('2025-01-01')).toBe(true)
  })

  it('建国記念の日（2月11日）は祝日と判定される', () => {
    expect(isJapaneseHoliday('2025-02-11')).toBe(true)
  })

  it('ハッピーマンデー: 体育の日（10月第2月曜）は祝日と判定される', () => {
    // 2025年10月第2月曜 = 10月13日
    expect(isJapaneseHoliday('2025-10-13')).toBe(true)
  })

  it('振替休日: 祝日が日曜の場合、翌月曜は振替休日と判定される', () => {
    // 2025年2月11日（建国記念の日）は火曜なので振替なし
    // 2020年2月11日（建国記念の日）は火曜
    // 2024年2月12日: 建国記念の日（2/11）が日曜のため翌月曜が振替休日
    expect(isJapaneseHoliday('2024-02-12')).toBe(true)
  })

  it('国民の休日: 祝日に挟まれた平日は祝日と判定される', () => {
    // 2032年9月21日（月曜）: 敬老の日（9/20）と秋分の日（9/22）に挟まれた国民の休日
    expect(isJapaneseHoliday('2032-09-21')).toBe(true)
  })

  it('平日（月曜〜金曜で祝日でない日）は祝日と判定されない', () => {
    // 2025-01-06は月曜日、祝日でない
    expect(isJapaneseHoliday('2025-01-06')).toBe(false)
  })
})

// --- spec: shift-schedule-view / 日付タイプ取得 ---

describe('getDayType', () => {
  it('土曜日（祝日でない）は saturday を返す', () => {
    // 2025-01-04は土曜、祝日でない
    expect(getDayType('2025-01-04')).toBe('saturday')
  })

  it('日曜日（祝日でない）は sunday を返す', () => {
    // 2025-01-05は日曜、祝日でない
    expect(getDayType('2025-01-05')).toBe('sunday')
  })

  it('祝日（平日）は holiday を返す', () => {
    // 2025-01-01は元日（水曜）
    expect(getDayType('2025-01-01')).toBe('holiday')
  })

  it('祝日かつ土曜は holiday を返す（祝日が優先）', () => {
    // 2026-11-03は文化の日（火曜）。2020-11-03は文化の日（火）ではない
    // 2019-11-23は勤労感謝の日（土曜）
    expect(getDayType('2019-11-23')).toBe('holiday')
  })

  it('祝日かつ日曜は holiday を返す（祝日が優先）', () => {
    // 2024-02-11は建国記念の日（日曜）
    expect(getDayType('2024-02-11')).toBe('holiday')
  })

  it('平日は weekday を返す', () => {
    // 2025-01-06は月曜、祝日でない
    expect(getDayType('2025-01-06')).toBe('weekday')
  })
})
