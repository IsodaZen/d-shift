## Why

スタッフ管理画面では現在、スタッフ一覧の表示順序を変更する手段が提供されていない。シフト自動生成の優先度やチーム内のグループ分けを視覚的に整理するうえで、スタッフの並び順を自由に変更できると運用上の使いやすさが向上する。

- **現状**: スタッフ一覧は登録順に固定されており、並び替えができない
- **課題**: スタッフ数が増えると特定スタッフを見つけにくく、また優先度をリスト順で管理したいニーズに応えられない
- **解決策**: ドラッグ&ドロップ（PC）および長押し後ドラッグ（モバイル）による直感的な並び替えを提供する

外部D&Dライブラリは追加せず、ブラウザ標準の Pointer Events API を使用することで、依存関係を最小に保ちながら両デバイスに対応する。

## What Changes

### useStaff フックに並び替え機能を追加

`reorderStaff(fromIndex: number, toIndex: number)` 関数を追加する。並び替え後の配列順序は LocalStorage に永続化される。

### useDragSort カスタムフックを新設

ポインターイベントベースのD&Dロジックを専用フックに切り出す。

- **PC（マウス）**: `pointerdown` 後に `pointermove` が発生した時点でドラッグ開始
- **モバイル（タッチ）**: `pointerdown` 後 300ms のタイマーが完了した時点でドラッグ開始（ホールド判定）
- ドラッグ中はターゲットアイテムの位置をリアルタイムに判定し、ドロップ先インデックスを更新する
- `pointerup` または `pointercancel` でドロップ処理を確定する

返り値:
```ts
{
  draggingIndex: number | null   // 現在ドラッグ中のアイテムインデックス
  dragOverIndex: number | null   // ドロップ先のアイテムインデックス
  getDragHandleProps: (index: number) => PointerEventHandlers
}
```

### StaffPage.tsx に D&D インタラクションを追加

- `useDragSort` フックを使用してスタッフ一覧のD&Dを実装する
- ドラッグ中のアイテムは `opacity-50` でフェードし、ドロップ先アイテムは境界線のハイライトで視覚的フィードバックを提供する
- ドラッグハンドル（グリップアイコン `⠿`）をリストアイテムの左端に配置し、操作可能な領域を明示する
- ドロップ完了時に `reorderStaff` を呼び出して順序を永続化する

## Capabilities

### Modified Capabilities

- `staff-management`: スタッフ一覧にドラッグ&ドロップ（PC）および長押し移動（モバイル）による並び替え機能を追加する

## Impact

### 新規ファイル

| ファイル | 内容 |
|---|---|
| `src/hooks/useDragSort.ts` | Pointer Events APIを使ったドラッグ&ドロップロジックフック |
| `src/hooks/useDragSort.test.ts` | useDragSort のユニットテスト |

### 変更ファイル（既存）

| ファイル | 変更内容 |
|---|---|
| `src/hooks/useStaff.ts` | `reorderStaff(fromIndex, toIndex)` 関数を追加 |
| `src/hooks/useStaff.test.ts` | `reorderStaff` のテストケースを追加 |
| `src/pages/StaffPage.tsx` | `useDragSort` を使ってD&Dを実装し、ドラッグハンドルを追加 |
| `src/pages/StaffPage.test.tsx` | D&D操作のテストケースを追加 |
| `openspec/specs/staff-management/spec.md` | 並び替え要件を追記 |
