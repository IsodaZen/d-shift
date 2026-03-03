## 1. テスト作成（Red フェーズ）

- [x] 1.1 `shiftOptimizer.evaluate.test.ts` に `helpStaffTotal` の計算テストを追加する（ヘルプスタッフの出勤日数が正しくカウントされること・通常スタッフの出勤日はカウントされないことを検証）
- [x] 1.2 `shiftOptimizer.evaluate.test.ts` に `isBetter()` の `helpStaffTotal` 優先順位テストを追加する（shortfallTotal が同じ場合に helpStaffTotal の小さい解が優先されること・shortfallPeak が異なる場合は helpStaffTotal が比較されないことを検証）

## 2. 型定義の更新

- [x] 2.1 `src/types/index.ts` の `EvalResult` インターフェースに `helpStaffTotal: number` を追加する

## 3. 評価ロジックの実装（Green フェーズ）

- [x] 3.1 `src/utils/shiftOptimizer.ts` の `evaluate()` 関数にヘルプスタッフ出勤日数を計算するループを追加し、戻り値に `helpStaffTotal` を含める
- [x] 3.2 `src/utils/shiftOptimizer.ts` の `isBetter()` 関数に `helpStaffTotal` の辞書式比較を追加する（shortfallTotal の次、fairnessVariance の前）

## 4. 既存テストの修正

- [x] 4.1 `EvalResult` を明示的に組み立てている既存テストコードに `helpStaffTotal: 0` を補完し、TypeScript コンパイルエラーを解消する

## 5. 動作確認

- [x] 5.1 `bun run test` を実行し、全テストが通ることを確認する
