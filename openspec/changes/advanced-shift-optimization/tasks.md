## 1. 型定義・データ構造

- [ ] 1.1 最適化関連の型定義のテストを書く（Red）
- [ ] 1.2 最適化関連の型定義を追加する（Green）: OptimizationConfig, EvalResult, OptimizerInput 等を `src/types/index.ts` に追加

## 2. 評価関数

- [ ] 2.1 評価関数のテストを書く（Red）: 不足ピーク計算、残余容量分散、駐車場ピーク、辞書式比較
- [ ] 2.2 評価関数を実装する（Green）: `evaluate()` と `isBetter()` を `src/utils/shiftOptimizer.ts` に実装
- [ ] 2.3 評価関数をリファクタリングする（Refactor）

## 3. 制約チェック

- [ ] 3.1 制約チェック関数のテストを書く（Red）: 希望休、週上限、駐車場空き、固定アサイン
- [ ] 3.2 制約チェック関数を実装する（Green）: `isValidToggleOn()`, `isValidSwap()`, `isValidMove()` を実装
- [ ] 3.3 制約チェック関数をリファクタリングする（Refactor）

## 4. 近傍操作

- [ ] 4.1 近傍操作のテストを書く（Red）: Toggle ON/OFF, Swap, Move の各操作
- [ ] 4.2 近傍操作を実装する（Green）: `generateNeighbor()` を実装
- [ ] 4.3 近傍操作をリファクタリングする（Refactor）

## 5. 最適化エンジン（Hill Climbing）

- [ ] 5.1 最適化エンジンのテストを書く（Red）: 終了条件、改善の受理、初期解の維持
- [ ] 5.2 最適化エンジンを実装する（Green）: `optimizeShift()` メイン関数
- [ ] 5.3 初期解 ↔ 内部表現の変換関数のテストを書く（Red）
- [ ] 5.4 初期解 ↔ 内部表現の変換関数を実装する（Green）: `toInternalState()`, `toAssignments()`
- [ ] 5.5 最適化エンジンをリファクタリングする（Refactor）

## 6. Web Worker 統合

- [ ] 6.1 Web Worker ラッパーのテストを書く（Red）: メッセージ送受信、プログレス通知
- [ ] 6.2 Web Worker ラッパーを実装する（Green）: `src/utils/shiftOptimizer.worker.ts`
- [ ] 6.3 Web Worker 呼び出しフックのテストを書く（Red）
- [ ] 6.4 Web Worker 呼び出しフックを実装する（Green）: `src/hooks/useShiftOptimizer.ts`

## 7. UI統合（ShiftPage）

- [ ] 7.1 ローディング表示コンポーネントのテストを書く（Red）
- [ ] 7.2 ローディング表示コンポーネントを実装する（Green）
- [ ] 7.3 ShiftPage に最適化フローを統合するテストを書く（Red）
- [ ] 7.4 ShiftPage に最適化フローを統合する（Green）: applyAutoShift を非同期化、ローディング表示

## 8. 結合テスト・最終検証

- [ ] 8.1 結合テストを書く: グリーディ生成 → 最適化 → 結果検証のE2Eフロー
- [ ] 8.2 全テスト実行・修正
