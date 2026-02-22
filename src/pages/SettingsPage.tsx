// タスク5.1〜5.4, 6.1〜6.4: SettingsPage（シフト期間・シフト枠・駐車場・希望休設定・ヘルプスタッフ）
import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useShiftConfig } from '../hooks/useShiftConfig'
import { useParkingConfig } from '../hooks/useParkingConfig'
import { useDayOffs } from '../hooks/useDayOffs'
import { useStaff } from '../hooks/useStaff'
import { useShiftPeriod } from '../hooks/useShiftPeriod'
import { useHelpStaff } from '../hooks/useHelpStaff'
import { ALL_TIME_SLOTS, TIME_SLOT_LABELS } from '../types'
import { NumberStepper } from '../components/NumberStepper'
import { DayOffCalendar } from '../components/DayOffCalendar'
import { HelpStaffForm } from '../components/HelpStaffForm'
import { HelpStaffAvailabilityCalendar } from '../components/HelpStaffAvailabilityCalendar'
import { format, parseISO, differenceInCalendarDays } from 'date-fns'
import { ja } from 'date-fns/locale'

type Tab = 'period' | 'shift' | 'dayoff' | 'parking' | 'help-staff'

const VALID_TABS: Tab[] = ['period', 'shift', 'dayoff', 'parking', 'help-staff']

