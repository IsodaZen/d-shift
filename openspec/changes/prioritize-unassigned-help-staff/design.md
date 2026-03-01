## Context

現在の局所探索最適化エンジン（`src/utils/shiftOptimizer.ts`）は、解の優劣を以下の辞書式評価基準で判定している:

1. `shortfallPeak`: 最大不足人数（最小化）
2. `shortfallTotal`: 不足合計（最小化）
3. `fairnessVariance`: 通常スタッフの残余容量の母分散（最小化）
4. `parkingPeak`: 駐車場ピーク（最小化）

グリーディ生成フェーズ（`src/utils/autoShiftGenerator.ts`）では、通常スタッフで不足する場合のみヘルプスタッフをアサインする設計になっている。しかし、最適化フェーズでは「ヘルプスタッフのアサイン数を減らす」という評価基準が存在しないため、不足が同じ解の間でヘルプスタッフのアサイン有無が区別されない。

## Goals / Non-Goals

**Goals:**
- 不足充足を最優先としたまま、ヘルプスタッフのアサイン数を最小化する評価基準を追加する
- 最適化フェーズで、ヘルプスタッフを Toggle OFF する方向の操作が選択されやすくなる（ヘルプスタッフが不要な場合に積極的に外す）

**Non-Goals:**
- グリーディ生成フェーズのロジック変更
- 近傍操作（Toggle ON/OFF/Swap/Move）の種類・確率の変更
- ヘルプスタッフのアサイン制約（availableDates 等）の変更
- UI の変更

## Decisions

### 新評価基準 `helpStaffTotal` の追加

- **内容**: ヘルプスタッフが出勤している（日, スタッフ）ペアの合計数
- **位置**: shortfallTotal の次（第3位）、fairnessVariance の前（第4位）
- **計算**: `Σ working[i][d]`（i がヘルプスタッフのもの）

**なぜ shortfallTotal の次か**: 不足充足が最優先であるため、shortfallPeak と shortfallTotal を先に解消する。その後、ヘルプスタッフを極力使わない解を選好する。

**なぜ fairnessVariance の前か**: 「ヘルプスタッフをアサインしない状態を優先する」というユーザー要求は、通常スタッフの公平性よりも優先される性質の要件である。ヘルプスタッフの削減は、当該スタッフの負担を増やす（= fairness が悪化する）場合があるが、ヘルプスタッフ削減を優先することで、正規スタッフが必要十分に出勤する方向に最適化される。

**代替案**: fairnessVariance の後に置くことも可能だが、その場合は公平性を優先してヘルプスタッフが残る可能性があり、ユーザーの意図に沿わない。

### 型定義の変更

`EvalResult` インターフェース（`src/types/index.ts`）に `helpStaffTotal: number` を追加する。

型定義は `shiftOptimizer.ts` からも参照されており、追加後にコンパイルエラーが発生しないよう、`evaluate()` の return 文を同時に更新する。

### 既存テストへの影響

既存テストは `EvalResult` を明示的にオブジェクトリテラルで組み立てているケースがある。`helpStaffTotal` の追加により、既存テストが TypeScript コンパイルエラーになる可能性がある。これらは `helpStaffTotal: 0` を補完することで対処する。

## Risks / Trade-offs

- **fairnessVariance への影響**: ヘルプスタッフを外すことで、同一日に通常スタッフが追加出勤する必要が生じる場合がある。この場合、fairnessVariance が悪化することがあるが、これは設計上の意図的なトレードオフである。
- **既存テストの修正**: `EvalResult` の変更により、既存テストを修正する必要がある。ただし修正量は限定的（`helpStaffTotal: 0` の追加）。
- **性能**: `helpStaffTotal` の計算はスタッフ数 × 日数の O(n×d) ループであり、他の評価基準と同等のオーダーで、パフォーマンスへの影響は無視できる。

## Migration Plan

実装のみ変更。データ移行なし。LocalStorage のデータ構造は変更しない。

## Open Questions

なし。
