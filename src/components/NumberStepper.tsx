// モバイル対応の数値入力コンポーネント（+/-ボタン方式）
interface NumberStepperProps {
  value: number
  onChange: (value: number) => void
  min?: number
  max?: number
  /** 'sm' はシフト枠のようなコンパクトな表示、'md' はデフォルトサイズ */
  size?: 'sm' | 'md'
}

export function NumberStepper({ value, onChange, min, max, size = 'md' }: NumberStepperProps) {
  const canDecrement = min === undefined || value > min
  const canIncrement = max === undefined || value < max

  const handleDecrement = () => {
    if (canDecrement) onChange(value - 1)
  }

  const handleIncrement = () => {
    if (canIncrement) onChange(value + 1)
  }

  const btnSize = size === 'sm' ? 'w-7 h-7 text-base' : 'w-8 h-8 text-lg'
  const valueSize = size === 'sm' ? 'text-base w-5' : 'text-lg w-6'

  return (
    <div className="flex items-center justify-center gap-2">
      <button
        type="button"
        onClick={handleDecrement}
        disabled={!canDecrement}
        aria-label="減らす"
        className={`${btnSize} rounded-full bg-gray-100 text-gray-600 hover:bg-gray-200 disabled:opacity-30 disabled:hover:bg-gray-100 flex items-center justify-center`}
      >
        −
      </button>
      <span className={`${valueSize} font-semibold text-center`}>{value}</span>
      <button
        type="button"
        onClick={handleIncrement}
        disabled={!canIncrement}
        aria-label="増やす"
        className={`${btnSize} rounded-full bg-gray-100 text-gray-600 hover:bg-gray-200 disabled:opacity-30 disabled:hover:bg-gray-100 flex items-center justify-center`}
      >
        ＋
      </button>
    </div>
  )
}
