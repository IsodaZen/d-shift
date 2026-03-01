## Context

自動シフト最適化エンジン（`shiftOptimizer.ts`）は、Hill Climbing アルゴリズムで解を改善する際に `evaluate()` を繰り返し呼び出す。この関数の公平性評価は「通常スタッフの残余容量（weeklyCapacity - 実出勤日数）の母分散」を最小化する。

現在の `weeklyCapacity` は `toInternalState()` で `getDistinctWeeks(periodDates) × s.maxWeeklyShifts` として計算されており、スタッフの希望休日数が一切考慮されていない。

## Goals / Non-Goals

**Goals:**
- `toInternalState()` の `weeklyCapacity` を「期間内希望休日数を差し引いた調整済み上限（adjustedCapacity）」で計算する
- 希望休が多いスタッフと少ないスタッフが同等の出勤負荷を持つ場合に、公平性分散が0に近くなるようにする
- `evaluate()` 関数・`EvaluateParams` インターフェースのシグネチャを変更しない

**Non-Goals:**
- 評価関数の評価指標（残余容量の母分散）自体を変更しない
- ヘルプスタッフの公平性計算を追加しない（現在通り除外）
- 最適化アルゴリズム（Hill Climbing）の変更をしない

## Decisions

### 決定1: 変更箇所を `toInternalState()` の `weeklyCapacity` 計算に限定する

**採用**: `adjustedCapacity = Math.max(0, weeks × maxWeeklyShifts - preferredDayOffCountInPeriod)` を `toInternalState()` 内で計算し、既存の `weeklyCapacity` フィールドに代入する。

**却下した代替案**:
- `evaluate()` 関数内で希望休をカウントする: `evaluate()` は最適化ループ内で毎イテレーション呼ばれるためパフォーマンスへの悪影響がある。また `evaluate()` は `EvaluateParams` のみを入力として受け取るべきで、dayOffs 情報を追加で受け取るのはインターフェース設計として不適切
- 出勤率（workedDays / adjustedCapacity）ベースの公平性指標に変更する: 既存テストへの影響が大きく、`adjustedCapacity = 0` のゼロ除算ガードも必要になる。問題の本質（weeklyCapacity の誤計算）を修正するだけで十分

### 決定2: 期間外の希望休を除外する

`preferredDayOffDates` には期間外の日付が含まれる可能性があるため、`periodDates` に含まれる日付のみをカウントする。`Set` を使った O(1) 参照で効率的に判定する。

### 決定3: 調整済み上限の下限を0とする

希望休日数が `weeks × maxWeeklyShifts` を超えた場合（理論上の異常値）に備え、`Math.max(0, ...)` で下限を0とする。

## Risks / Trade-offs

- **[リスク] 週をまたぐ希望休の境界誤差**: 週の途中から希望休が集中する場合、週上限の強制チェック（`isValidToggleOn()`）と評価関数の認識に若干の差が生じる可能性がある。→ **緩和**: 週上限の強制チェックは `isValidToggleOn()` が正確に行うため、評価関数の多少の誤差は制約違反を発生させない。評価関数はあくまで解の方向付けを行うものであり、許容範囲と判断する
- **[トレードオフ] 既存テストの `weeklyCapacity` の意味変化**: 既存の evaluate テストが `weeklyCapacity` を「調整なしの週上限合計」として設定している場合、それらのテストは引き続き正しく機能する（`evaluate()` のシグネチャは変わらないため）。ただし、`toInternalState()` のテストには調整済み上限の検証を追加する
