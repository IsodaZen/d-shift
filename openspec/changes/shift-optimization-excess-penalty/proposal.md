## Why

自動シフト作成において、アサイン枠を超えるシフトが生成されるバグが報告されている。根本原因は最適化エンジンの評価関数に「超過ペナルティ」がないことで、スタッフを多く出勤させるほど高スコアになり、必要人数を超えたアサインが抑制されない。

## What Changes

- `EvalResult` 型に `excessTotal` フィールドを追加（各(日, 時間帯)ペアの超過人数の合計）
- `evaluate()` 関数で `excessTotal` を計算（`requiredCount > 0` のペアでのみ `max(0, アサイン数 - requiredCount)` を合算）
- `isBetter()` の辞書式比較に `excessTotal` を追加（`shortfallTotal` の後、`helpStaffTotal` の前）
- 仕様に「評価基準: 超過人数最小化」を追記

## Capabilities

### New Capabilities

（なし）

### Modified Capabilities

- `shift-optimization`: 評価関数に超過ペナルティ（`excessTotal`）評価基準を追加。辞書式比較順が変更される（breaking ではないが動作変更あり）

## Impact

- `src/types/index.ts`: `EvalResult` 型定義の変更
- `src/utils/shiftOptimizer.ts`: `evaluate()` および `isBetter()` の変更
- 上記関数を利用するすべての既存テスト（`shiftOptimizer.evaluate.test.ts` など）で `EvalResult` の期待値に `excessTotal` を追加する必要がある
