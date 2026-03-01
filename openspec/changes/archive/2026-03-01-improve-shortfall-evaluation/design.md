## Context

シフト最適化エンジン（`shiftOptimizer.ts`）は Hill Climbing（最急降下法）で解を探索し、3基準の辞書式比較（`shortfallPeak → fairnessVariance → parkingPeak`）で解の優劣を判定している。

**現状の問題**: `shortfallPeak`（最大不足人数）だけでは「不足1人が1箇所」と「不足1人が5箇所」を同等に扱う。不足ピークが同じなら `fairnessVariance`（公平性）で判定されるため、不足箇所が多い解が選ばれてしまうケースがある。また探索の制限時間が8秒であり、ユーザーが10秒程度まで許容できることから、延長により改善の余地がある。

**影響範囲**: `EvalResult`型・`DEFAULT_OPTIMIZATION_CONFIG`定数（`src/types/index.ts`）、`evaluate()`・`isBetter()`関数（`src/utils/shiftOptimizer.ts`）、および関連テスト。

## Goals / Non-Goals

**Goals:**
- `EvalResult`に`shortfallTotal`（全(日×時間帯)の不足人数合計）を追加し、辞書式比較順を `shortfallPeak → shortfallTotal → fairnessVariance → parkingPeak` に変更する
- `DEFAULT_OPTIMIZATION_CONFIG.timeLimitMs` を `8000` → `10000`（10秒）に延長する
- 既存のすべてのテストが引き続きパスすること

**Non-Goals:**
- 近傍操作（`generateNeighbor`）の改善（不足箇所を狙った探索優先）は今回のスコープ外
- Multi-start Hill Climbing などアルゴリズムの構造変更は今回のスコープ外

## Decisions

### 決定1: `shortfallTotal` を評価基準2（`shortfallPeak`の次）に配置する

**選択肢**:
- A. `shortfallTotal` を評価基準1にする（`shortfallTotal → shortfallPeak → ...`）
- B. `shortfallTotal` を評価基準2にする（`shortfallPeak → shortfallTotal → ...`）

**決定**: B を選択。

**理由**: 「不足ピーク（最大1箇所あたりの不足人数）を最小化する」は「不足の合計を最小化する」よりも優先度が高い。1箇所で3人不足している解より、3箇所で各1人不足している解（合計は同じ）のほうが運用上深刻なケースがある。まず最大不足を抑えてから、件数・合計を減らす順が自然。

### 決定2: `shortfallTotal` は全(日×時間帯)ペアの不足人数の合計とする

**選択肢**:
- A. `shortfallTotal`: 全ペアの不足人数の**合計**（Σ不足人数）
- B. `shortfallCount`: 不足が発生したペアの**件数**（不足>0のペア数）

**決定**: A（合計）を選択。

**理由**: ユーザーの要件として「不足人数が大切」とのこと。件数ではなく人数の合計を評価することで、例えば「1箇所で2人不足」と「2箇所で各1人不足」を同じ合計（2）として扱い、不足の深刻度に比例した評価ができる。

### 決定3: `timeLimitMs` のみを延長し、`maxIterations` や `noImprovementLimit` は変更しない

**理由**: 実際の探索は `noImprovementLimit`（1000回改善なし）で早期終了することが多く、`maxIterations`の増加は効果が薄い。制限時間を10秒に延ばすことで、最適解付近での細かい改善に使える時間が増える。

## Risks / Trade-offs

- **ユーザー待機時間の増加**: `timeLimitMs`延長により最大で約2秒待機時間が増えるが、ユーザーが「10秒程度なら待てる」と確認済みのため許容範囲。ただし `noImprovementLimit`で早期終了する場合は影響しない。
- **既存テストの`EvalResult`型の変更**: `shortfallTotal`フィールドが追加されるため、`EvalResult`を直接構築しているテストは期待値に`shortfallTotal`を追加する必要がある。ただしロジックの変更ではなく、型定義・期待値の追加のみ。
- **`isBetter`比較結果の変化**: 既存のテストで「改善あり/なし」の判定が変わる可能性があるが、変更前後で `shortfallPeak` が異なる場合は結果が変わらないため影響は限定的。
