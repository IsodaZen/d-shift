import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useDragSort } from './useDragSort'

// --- spec: staff-management / スタッフ一覧をドラッグ&ドロップで並び替えられる ---

describe('useDragSort', () => {
  let onReorder: (fromIndex: number, toIndex: number) => void

  beforeEach(() => {
    onReorder = vi.fn<(fromIndex: number, toIndex: number) => void>()
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('初期状態では draggingIndex と dragOverIndex が null である', () => {
    const { result } = renderHook(() => useDragSort({ onReorder }))

    expect(result.current.draggingIndex).toBeNull()
    expect(result.current.dragOverIndex).toBeNull()
  })

  it('マウス操作: getDragHandleProps(0) の onPointerDown を呼ぶと draggingIndex が 0 になる（pointermove 後）', () => {
    const { result } = renderHook(() => useDragSort({ onReorder }))
    const props = result.current.getDragHandleProps(0)

    act(() => {
      props.onPointerDown({ pointerId: 1, pointerType: 'mouse' } as PointerEvent)
    })

    // マウスの場合は pointermove で dragging 開始
    act(() => {
      props.onPointerMove({ pointerId: 1, pointerType: 'mouse' } as PointerEvent)
    })

    expect(result.current.draggingIndex).toBe(0)
  })

  it('ドラッグ中に別のアイテムの onPointerEnter が呼ばれると dragOverIndex が更新される', () => {
    const { result } = renderHook(() => useDragSort({ onReorder }))

    act(() => {
      const props0 = result.current.getDragHandleProps(0)
      props0.onPointerDown({ pointerId: 1, pointerType: 'mouse' } as PointerEvent)
      props0.onPointerMove({ pointerId: 1, pointerType: 'mouse' } as PointerEvent)
    })

    act(() => {
      const props2 = result.current.getDragHandleProps(2)
      props2.onPointerEnter({ pointerId: 1, pointerType: 'mouse' } as PointerEvent)
    })

    expect(result.current.dragOverIndex).toBe(2)
  })

  it('onPointerUp が呼ばれると onReorder コールバックが正しいインデックスで呼ばれる', () => {
    const { result } = renderHook(() => useDragSort({ onReorder }))

    act(() => {
      const props0 = result.current.getDragHandleProps(0)
      props0.onPointerDown({ pointerId: 1, pointerType: 'mouse' } as PointerEvent)
      props0.onPointerMove({ pointerId: 1, pointerType: 'mouse' } as PointerEvent)
    })

    act(() => {
      const props2 = result.current.getDragHandleProps(2)
      props2.onPointerEnter({ pointerId: 1, pointerType: 'mouse' } as PointerEvent)
    })

    act(() => {
      const props2 = result.current.getDragHandleProps(2)
      props2.onPointerUp({ pointerId: 1, pointerType: 'mouse' } as PointerEvent)
    })

    expect(onReorder).toHaveBeenCalledWith(0, 2)
    expect(result.current.draggingIndex).toBeNull()
    expect(result.current.dragOverIndex).toBeNull()
  })

  it('draggingIndex === dragOverIndex の場合、onPointerUp 時に onReorder が呼ばれない', () => {
    const { result } = renderHook(() => useDragSort({ onReorder }))

    act(() => {
      const props1 = result.current.getDragHandleProps(1)
      props1.onPointerDown({ pointerId: 1, pointerType: 'mouse' } as PointerEvent)
      props1.onPointerMove({ pointerId: 1, pointerType: 'mouse' } as PointerEvent)
    })

    act(() => {
      const props1 = result.current.getDragHandleProps(1)
      props1.onPointerEnter({ pointerId: 1, pointerType: 'mouse' } as PointerEvent)
    })

    act(() => {
      const props1 = result.current.getDragHandleProps(1)
      props1.onPointerUp({ pointerId: 1, pointerType: 'mouse' } as PointerEvent)
    })

    expect(onReorder).not.toHaveBeenCalled()
  })

  it('onPointerCancel が呼ばれるとドラッグがキャンセルされ onReorder が呼ばれない', () => {
    const { result } = renderHook(() => useDragSort({ onReorder }))

    act(() => {
      const props0 = result.current.getDragHandleProps(0)
      props0.onPointerDown({ pointerId: 1, pointerType: 'mouse' } as PointerEvent)
      props0.onPointerMove({ pointerId: 1, pointerType: 'mouse' } as PointerEvent)
    })

    act(() => {
      const props2 = result.current.getDragHandleProps(2)
      props2.onPointerEnter({ pointerId: 1, pointerType: 'mouse' } as PointerEvent)
    })

    act(() => {
      const props0 = result.current.getDragHandleProps(0)
      props0.onPointerCancel({ pointerId: 1, pointerType: 'mouse' } as PointerEvent)
    })

    expect(onReorder).not.toHaveBeenCalled()
    expect(result.current.draggingIndex).toBeNull()
    expect(result.current.dragOverIndex).toBeNull()
  })

  it('タッチ操作: 300ms 経過前に pointermove しても draggingIndex が更新されない', () => {
    const { result } = renderHook(() => useDragSort({ onReorder }))

    act(() => {
      const props0 = result.current.getDragHandleProps(0)
      props0.onPointerDown({ pointerId: 1, pointerType: 'touch' } as PointerEvent)
    })

    // 300ms 未満の時点で pointermove
    act(() => {
      vi.advanceTimersByTime(100)
      const props0 = result.current.getDragHandleProps(0)
      props0.onPointerMove({ pointerId: 1, pointerType: 'touch' } as PointerEvent)
    })

    expect(result.current.draggingIndex).toBeNull()
  })

  it('タッチ操作: 300ms 以上ホールドした後は draggingIndex が更新される', () => {
    const { result } = renderHook(() => useDragSort({ onReorder }))

    act(() => {
      const props0 = result.current.getDragHandleProps(0)
      props0.onPointerDown({ pointerId: 1, pointerType: 'touch' } as PointerEvent)
    })

    // 300ms 経過
    act(() => {
      vi.advanceTimersByTime(300)
    })

    expect(result.current.draggingIndex).toBe(0)
  })

  it('disabled=true のとき pointerdown → pointermove しても draggingIndex が null のまま', () => {
    // spec: スタッフが1件のみの場合はドラッグ操作が無効となる
    const { result } = renderHook(() => useDragSort({ onReorder, disabled: true }))

    act(() => {
      const props0 = result.current.getDragHandleProps(0)
      props0.onPointerDown({ pointerId: 1, pointerType: 'mouse' } as PointerEvent)
      props0.onPointerMove({ pointerId: 1, pointerType: 'mouse' } as PointerEvent)
    })

    expect(result.current.draggingIndex).toBeNull()
  })
})