export function SettingsPage() {
  const { tab: tabParam } = useParams<{ tab?: string }>()
  const navigate = useNavigate()

  // 不正なタブパラメーターは 'period' にフォールバック
  const activeTab: Tab = VALID_TABS.includes(tabParam as Tab) ? (tabParam as Tab) : 'period'

  const { getRequiredCount, setRequiredCount } = useShiftConfig()
  const { parkingConfig, updateSlotCount } = useParkingConfig()
  const { dayOffs, addDayOff, syncDayOffs } = useDayOffs()
  const { staff } = useStaff()
  const { shiftPeriod, setShiftPeriod, getPeriodDates, isShiftPeriodSaved } = useShiftPeriod()
  const { helpStaff, addHelpStaff, updateHelpStaff, deleteHelpStaff, updateAvailableDates } = useHelpStaff()

  // ヘルプスタッフ管理
  const [helpStaffMode, setHelpStaffMode] = useState<'list' | 'add' | 'edit' | 'calendar'>('list')
  const [editingHelpStaffId, setEditingHelpStaffId] = useState<string | null>(null)
  const [calendarHelpStaffId, setCalendarHelpStaffId] = useState<string | null>(null)

  // シフト期間フォーム
  const [periodStart, setPeriodStart] = useState(shiftPeriod.startDate)
  const [periodEnd, setPeriodEnd] = useState(shiftPeriod.endDate)
  const [periodError, setPeriodError] = useState('')

  // 希望休登録フォーム（フォールバック）
  const [dayOffStaffId, setDayOffStaffId] = useState('')
  const [dayOffDate, setDayOffDate] = useState('')
  const [dayOffError, setDayOffError] = useState('')

  // 希望休カレンダーモード
  const [calendarStaffId, setCalendarStaffId] = useState('')
  const [calendarSelectedDates, setCalendarSelectedDates] = useState<string[]>([])
  const [syncMessage, setSyncMessage] = useState('')

  const periodDates = getPeriodDates()

  const handleCalendarStaffChange = (staffId: string) => {
    setCalendarStaffId(staffId)
    setSyncMessage('')
    const registered = staffId
      ? dayOffs.filter((d) => d.staffId === staffId).map((d) => d.date)
      : []
    setCalendarSelectedDates(registered)
  }

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

  const handleCalendarToggle = (date: string) => {
    setSyncMessage('')
    setCalendarSelectedDates((prev) =>
      prev.includes(date) ? prev.filter((d) => d !== date) : [...prev, date],
    )
  }

  const handleSyncDayOffs = () => {
    if (!calendarStaffId) return
    const { added, removed } = syncDayOffs(calendarStaffId, calendarSelectedDates)
    setSyncMessage(`${added}件を追加、${removed}件を削除しました`)
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
            { id: 'help-staff', label: 'ヘルプスタッフ' },
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
              <div className="pt-1">
                <button
                  onClick={handleSavePeriod}
                  className="w-full bg-indigo-500 text-white py-2.5 rounded-lg text-sm font-medium hover:bg-indigo-600"
                >
                  保存
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
                              <NumberStepper
                                value={val}
                                onChange={(v) => setRequiredCount(date, slot, v)}
                                min={0}
                                max={20}
                                size="sm"
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
            {/* フォールバック: シフト期間未保存時は単一日付入力 */}
            {!isShiftPeriodSaved ? (
              <div className="bg-white border border-gray-200 rounded-xl p-3 mb-4">
                <p className="text-sm font-medium text-gray-700 mb-3">希望休を登録</p>
                <div className="space-y-2">
                  <select
                    value={dayOffStaffId}
                    onChange={(e) => setDayOffStaffId(e.target.value)}
                    aria-label="スタッフを選択"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
                  >
                    <option value="">スタッフを選択</option>
                    {staff.map((s) => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                  <label className="sr-only" htmlFor="dayoff-date-input">希望休日付</label>
                  <input
                    id="dayoff-date-input"
                    type="date"
                    value={dayOffDate}
                    onChange={(e) => setDayOffDate(e.target.value)}
                    aria-label="希望休日付"
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
            ) : (
              /* カレンダーモード: シフト期間保存済み */
              <div className="mb-4">
                <div className="bg-white border border-gray-200 rounded-xl p-3 mb-3">
                  <p className="text-sm font-medium text-gray-700 mb-3">希望休を登録</p>
                  <select
                    value={calendarStaffId}
                    onChange={(e) => handleCalendarStaffChange(e.target.value)}
                    aria-label="スタッフを選択"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 mb-3"
                  >
                    <option value="">スタッフを選択</option>
                    {staff.map((s) => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>

                  {calendarStaffId && (
                    <>
                      {syncMessage && (
                        <p className="text-indigo-600 text-xs mb-2">{syncMessage}</p>
                      )}
                      <DayOffCalendar
                        key={calendarStaffId}
                        periodDates={periodDates}
                        selectedDates={calendarSelectedDates}
                        onToggle={handleCalendarToggle}
                      />
                      <button
                        onClick={handleSyncDayOffs}
                        className="mt-3 w-full bg-indigo-500 text-white py-2.5 rounded-lg text-sm font-medium hover:bg-indigo-600"
                      >
                        保存
                      </button>
                    </>
                  )}
                </div>
              </div>
            )}

            {/* スタッフ別サマリー */}
            {(() => {
              const summaryItems = staff
                .map((s) => {
                  const count = dayOffs.filter(
                    (d) => d.staffId === s.id && periodDates.includes(d.date),
                  ).length
                  return { staff: s, count }
                })
                .filter((item) => item.count > 0)

              if (summaryItems.length === 0) {
                return (
                  <p className="text-center text-gray-400 text-sm py-6">登録された希望休はありません</p>
                )
              }

              return (
                <ul className="space-y-2">
                  {summaryItems.map(({ staff: s, count }) => (
                    <li
                      key={s.id}
                      className="flex items-center justify-between bg-white border border-gray-200 rounded-xl px-3 py-2"
                    >
                      <span className="text-sm text-gray-800">{s.name}</span>
                      <span className="text-sm text-indigo-600 font-medium">{count}日</span>
                    </li>
                  ))}
                </ul>
              )
            })()}
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
                  <NumberStepper
                    value={slot.count}
                    onChange={(count) => updateSlotCount(slot.type, count)}
                    min={0}
                  />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ヘルプスタッフ管理 */}
        {activeTab === 'help-staff' && (
          <div>
            {helpStaffMode === 'list' && (
              <>
                <div className="flex items-center justify-between mb-3">
                  <p className="text-sm font-medium text-gray-700">ヘルプスタッフ一覧</p>
                  <button
                    onClick={() => setHelpStaffMode('add')}
                    className="px-3 py-1.5 bg-indigo-500 text-white text-sm rounded-lg hover:bg-indigo-600"
                  >
                    追加
                  </button>
                </div>

                {helpStaff.length === 0 ? (
                  <p className="text-center text-gray-400 text-sm py-6">ヘルプスタッフが登録されていません</p>
                ) : (
                  <div className="space-y-2">
                    {helpStaff.map((hs) => (
                      <div
                        key={hs.id}
                        className="bg-white border border-gray-200 rounded-xl px-3 py-2"
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-gray-800">{hs.name}</span>
                          <div className="flex gap-2">
                            {isShiftPeriodSaved && (
                              <button
                                onClick={() => {
                                  setCalendarHelpStaffId(hs.id)
                                  setHelpStaffMode('calendar')
                                }}
                                className="text-xs text-indigo-600 hover:text-indigo-800"
                              >
                                稼働日設定
                              </button>
                            )}
                            <button
                              onClick={() => {
                                setEditingHelpStaffId(hs.id)
                                setHelpStaffMode('edit')
                              }}
                              className="text-xs text-indigo-600 hover:text-indigo-800"
                            >
                              編集
                            </button>
                            <button
                              onClick={() => deleteHelpStaff(hs.id)}
                              className="text-xs text-red-500 hover:text-red-700"
                            >
                              削除
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}

            {helpStaffMode === 'add' && (
              <div>
                <p className="text-sm font-medium text-gray-700 mb-3">ヘルプスタッフを追加</p>
                <HelpStaffForm
                  onSubmit={(data) => {
                    addHelpStaff({ ...data, availableDates: [] })
                    setHelpStaffMode('list')
                  }}
                  onCancel={() => setHelpStaffMode('list')}
                />
              </div>
            )}

            {helpStaffMode === 'edit' && editingHelpStaffId && (() => {
              const target = helpStaff.find((hs) => hs.id === editingHelpStaffId)
              if (!target) return null
              return (
                <div>
                  <p className="text-sm font-medium text-gray-700 mb-3">ヘルプスタッフを編集</p>
                  <HelpStaffForm
                    initialData={{
                      name: target.name,
                      availableSlots: target.availableSlots,
                      usesParking: target.usesParking,
                    }}
                    onSubmit={(data) => {
                      updateHelpStaff(editingHelpStaffId, data)
                      setEditingHelpStaffId(null)
                      setHelpStaffMode('list')
                    }}
                    onCancel={() => {
                      setEditingHelpStaffId(null)
                      setHelpStaffMode('list')
                    }}
                  />
                </div>
              )
            })()}

            {helpStaffMode === 'calendar' && calendarHelpStaffId && (() => {
              const target = helpStaff.find((hs) => hs.id === calendarHelpStaffId)
              if (!target) return null
              return (
                <div>
                  <p className="text-sm font-medium text-gray-700 mb-3">{target.name} の稼働可能日付</p>
                  <HelpStaffAvailabilityCalendar
                    periodDates={periodDates}
                    selectedDates={target.availableDates}
                    onSave={(dates) => {
                      updateAvailableDates(calendarHelpStaffId, dates)
                      setCalendarHelpStaffId(null)
                      setHelpStaffMode('list')
                    }}
                  />
                </div>
              )
            })()}
          </div>
        )}
      </div>
    </div>
  )
}
