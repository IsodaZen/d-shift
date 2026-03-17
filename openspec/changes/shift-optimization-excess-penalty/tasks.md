## 1. テスト追加（Red）— `EvalResult` 型

- [x] 1.1 `src/types/optimizer.test.ts` に `excessTotal` フィールドの存在を確認するテストを追加する（`EvalResult` 型定義テストを更新）

## 2. テスト追加（Red）— `evaluate()` 関数の `excessTotal` 計算

- [x] 2.1 `src/utils/shiftOptimizer.evaluate.test.ts` に「超過のないケースで `excessTotal = 0`」テストを追加する
- [x] 2.2 `src/utils/shiftOptimizer.evaluate.test.ts` に「1スロット超過で `excessTotal` が正しく計算される」テストを追加する（例: 必要2人・アサイン3人 → excessTotal = 1）
- [x] 2.3 `src/utils/shiftOptimizer.evaluate.test.ts` に「複数スロット超過の合算が正しい」テストを追加する（例: スロット1超過1 + スロット2超過2 → excessTotal = 3）
- [x] 2.4 `src/utils/shiftOptimizer.evaluate.test.ts` に「必要人数0のスロットはexcesTotal計算から除外される」テストを追加する

## 3. テスト追加（Red）— `isBetter()` の `excessTotal` 比較

- [x] 3.1 `src/utils/shiftOptimizer.evaluate.test.ts` に「超過なし解が超過あり解より優先される（shortfallPeak 同値時）」テストを追加する
- [x] 3.2 `src/utils/shiftOptimizer.evaluate.test.ts` に「超過合計が小さい解が優先される」テストを追加する
- [x] 3.3 `src/utils/shiftOptimizer.evaluate.test.ts` に「shortfallPeak が異なれば excessTotal は比較に使用されない」テストを追加する（不足が多くても超過なしより不足なしが優先）
- [x] 3.4 `src/utils/shiftOptimizer.evaluate.test.ts` に「excessTotal が同値なら fairnessVariance で比較される」テストを追加する

## 4. 型定義の更新（Green）

- [x] 4.1 `src/types/index.ts` の `EvalResult` インターフェースに `excessTotal: number` フィールドを `shortfallTotal` の後に追加する

## 5. `evaluate()` 関数の実装（Green）

- [x] 5.1 `src/utils/shiftOptimizer.ts` の `evaluate()` 内の不足計算ループに `excessTotal` の合算処理を追加する（`Σ max(0, assigned - required)`、`required > 0` のペアのみ対象）
- [x] 5.2 `src/utils/shiftOptimizer.ts` の `evaluate()` の戻り値に `excessTotal` を追加する

## 6. `isBetter()` 関数の実装（Green）

- [x] 6.1 `src/utils/shiftOptimizer.ts` の `isBetter()` に `excessTotal` の辞書式比較を追加する（`shortfallTotal` の比較の後、`helpStaffTotal` の比較の前に挿入）

## 7. 既存テストの修正

- [x] 7.1 `src/types/optimizer.test.ts` の `EvalResult` オブジェクトリテラルに `excessTotal: 0` を追加する（型エラー解消）
- [x] 7.2 `src/utils/shiftOptimizer.evaluate.test.ts` の既存 `EvalResult` オブジェクトリテラルすべてに `excessTotal: 0` を追加する（型エラー解消）

## 8. テスト実行と確認

- [x] 8.1 `bun run test` を実行し、新規追加テストが PASS することを確認する
- [x] 8.2 `bun run test` で全テストが PASS することを確認する（回帰なし）
