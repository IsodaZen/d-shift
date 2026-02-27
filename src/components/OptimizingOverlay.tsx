// 最適化中のローディングオーバーレイコンポーネント
interface OptimizingOverlayProps {
  isOptimizing: boolean
  progress: number
}

/**
 * シフト最適化中にUIをオーバーレイするローディング表示コンポーネント。
 * プログレスバーと進捗率を表示する。
 */
export function OptimizingOverlay({ isOptimizing, progress }: OptimizingOverlayProps) {
  if (!isOptimizing) return null

  return (
    <div
      role="status"
      aria-label="シフトを最適化中"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4"
    >
      <div className="bg-white rounded-2xl p-6 w-full max-w-xs shadow-xl">
        <p className="text-sm font-medium text-gray-800 mb-4 text-center">
          シフトを最適化中...
        </p>
        <div
          role="progressbar"
          aria-valuenow={progress}
          aria-valuemin={0}
          aria-valuemax={100}
          className="w-full bg-gray-200 rounded-full h-2 mb-3 overflow-hidden"
        >
          <div
            className="bg-indigo-500 h-2 rounded-full transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
        <p className="text-center text-sm text-gray-500">{progress}%</p>
      </div>
    </div>
  )
}
