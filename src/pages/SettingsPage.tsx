// タスク5.1〜5.4, 6.1〜6.4: SettingsPage（シフト期間・シフト枠・駐車場・ヘルプスタッフ設定）
import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useShiftConfig } from '../hooks/useShiftConfig'
import { useParkingConfig } from '../hooks/useParkingConfig'
import { useShiftPeriod } from '../hooks/useShiftPeriod'
import { useHelpStaff } from '../hooks/useHelpStaff'
import { ALL_TIME_SLOTS, TIME_SLOT_LABELS } from '../types'
import { NumberStepper } from '../components/NumberStepper'
import { HelpStaffForm } from '../components/HelpStaffForm'
import { HelpStaffAvailabilityCalendar } from '../components/HelpStaffAvailabilityCalendar'
import { format, parseISO, differenceInCalendarDays } from 'date-fns'
import { ja } from 'date-fns/locale'

type Tab = 'period' | 'shift' | 'parking' | 'help-staff'

const VALID_TABS: Tab[] = ['period', 'shift', 'parking', 'help-staff']

export function SettingsPage() {
  const { tab: tabParam } = useParams<{ tab?: string }>()
  const navigate = useNavigate()

  // 不正なタブパラメーターは 'period' にフォールバック
  const activeTab: Tab = VALID_TABS.includes(tabParam as Tab) ? (tabParam as Tab) : 'period'

  const { getRequiredCount, setRequiredCount } = useShiftConfig()
  const { parkingConfig, updateSlotCount } = useParkingConfig()
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

  return (
    <div>
      {/* タブ切り替え */}
      <div className="flex border-b border-gray-200 bg-white">
        {(
          [
            { id: 'period', label: 'シフト期間' },
            { id: 'shift', label: 'シフト枠' },
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
