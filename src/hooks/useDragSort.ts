// spec: staff-management / スタッフ一覧をドラッグ&ドロップで並び替えられる
import { useState, useRef, useCallback, useEffect } from 'react'

interface UseDragSortProps {
  onReorder: (fromIndex: number, toIndex: number) => void
  /** true のときドラッグ操作を無効にする（スタッフが1件のみの場合など） */
  disabled?: boolean
}

interface DragHandleProps {
  onPointerDown: (e: PointerEvent) => void
  onPointerMove: (e: PointerEvent) => void
  onPointerEnter: (e: PointerEvent) => void
  onPointerUp: (e: PointerEvent) => void
  onPointerCancel: (e: PointerEvent) => void
}

interface UseDragSortResult {
  draggingIndex: number | null
  dragOverIndex: number | null
  getDragHandleProps: (index: number) => DragHandleProps
}

export function useDragSort({ onReorder, disabled = false }: UseDragSortProps): UseDragSortResult {
  const [draggingIndex, setDraggingIndex] = useState<number | null>(null)
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null)

  // useRef でミュータブルな状態を保持（クロージャ問題を回避）
  const draggingIndexRef = useRef<number | null>(null)
  const dragOverIndexRef = useRef<number | null>(null)
  const longPressTimerRef = useRef<number | null>(null)
  const isTouchDraggingRef = useRef(false)
  // マウスドラッグ開始済みかどうかのフラグ（pointermove の重複 setState 防止）
  const isMouseDraggingRef = useRef(false)

  // onReorder の最新参照を常に保持（クロージャによる stale 参照を防ぐ）
  const onReorderRef = useRef(onReorder)
  useEffect(() => {
    onReorderRef.current = onReorder
  }, [onReorder])

  const resetState = useCallback(() => {
    draggingIndexRef.current = null
    dragOverIndexRef.current = null
    isTouchDraggingRef.current = false
    isMouseDraggingRef.current = false
    if (longPressTimerRef.current !== null) {
      clearTimeout(longPressTimerRef.current)
      longPressTimerRef.current = null
    }
    setDraggingIndex(null)
    setDragOverIndex(null)
  }, [])

  const getDragHandleProps = useCallback(
    (index: number): DragHandleProps => ({
      onPointerDown: (e: PointerEvent) => {
        if (disabled) return

        if (e.pointerType === 'touch') {
          // タッチの場合は 300ms ホールド後にドラッグ開始
          isTouchDraggingRef.current = false
          draggingIndexRef.current = index
          dragOverIndexRef.current = index
          longPressTimerRef.current = window.setTimeout(() => {
            isTouchDraggingRef.current = true
            setDraggingIndex(index)
            setDragOverIndex(index)
          }, 300)
        } else {
          // マウスの場合は pointermove で開始するため、ここでは index を記録のみ
          draggingIndexRef.current = index
          dragOverIndexRef.current = index
          isMouseDraggingRef.current = false
        }
      },

      onPointerMove: (e: PointerEvent) => {
        if (disabled) return

        if (e.pointerType === 'touch') {
          // タッチの場合はタイマー完了後のみドラッグ中とみなす
          if (!isTouchDraggingRef.current) return
        } else {
          if (draggingIndexRef.current === null) return
          // 初回 pointermove のみドラッグ開始を確定（重複 setState 防止）
          if (!isMouseDraggingRef.current) {
            isMouseDraggingRef.current = true
            const fromIdx = draggingIndexRef.current
            setDraggingIndex(fromIdx)
            setDragOverIndex(fromIdx)
          }
        }
      },

      onPointerEnter: (e: PointerEvent) => {
        if (disabled) return
        if (draggingIndexRef.current === null) return
        // タッチの場合はホールド完了後のみ更新
        if (e.pointerType === 'touch' && !isTouchDraggingRef.current) return
        dragOverIndexRef.current = index
        setDragOverIndex(index)
      },

      onPointerUp: (_e: PointerEvent) => {
        const from = draggingIndexRef.current
        const to = dragOverIndexRef.current
        if (from !== null && to !== null && from !== to) {
          onReorderRef.current(from, to)
        }
        resetState()
      },

      onPointerCancel: (_e: PointerEvent) => {
        resetState()
      },
    }),
    [disabled, resetState],
  )

  return { draggingIndex, dragOverIndex, getDragHandleProps }
}
