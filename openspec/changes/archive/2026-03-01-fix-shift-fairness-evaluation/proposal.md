## Why

自動シフト最適化エンジンの評価関数（`evaluate()`）が公平性スコアを計算する際、スタッフの希望休日数を考慮していない。そのため、希望休が多いスタッフを「余裕がある」と誤判定し、他のスタッフのシフトも連鎖的に週上限に届かなくなるという問題が発生している。

## What Changes

- `shiftOptimizer.ts` の `toInternalState()` 関数が計算する `weeklyCapacity` を、「期間内の希望休日数を差し引いた調整済み上限（adjustedCapacity）」に変更する
  - `adjustedCapacity = Math.max(0, 期間内週数 × 週上限 - 期間内希望休日数)`
  - 期間外の希望休は対象外とする
  - 下限は0（負の値にならない）
- 評価関数 `evaluate()` 本体のシグネチャは変更しない（`weeklyCapacity` フィールドに調整済みの値が入るようになる）

## Capabilities

### New Capabilities

なし

### Modified Capabilities

- `auto-shift-generation`: 最適化フェーズの公平性評価基準に「希望休を考慮した調整済み上限（adjustedCapacity）」を導入する要件を追加

## Impact

- `src/utils/shiftOptimizer.ts`（`toInternalState()` の `weeklyCapacity` 計算部分）
- `src/utils/shiftOptimizer.evaluate.test.ts`（テスト追加）
