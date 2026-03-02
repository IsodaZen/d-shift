## MODIFIED Requirements

### Requirement: 各日・各時間帯の必要人数を可能な限り満たす（ベストエフォート）

システムは、シフト枠設定で定義された各日・各時間帯の必要人数を達成するよう、制約の範囲内で最大限スタッフを割り当てなければならない（SHALL）。制約により必要人数を満たせない場合は達成できる範囲でアサインを生成し、不足の場合もエラーにはならない。

最適化エンジンは以下の辞書式評価基準（値が小さいほど良い）で解の優劣を判定しなければならない（SHALL）:

1. `shortfallPeak`: 全(日×時間帯)ペアにおける最大不足人数
2. `shortfallTotal`: 全(日×時間帯)ペアにおける不足人数の合計。`shortfallTotal = Σ max(0, requiredCount - アサイン人数)` （requiredCount > 0 の全(日×時間帯)ペアが対象、requiredCount = 0 のペアは計算対象外）
3. `helpStaffTotal`: 全期間でヘルプスタッフが出勤している（スタッフ, 日付）ペアの合計数。`helpStaffTotal = Σ working[i][d]`（i がヘルプスタッフのもの）
4. `fairnessVariance`: 通常スタッフの「調整済み上限 - 実出勤日数」（残余容量）の母分散
5. `parkingPeak`: 同一日の最大駐車場利用スタッフ数

比較ルールは以下のとおり:

- `shortfallPeak` が異なる場合、`shortfallPeak` が小さい解を優先する
- `shortfallPeak` が同一の場合、`shortfallTotal` が小さい解を優先する
- `shortfallPeak` と `shortfallTotal` が同一の場合、`helpStaffTotal` が小さい解を優先する
- `shortfallPeak`・`shortfallTotal`・`helpStaffTotal` が同一の場合、`fairnessVariance` が小さい解を優先する
- 上記4基準すべて同一の場合、`parkingPeak` が小さい解を優先する

**グリーディ生成フェーズへの影響**: グリーディ生成フェーズのソート順（通常スタッフを優先し、ヘルプスタッフを後回しにする初期解を生成する）は変更しない。helpStaffTotal の最小化は局所探索最適化フェーズで行う。

#### Scenario: 制約を満たしつつ必要人数分のアサインが生成される

- **WHEN** ある日の午前の必要人数が3人で、制約を満たす割り当て可能なスタッフが3人以上いる
- **THEN** その日の午前に3人がアサインされる

#### Scenario: スタッフ不足の場合は達成可能な人数でアサインが生成される

- **WHEN** ある日の午前の必要人数が3人だが、制約を満たす割り当て可能なスタッフが1人しかいない
- **THEN** 1人がアサインされ、エラーは発生しない

#### Scenario: 全(日×時間帯)で必要人数が充足している場合、shortfallTotalは0になる

- **GIVEN** 全日程・全時間帯でアサイン人数が必要人数以上である
- **WHEN** shortfallTotal を計算する
- **THEN** shortfallTotal = 0 となる

#### Scenario: 必要人数が0の時間帯はshortfallTotalの計算対象外となる

- **GIVEN** ある日の夕方の requiredCount が 0 であり、アサインも 0 人である
- **WHEN** shortfallTotal を計算する
- **THEN** 夕方の時間帯は不足計算から除外され、shortfallTotal に加算されない

#### Scenario: 不足ピークが同じ場合は不足合計が少ない解を優先する

- **GIVEN** 解Aは shortfallPeak=1、shortfallTotal=1 である
- **AND** 解Bは shortfallPeak=1、shortfallTotal=3 である
- **WHEN** 最適化エンジンが解Aと解Bを比較する
- **THEN** shortfallPeak が同一のため、shortfallTotal が小さい解A（shortfallTotal=1）を優先する

#### Scenario: 不足ピークが異なる場合は不足ピークで優先する

- **GIVEN** 解Aは shortfallPeak=1、shortfallTotal=10 である
- **AND** 解Bは shortfallPeak=2、shortfallTotal=2 である
- **WHEN** 最適化エンジンが解Aと解Bを比較する
- **THEN** shortfallTotal に関わらず、shortfallPeak が小さい解A（shortfallPeak=1）を優先する

#### Scenario: 不足ピークと不足合計が同じ場合はヘルプスタッフ数で優先する

- **GIVEN** 解Aは shortfallPeak=0、shortfallTotal=0、helpStaffTotal=3 である
- **AND** 解Bは shortfallPeak=0、shortfallTotal=0、helpStaffTotal=1 である
- **WHEN** 最適化エンジンが解Aと解Bを比較する
- **THEN** shortfallPeak・shortfallTotal が同一のため、helpStaffTotal が小さい解B（helpStaffTotal=1）を優先する

#### Scenario: 不足・ヘルプスタッフ数が同じ場合は公平性で優先する

- **GIVEN** 解Aは shortfallPeak=0、shortfallTotal=0、helpStaffTotal=0、fairnessVariance=0.5 である
- **AND** 解Bは shortfallPeak=0、shortfallTotal=0、helpStaffTotal=0、fairnessVariance=2.0 である
- **WHEN** 最適化エンジンが解Aと解Bを比較する
- **THEN** shortfallPeak・shortfallTotal・helpStaffTotal が同一のため、fairnessVariance が小さい解A（fairnessVariance=0.5）を優先する
