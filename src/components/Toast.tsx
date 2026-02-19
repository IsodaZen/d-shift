// 警告トースト表示コンポーネント
import { useEffect } from 'react'

interface ToastProps {
  message: string
  onClose: () => void
}

export function Toast({ message, onClose }: ToastProps) {
  useEffect(() => {
    const timer = setTimeout(onClose, 3000)
    return () => clearTimeout(timer)
  }, [onClose])

  return (
    <div className="fixed bottom-20 left-1/2 -translate-x-1/2 bg-amber-500 text-white text-sm px-4 py-2 rounded-full shadow-lg z-50 max-w-xs text-center">
      {message}
    </div>
  )
}
