// タスク5.1〜5.4, 6.1〜6.4: SettingsPage（シフト期間・シフト枠・駐車場・希望休設定）
import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useShiftConfig } from '../hooks/useShiftConfig'
import { useParkingConfig } from '../hooks/useParkingConfig'
import { useDayOffs } from '../hooks/useDayOffs'
import { useStaff } from '../hooks/useStaff'
import { useShiftPeriod } from '../hooks/useShiftPeriod'
import { ALL_TIME_SLOTS, TIME_SLOT_LABELS } from '../types'
import { format, parseISO, differenceInCalendarDays } from 'date-fns'
import { ja } from 'date-fns/locale'

type Tab = 'period' | 'shift' | 'dayoff' | 'parking'

const VALID_TABS: Tab[] = ['period', 'shift', 'dayoff', 'parking']

export function SettingsPage() {
  const { tab: tabParam } = useParams<{ tab?: string }>()
  const navigate = useNavigate()

  // 不正なタブパラメーターは 'period' にフォールバック
  const activeTab: Tab = VALID_TABS.includes(tabParam as Tab) ? (tabParam as Tab) : 'period'

  const { getRequiredCount, setRequiredCount } = useShiftConfig()
  const { parkingConfig, updateSlotCount } = useParkingConfig()
  const { dayOffs, addDayOff, deleteDayOff } = useDayOffs()
  const { staff } = useStaff()
  const { shiftPeriod, setShiftPeriod, clearShiftPeriod, getPeriodDates, isShiftPeriodSaved } = useShiftPeriod()

  // シフト期間フォーム
  const [periodStart, setPeriodStart] = useState(shiftPeriod.startDate)
  const [periodEnd, setPeriodEnd] = useState(shiftPeriod.endDate)
  const [periodError, setPeriodError] = useState('')

  // 希望休登録フォーム
  const [dayOffStaffId, setDayOffStaffId] = useState('')
  const [dayOffDate, setDayOffDate] = useState('')
  const [dayOffError, setDayOffError] = useState('')

  const periodDates = getPeriodDates()

  const handleTabChange = (tab: Tab) => {
    navigate(`/settings/${tab}`)
  }

  const handleSavePeriod = () => {
    if (!periodStart || !periodEnd) return

    const start = parseISO(periodStart)
    const end = parseISO(periodEnd)

    if (start > end) {
      setPeriodError('開始日は終了日以前の日付を指定してください')
      return
    }

    const dayDiff = differenceInCalendarDays(end, start)
    if (dayDiff > 34) {
      setPeriodError('期間は35日以内で設定してください')
      return
    }

    setPeriodError('')
    setShiftPeriod({ startDate: periodStart, endDate: periodEnd })
  }

  const handleClearPeriod = () => {
    clearShiftPeriod()
    setPeriodStart('')
    setPeriodEnd('')
  }

  const handleAddDayOff = () => {
    if (!dayOffStaffId || !dayOffDate) {
      setDayOffError('スタッフと日付を選択してください')
      return
    }
    const ok = addDayOff(dayOffStaffId, dayOffDate)
    if (!ok) {
      setDayOffError('すでに登録済みです')
      return
    }
    setDayOffError('')
    setDayOffDate('')
  }

  return (
    <div>
      {/* タブ切り替え */}
      <div className="flex border-b border-gray-200 bg-white">
        {(
          [
            { id: 'period', label: 'シフト期間' },
            { id: 'shift', label: 'シフト枠' },
            { id: 'dayoff', label: '希望休' },
            { id: 'parking', label: '駐車場' },
          ] as { id: Tab; label: string }[]
        ).map((t) => (
          <button
            key={t.id}
            onClick={() => handleTabChange(t.id)}
            className={[
              'flex-1 py-3 text-sm font-medium border-b-2 transition-colors',
              activeTab === t.id
                ? 'border-indigo-500 text-indigo-600'
                : 'border-transparent text-gray-500 hover:text-gray-700',
            ].join(' ')}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="p-4">
        {/* シフト期間設定 */}
        {activeTab === 'period' && (
          <div>
            <p className="text-xs text-gray-500 mb-3">シフトを作成する期間（開始日・終了日）を設定してください</p>
            <div className="bg-white border border-gray-200 rounded-xl p-4 space-y-3">
              <div>
                <label className="block text-xs text-gray-500 mb-1">開始日</label>
                <input
                  type="date"
                  value={periodStart}
                  onChange={(e) => setPeriodStart(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">終了日</label>
                <input
                  type="date"
                  value={periodEnd}
                  onChange={(e) => setPeriodEnd(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
                />
              </div>
              {periodError && (
                <p className="text-red-500 text-xs">{periodError}</p>
              )}
              <div className="flex gap-2 pt-1">
                <button
                  onClick={handleSavePeriod}
                  className="flex-1 bg-indigo-500 text-white py-2.5 rounded-lg text-sm font-medium hover:bg-indigo-600"
                >
                  保存
                </button>
                <button
                  onClick={handleClearPeriod}
                  className="px-4 border border-gray-300 text-gray-600 py-2.5 rounded-lg text-sm hover:bg-gray-50"
                >
                  クリア
                </button>
              </div>
            </div>

            {/* フロー誘導 CTA: シフト期間が保存済みの場合 */}
            {isShiftPeriodSaved && (
              <button
                onClick={() => navigate('/settings/shift')}
                className="mt-4 w-full bg-indigo-500 text-white py-3 rounded-xl text-sm font-medium hover:bg-indigo-600 active:bg-indigo-700"
              >
                シフト枠を設定する →
              </button>
            )}
          </div>
        )}

        {/* シフト枠・必要人数設定 */}
        {activeTab === 'shift' && (
          <div>
            {periodDates.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-gray-400">
                <p className="text-sm font-medium">シフト作成期間を先に設定してください</p>
                <p className="text-xs mt-1">「シフト期間」タブで期間を設定してください</p>
              </div>
            ) : (
              <>
                <p className="text-xs text-gray-500 mb-3">シフト作成期間内の各時間帯の必要人数を設定してください</p>
                <div className="space-y-3">
                  {periodDates.map((date) => (
                    <div key={date} className="bg-white border border-gray-200 rounded-xl p-3">
                      <p className="text-sm font-medium text-gray-700 mb-2">
                        {format(new Date(date + 'T00:00:00'), 'M月d日(E)', { locale: ja })}
                      </p>
                      <div className="flex gap-3">
                        {ALL_TIME_SLOTS.map((slot) => {
                          const val = getRequiredCount(date, slot)
                          return (
                            <div key={slot} className="flex-1 text-center">
                              <label className="block text-xs text-gray-500 mb-1">
                                {TIME_SLOT_LABELS[slot]}
                              </label>
                              <input
                                type="number"
                                min={0}
                                max={20}
                                value={val}
                                onChange={(e) => {
                                  const v = parseInt(e.target.value, 10)
                                  if (!isNaN(v) && v >= 0) setRequiredCount(date, slot, v)
                                }}
                                className="w-full border border-gray-300 rounded-lg px-2 py-1.5 text-sm text-center focus:outline-none focus:ring-2 focus:ring-indigo-400"
                              />
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}

            {/* フロー誘導 CTA: 常時表示 */}
            <button
              onClick={() => navigate('/shift')}
              className="mt-4 w-full bg-indigo-500 text-white py-3 rounded-xl text-sm font-medium hover:bg-indigo-600 active:bg-indigo-700"
            >
              シフトを作成する →
            </button>
          </div>
        )}

        {/* 希望休管理 */}
        {activeTab === 'dayoff' && (
          <div>
            <div className="bg-white border border-gray-200 rounded-xl p-3 mb-4">
              <p className="text-sm font-medium text-gray-700 mb-3">希望休を登録</p>
              <div className="space-y-2">
                <select
                  value={dayOffStaffId}
                  onChange={(e) => setDayOffStaffId(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
                >
                  <option value="">スタッフを選択</option>
                  {staff.map((s) => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
                <input
                  type="date"
                  value={dayOffDate}
                  onChange={(e) => setDayOffDate(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
                />
                {dayOffError && <p className="text-red-500 text-xs">{dayOffError}</p>}
                <button
                  onClick={handleAddDayOff}
                  className="w-full bg-indigo-500 text-white py-2.5 rounded-lg text-sm font-medium hover:bg-indigo-600"
                >
                  登録
                </button>
              </div>
            </div>

            {dayOffs.length === 0 ? (
              <p className="text-center text-gray-400 text-sm py-6">登録された希望休はありません</p>
            ) : (
              <ul className="space-y-2">
                {dayOffs
                  .slice()
                  .sort((a, b) => a.date.localeCompare(b.date))
                  .map((d) => {
                    const s = staff.find((x) => x.id === d.staffId)
                    return (
                      <li
                        key={d.id}
                        className="flex items-center justify-between bg-white border border-gray-200 rounded-xl px-3 py-2"
                      >
                        <div>
                          <span className="text-sm text-gray-800">{s?.name ?? '不明'}</span>
                          <span className="text-xs text-gray-500 ml-2">
                            {format(new Date(d.date + 'T00:00:00'), 'M月d日(E)', { locale: ja })}
                          </span>
                        </div>
                        <button
                          onClick={() => deleteDayOff(d.id)}
                          className="text-xs text-red-500 hover:text-red-700 px-2 py-1 rounded"
                        >
                          削除
                        </button>
                      </li>
                    )
                  })}
              </ul>
            )}
          </div>
        )}

        {/* 駐車場枠設定 */}
        {activeTab === 'parking' && (
          <div>
            <p className="text-xs text-gray-500 mb-3">駐車場種別ごとの枠数を設定してください</p>
            <div className="space-y-3">
              {parkingConfig.slots.map((slot) => (
                <div
                  key={slot.type}
                  className="flex items-center justify-between bg-white border border-gray-200 rounded-xl px-4 py-3"
                >
                  <span className="text-sm font-medium text-gray-700">
                    駐車場 {slot.type}
                  </span>
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => slot.count > 0 && updateSlotCount(slot.type, slot.count - 1)}
                      className="w-8 h-8 rounded-full bg-gray-100 text-gray-600 hover:bg-gray-200 flex items-center justify-center text-lg"
                    >
                      −
                    </button>
                    <span className="text-lg font-semibold w-6 text-center">{slot.count}</span>
                    <button
                      onClick={() => updateSlotCount(slot.type, slot.count + 1)}
                      className="w-8 h-8 rounded-full bg-gray-100 text-gray-600 hover:bg-gray-200 flex items-center justify-center text-lg"
                    >
                      ＋
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
