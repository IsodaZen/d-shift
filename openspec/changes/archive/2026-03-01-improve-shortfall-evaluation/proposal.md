## Why

シフト最適化エンジンの評価関数は「不足ピーク（最大不足人数）」のみを評価しているため、不足ピークが同じ場合に「不足1人が1箇所」と「不足1人が5箇所」を同等に扱ってしまう。また探索の制限時間が8秒と短く、より良い解を発見する機会を逃している。アサイン不足を極力減らすには、不足の「合計人数」も評価基準に含め、探索時間を延ばす必要がある。

## What Changes

- `EvalResult`型に`shortfallTotal`フィールドを追加する
- `evaluate()`関数で全(日×時間帯)の不足人数の合計を計算する
- `isBetter()`の辞書式比較に`shortfallTotal`を`shortfallPeak`の次に追加する（`shortfallPeak → shortfallTotal → fairnessVariance → parkingPeak`）
- `DEFAULT_OPTIMIZATION_CONFIG`の`timeLimitMs`を`8000`から`10000`（10秒）に延長する

## Capabilities

### New Capabilities

なし

### Modified Capabilities

- `auto-shift-generation`: 最適化エンジンの評価基準が変わることで、シフト自動生成結果がより不足の少ない解を選ぶようになる

## Impact

- `src/types/index.ts`: `EvalResult`型・`DEFAULT_OPTIMIZATION_CONFIG`定数の変更
- `src/utils/shiftOptimizer.ts`: `evaluate()`・`isBetter()`関数の変更
- `src/utils/shiftOptimizer.evaluate.test.ts`: `shortfallTotal`に関するテストの追加
- 既存テストの期待値（`EvalResult`を参照しているもの）の更新が必要になる場合がある
