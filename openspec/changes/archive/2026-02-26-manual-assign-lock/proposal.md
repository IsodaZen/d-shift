## Why

シフト表の自動生成後に手動で調整したアサインが、再度自動生成を実行すると上書きされてしまう問題がある。確定済みの調整内容を保護し、自動生成と手動調整を安全に組み合わせて使えるようにする必要がある。

## What Changes

- `ShiftAssignment` に `isLocked` フラグを追加し、手動登録か自動生成かを区別できるようにする
- シフト表ページから手動でアサインを登録した際、自動的に `isLocked: true` でアサインを保存する
- 自動生成アルゴリズムは、固定アサインがある（staffId + date の組み合わせに `isLocked: true` のアサインが存在する）スタッフ・日付への生成をスキップする
- 固定アサインが存在しないシフト枠のみを対象に、通常どおり自動生成でスタッフをアサインする
- シフト表上で固定アサインを視覚的に区別できる表示を追加する
- シフト表の各セル（スタッフ×日付）に固定/非固定を切り替えるトグルボタンを追加する（自動生成アサインを手動で固定化、または固定を解除できる）

## Capabilities

### New Capabilities

なし

### Modified Capabilities

- `shift-assignment`: 手動アサイン登録時に `isLocked: true` を付与する振る舞いを追加する。**BREAKING** `ShiftAssignment` 型に `isLocked: boolean` フィールドを追加する（既存データは移行が必要）
- `auto-shift-generation`: 固定アサインが存在するスタッフ・日付をスキップする制約を追加する
- `shift-schedule-view`: 固定アサインを視覚的に区別できる表示と、固定/非固定を切り替えるトグルUIを追加する

## Impact

- `src/types/index.ts`: `ShiftAssignment` 型に `isLocked: boolean` を追加
- `src/hooks/useShiftAssignments.ts`（または同等の hooks）: 手動登録時に `isLocked: true` を設定
- `src/utils/autoAssign.ts`（または同等の utils）: 固定アサインスキップロジックの追加
- `src/components/` のシフト表コンポーネント: 固定アサインの視覚的区別
- LocalStorage 既存データの移行: `isLocked` フィールドが存在しない古いデータへの `false` デフォルト適用
