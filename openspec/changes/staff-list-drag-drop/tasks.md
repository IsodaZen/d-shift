## タスクリスト

### Phase 1: useStaff に並び替え機能を追加（TDD）

- [x] `src/hooks/useStaff.test.ts` に `reorderStaff` のテストを追加する（Red）
  - 「`reorderStaff(0, 2)` を呼ぶと先頭スタッフが3番目に移動する」
  - 「`reorderStaff(2, 0)` を呼ぶと3番目スタッフが先頭に移動する」
  - 「`reorderStaff(i, i)` を呼んでも順序が変わらない」
  - 「並び替え後の順序が LocalStorage に保存される」

- [x] `src/hooks/useStaff.ts` に `reorderStaff(fromIndex: number, toIndex: number)` を実装する（Green）
  - `fromIndex` のアイテムを配列から取り出し、`toIndex` の位置に挿入する
  - `setStaff` で更新して LocalStorage に永続化する

---

### Phase 2: useDragSort カスタムフックを作成（TDD）

- [x] `src/hooks/useDragSort.test.ts` を作成しテストを書く（Red）
  - 「初期状態では `draggingIndex` と `dragOverIndex` が null である」
  - 「`getDragHandleProps(0)` の `onPointerDown` を呼ぶと `draggingIndex` が 0 になる（pointermove 後）」
  - 「ドラッグ中に別のアイテムの `onPointerEnter` が呼ばれると `dragOverIndex` が更新される」
  - 「`onPointerUp` が呼ばれると `onReorder` コールバックが正しいインデックスで呼ばれる」
  - 「`draggingIndex === dragOverIndex` の場合、`onPointerUp` 時に `onReorder` が呼ばれない」
  - 「`onPointerCancel` が呼ばれるとドラッグがキャンセルされ `onReorder` が呼ばれない」
  - 「タッチ操作（`pointerType: 'touch'`）では 300ms 経過前に `pointermove` しても `draggingIndex` が更新されない」
  - 「タッチ操作で 300ms 以上ホールドした後は `draggingIndex` が更新される」
  - 「`disabled=true` のとき pointerdown → pointermove しても `draggingIndex` が null のまま」

- [x] `src/hooks/useDragSort.ts` を作成し実装する（Green）
  - Props: `onReorder: (fromIndex: number, toIndex: number) => void`, `disabled?: boolean`
  - 内部状態: `draggingIndex`, `dragOverIndex`, `longPressTimer`
  - `getDragHandleProps(index)` を返し、各リストアイテムのポインターイベントハンドラーを提供する
  - `pointerType === 'touch'` の場合は 300ms のタイマーでドラッグ開始を判定する
  - `pointerType === 'mouse'` の場合は `pointermove` 発生時にすぐドラッグ開始とする
  - `pointercancel` や `pointerup`（ドラッグ開始前）ではタイマーをクリアしてリセットする

---

### Phase 3: StaffPage.tsx を更新（TDD）

- [x] `src/pages/StaffPage.test.tsx` にD&D関連テストを追加する（Red）
  - 「各スタッフアイテムにドラッグハンドル（グリップ領域）が表示される」
  - 「ドラッグハンドルにポインターダウンするとドラッグ中スタイル（`opacity-50`）が適用される」
  - 「ドロップ先アイテムにはハイライトスタイルが適用される」
  - 「ドロップ完了後、`reorderStaff` が正しいインデックスで呼ばれる」
  - 「スタッフが1件のみの場合、pointerdown → pointermove してもドラッグが開始されない」

- [x] `src/pages/StaffPage.tsx` を更新し D&D を実装する（Green）
  - `useDragSort` フックを使用する（`onReorder` に `reorderStaff` を渡す）
  - `useStaff` から `reorderStaff` を取得する
  - 各リストアイテムの左端にドラッグハンドルアイコン（`⠿`）を配置する
  - ドラッグハンドルに `getDragHandleProps(index)` のイベントハンドラーを設定する
  - `draggingIndex === i` のアイテムに `opacity-50` クラスを付与する
  - `dragOverIndex === i` のアイテムに上下いずれかのボーダーハイライトを付与する
  - ドラッグ中はリスト全体に `select-none` クラスを付与してテキスト選択を防ぐ
  - スタッフが1件以下の場合は `disabled=true` を渡す

---

### Phase 4: 仕様の更新

- [x] `openspec/specs/staff-management/spec.md` にスタッフ並び替え要件を追記する
  - 「スタッフ一覧をドラッグ&ドロップで並び替えられる」要件と各シナリオを追加する

---

### Phase 5: リファクタリング・動作確認

- [x] `useDragSort` をリファクタリングする（Refactor）
  - イベントリスナーの登録・解除が適切に行われているか確認する
  - `useCallback`/`useRef` を適切に使用してパフォーマンスを確保する
  - `isMouseDraggingRef` で pointermove の重複 setState を防止する
  - `onReorderRef` で stale クロージャを回避する

- [x] 全テストが通ることを確認する（`bun run test`）

- [x] ビルドエラーがないことを確認する（`bun run build`）
