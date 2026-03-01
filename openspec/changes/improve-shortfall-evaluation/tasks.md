## 1. 型定義の更新

- [ ] 1.1 `EvalResult`型に`shortfallTotal: number`フィールドを追加するテストを書く（Red）
- [ ] 1.2 `src/types/index.ts`の`EvalResult`型に`shortfallTotal: number`フィールドを追加する（Green）
- [ ] 1.3 `DEFAULT_OPTIMIZATION_CONFIG`の`timeLimitMs`を`10000`に変更するテストを書く（Red）
- [ ] 1.4 `src/types/index.ts`の`DEFAULT_OPTIMIZATION_CONFIG.timeLimitMs`を`10000`に変更する（Green）

## 2. 評価関数の更新

- [ ] 2.1 `evaluate()`が`shortfallTotal`（全ペアの不足人数合計）を正しく計算するテストを書く（Red）
- [ ] 2.2 `src/utils/shiftOptimizer.ts`の`evaluate()`関数に`shortfallTotal`の計算ロジックを追加する（Green）
- [ ] 2.3 requiredCount=0のペアがshortfallTotalの計算対象外になることを検証するテストを書く（Red）
- [ ] 2.4 上記テストがパスすることを確認する（requiredCount=0のペアは`if (required <= 0) continue`で既にスキップされる）（Green）

## 3. 辞書式比較の更新

- [ ] 3.1 `isBetter()`が`shortfallPeak`同一のとき`shortfallTotal`で比較するテストを書く（Red）
- [ ] 3.2 `src/utils/shiftOptimizer.ts`の`isBetter()`関数に`shortfallTotal`の比較ロジックを追加する（Green）
- [ ] 3.3 `isBetter()`の比較順（shortfallPeak → shortfallTotal → fairnessVariance → parkingPeak）を網羅するテストを追加する（Refactor）

## 4. 既存テストの修正

- [ ] 4.1 `EvalResult`を直接構築している既存テストに`shortfallTotal`フィールドを追加する
- [ ] 4.2 `bun run test`を実行し、全テストがパスすることを確認する

## 5. 動作確認

- [ ] 5.1 `bun run build`でビルドエラーがないことを確認する
