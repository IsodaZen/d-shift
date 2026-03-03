## Why

現在の自動シフト生成では、局所探索（Hill Climbing）最適化フェーズにおいて「ヘルプスタッフのアサイン数を最小化する」という評価基準が存在しない。そのため、不足人数が同じであれば、ヘルプスタッフを多く使う解と少ない解が同等に扱われ、不必要にヘルプスタッフがアサインされる可能性がある。

## What Changes

- `EvalResult` インターフェースに `helpStaffTotal`（ヘルプスタッフの出勤日数合計）を追加する
- `evaluate()` 関数でヘルプスタッフの出勤日数を集計する処理を追加する
- `isBetter()` 関数の辞書式比較において、`shortfallTotal` の次かつ `fairnessVariance` の前に `helpStaffTotal` の比較を追加する

## Capabilities

### New Capabilities

（なし）

### Modified Capabilities

- `shift-optimization`: 評価基準を4段階から5段階に拡張し、`helpStaffTotal`（ヘルプスタッフ出勤日数最小化）を第3優先として追加する
- `auto-shift-generation`: 最適化フェーズの評価基準説明を5段階に更新する

## Impact

- `src/types/index.ts`: `EvalResult` インターフェースに `helpStaffTotal: number` を追加
- `src/utils/shiftOptimizer.ts`: `evaluate()` および `isBetter()` を変更
- `src/utils/shiftOptimizer.evaluate.test.ts`: 新評価基準のテストを追加
- **既存の他機能への影響なし**: 近傍操作（Toggle/Swap/Move）・グリーディ生成・UI は変更しない
