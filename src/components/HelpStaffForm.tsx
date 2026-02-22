import { useState } from 'react'
import type { HelpStaff, TimeSlot } from '../types'
import { ALL_TIME_SLOTS, TIME_SLOT_LABELS } from '../types'

type HelpStaffFormData = Omit<HelpStaff, 'id' | 'availableDates'>

interface HelpStaffFormProps {
  initialData?: HelpStaffFormData
  onSubmit: (data: HelpStaffFormData) => void
  onCancel: () => void
}

const DEFAULT_FORM: HelpStaffFormData = {
  name: '',
  availableSlots: ['morning', 'afternoon', 'evening'],
  usesParking: false,
}

export function HelpStaffForm({ initialData, onSubmit, onCancel }: HelpStaffFormProps) {
  const [form, setForm] = useState<HelpStaffFormData>(initialData ?? DEFAULT_FORM)
  const [errors, setErrors] = useState<Partial<Record<string, string>>>({})

  const validate = (): boolean => {
    const errs: Record<string, string> = {}
    if (!form.name.trim()) errs.name = '氏名は必須です'
    if (form.availableSlots.length === 0) errs.availableSlots = '出勤可能時間帯を1つ以上選択してください'
    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!validate()) return
    onSubmit({ ...form, name: form.name.trim() })
  }

  const toggleSlot = (slot: TimeSlot) => {
    setForm((prev) => ({
      ...prev,
      availableSlots: prev.availableSlots.includes(slot)
        ? prev.availableSlots.filter((s) => s !== slot)
        : [...prev.availableSlots, slot],
    }))
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">氏名</label>
        <input
          type="text"
          value={form.name}
          onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
          placeholder="田中 太郎"
        />
        {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name}</p>}
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">出勤可能時間帯</label>
        <div className="flex gap-3">
          {ALL_TIME_SLOTS.map((slot) => (
            <label key={slot} className="flex items-center gap-1.5 text-sm cursor-pointer">
              <input
                type="checkbox"
                checked={form.availableSlots.includes(slot)}
                onChange={() => toggleSlot(slot)}
                className="rounded"
              />
              {TIME_SLOT_LABELS[slot]}
            </label>
          ))}
        </div>
        {errors.availableSlots && <p className="text-red-500 text-xs mt-1">{errors.availableSlots}</p>}
      </div>

      <div>
        <label className="flex items-center gap-2 text-sm font-medium text-gray-700 cursor-pointer">
          <input
            type="checkbox"
            checked={form.usesParking}
            onChange={(e) => setForm((p) => ({ ...p, usesParking: e.target.checked }))}
            className="rounded"
          />
          駐車場を利用する
        </label>
      </div>

      <div className="flex gap-3 pt-2">
        <button
          type="submit"
          className="flex-1 bg-indigo-500 text-white py-2.5 rounded-lg text-sm font-medium hover:bg-indigo-600 active:bg-indigo-700"
        >
          保存
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 bg-gray-100 text-gray-700 py-2.5 rounded-lg text-sm font-medium hover:bg-gray-200"
        >
          キャンセル
        </button>
      </div>
    </form>
  )
}
