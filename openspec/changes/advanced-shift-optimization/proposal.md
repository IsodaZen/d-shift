## Why

現在の自動シフト生成はグリーディ（日付順に貪欲に割り当て）アルゴリズムのため、局所的な判断が全体最適を阻害するケースがある。具体的には、前半の日程にスタッフを多く割り当てた結果、後半で不足が集中したり、特定スタッフへの負担が偏ったりする問題が発生する。局所探索による最適化を導入し、より公平で効率的なシフトを生成する。

## What Changes

- 既存のグリーディ生成結果を初期解として、局所探索（Hill Climbing）で最適化するエンジンを追加
- 3段階の辞書式評価基準を導入:
  1. 不足人数のピーク最小化（全(日,時間帯)の最大不足を最小化）
  2. 負担公平性（スタッフごとの残余容量の分散を最小化）
  3. 駐車場ピーク最小化（各日の駐車場利用数の最大値を最小化）
- Web Worker で最適化処理を実行し、UIスレッドのブロックを防止
- 自動生成ボタン押下後のローディング表示を追加

## Capabilities

### New Capabilities
- `shift-optimization`: 局所探索による自動シフト最適化エンジン。評価関数、近傍操作、制約チェック、Web Worker統合を含む

### Modified Capabilities
- `auto-shift-generation`: 自動生成フローに最適化ステップとローディング表示を追加。生成後に最適化エンジンを呼び出し、結果を適用する

## Impact

- `src/utils/autoShiftGenerator.ts`: 既存コードは変更なし。最適化エンジンが生成結果を受け取って改善する
- `src/utils/shiftOptimizer.ts`: 新規。局所探索アルゴリズムの実装
- `src/utils/shiftOptimizer.worker.ts`: 新規。Web Worker ラッパー
- `src/pages/ShiftPage.tsx`: 自動生成フローに最適化呼び出しとローディング表示を追加
- `src/types/index.ts`: 最適化関連の型定義を追加（OptimizationResult等）
