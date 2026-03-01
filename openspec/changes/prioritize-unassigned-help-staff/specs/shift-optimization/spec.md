## ADDED Requirements

### Requirement: 評価基準3 — ヘルプスタッフ出勤日数の最小化

システムは、全期間のヘルプスタッフが出勤している（スタッフ, 日付）ペアの合計数を第3評価基準（helpStaffTotal）として使用しなければならない（SHALL）。この基準は評価基準1（shortfallPeak）と評価基準2（shortfallTotal）が同値の場合にのみ比較に使用される。

`helpStaffTotal = Σ working[i][d]`（i がヘルプスタッフのもの）

固定アサイン（`isLocked: true`）によりヘルプスタッフが出勤している日もカウント対象に含まれる。

この評価基準により、不足充足が同等の解の中から、ヘルプスタッフのアサインが最小となる解が選好される。近傍操作（Toggle ON/OFF/Swap/Move）の評価においても、ヘルプスタッフを Toggle ON する操作は helpStaffTotal を増加させるため不利に、ヘルプスタッフを Toggle OFF する操作は helpStaffTotal を減少させるため有利に評価される（評価基準1〜2が同値の場合）。

#### Scenario: ヘルプスタッフのアサインが少ない解が優先される

- **GIVEN** 解Aはヘルプスタッフが3日出勤している（helpStaffTotal=3）
- **AND** 解Bはヘルプスタッフが1日出勤している（helpStaffTotal=1）
- **AND** 両解の評価基準1（shortfallPeak）と評価基準2（shortfallTotal）が同値である
- **WHEN** 両解を評価基準3で比較する
- **THEN** 解Bが優先される（helpStaffTotal が小さい）

#### Scenario: ヘルプスタッフをアサインしない解が最も優先される

- **GIVEN** 解Aはヘルプスタッフが0日出勤している（helpStaffTotal=0）
- **AND** 解Bはヘルプスタッフが1日以上出勤している（helpStaffTotal>0）
- **AND** 両解の評価基準1・2が同値である
- **WHEN** 両解を評価基準3で比較する
- **THEN** 解Aが優先される

#### Scenario: 不足が多い場合は評価基準1・2が優先されhelpStaffTotalは比較に使用されない

- **GIVEN** 解Aは shortfallPeak=0、helpStaffTotal=5
- **AND** 解Bは shortfallPeak=1、helpStaffTotal=0
- **WHEN** 両解を辞書式比較する
- **THEN** 解Aが優先される（shortfallPeak が小さい。helpStaffTotal は比較されない）

#### Scenario: helpStaffTotalの計算では通常スタッフの出勤日はカウントしない

- **GIVEN** 通常スタッフが5日出勤し、ヘルプスタッフが2日出勤している
- **WHEN** helpStaffTotal を計算する
- **THEN** helpStaffTotal = 2 となる（通常スタッフの5日はカウントされない）

#### Scenario: shortfallTotalが異なる場合はhelpStaffTotalは比較されない

- **GIVEN** 解Aは shortfallPeak=0、shortfallTotal=1、helpStaffTotal=0
- **AND** 解Bは shortfallPeak=0、shortfallTotal=2、helpStaffTotal=5
- **WHEN** 両解を辞書式比較する
- **THEN** 解Aが優先される（shortfallTotal が小さい。helpStaffTotal は比較されない）

---

## MODIFIED Requirements

### Requirement: 評価基準2 — スタッフ負担の公平性

システムは、各通常スタッフの残余容量（期間内の全週にわたる週上限出勤回数の合計 - 実出勤日数）の母分散（N で割る）を第4評価基準として使用しなければならない（SHALL）。この基準は評価基準1（shortfallPeak）・評価基準2（shortfallTotal）・評価基準3（helpStaffTotal）がすべて同値の場合にのみ比較に使用される。ヘルプスタッフはこの基準の計算対象から除外する（ヘルプスタッフには週上限が存在しないため）。

**注記**: 本要求は旧 `評価基準2` の位置づけから `評価基準4` へ変更される。本文中の「第4評価基準」という記述、および比較条件「評価基準1〜3がすべて同値の場合にのみ」という記述が旧仕様からの変更点である。

#### Scenario: 分散が小さい解が優先される

- **GIVEN** 解Aのスタッフ残余容量が [2, 0, 3]（母分散 = 1.56）
- **AND** 解Bのスタッフ残余容量が [1, 1, 2]（母分散 = 0.22）
- **AND** 両解の評価基準1（shortfallPeak）・評価基準2（shortfallTotal）・評価基準3（helpStaffTotal）が同値
- **WHEN** 両解を評価基準4で比較する
- **THEN** 解Bが優先される（母分散が小さい）

#### Scenario: 評価基準1〜3のいずれかが異なる場合、評価基準4は比較に使用されない

- **GIVEN** 解Aの最大不足（shortfallPeak）が1人・母分散が0.1
- **AND** 解Bの最大不足（shortfallPeak）が0人・母分散が2.0
- **WHEN** 両解を辞書式比較する
- **THEN** 解Bが優先される（評価基準1が優先。母分散（評価基準4）は比較されない）

#### Scenario: shortfallPeakが同値でhelpStaffTotalが異なる場合も評価基準4は比較に使用されない

- **GIVEN** 解Aは shortfallPeak=0、shortfallTotal=0、helpStaffTotal=1、fairnessVariance=0.1
- **AND** 解Bは shortfallPeak=0、shortfallTotal=0、helpStaffTotal=3、fairnessVariance=0.0
- **WHEN** 両解を辞書式比較する
- **THEN** 解Aが優先される（評価基準3 helpStaffTotal が小さい。fairnessVariance（評価基準4）は比較されない）

---

### Requirement: 評価基準3 — 駐車場ピーク利用数の最小化

**[変更前: 評価基準3（第3優先） → 変更後: 評価基準5（第5優先）]**

システムは、全期間の各日における駐車場利用スタッフ数の最大値を第5評価基準として使用しなければならない（SHALL）。駐車場利用スタッフ数は、その日に出勤する `usesParking: true` のスタッフの人数である。この基準は評価基準1（shortfallPeak）・評価基準2（shortfallTotal）・評価基準3（helpStaffTotal）・評価基準4（fairnessVariance）がすべて同値の場合にのみ比較に使用される。

#### Scenario: 駐車場ピークが低い解が優先される

- **GIVEN** 解Aの最大日次駐車場利用数が5台、解Bの最大日次駐車場利用数が4台
- **AND** 両解の shortfallPeak・shortfallTotal・helpStaffTotal・fairnessVariance がすべて同値
- **WHEN** 両解を評価基準5で比較する
- **THEN** 解Bが優先される（ピーク利用数が小さい）

#### Scenario: 駐車場利用を分散する解が優先される

- **GIVEN** 解Aは1日に5台・別の日に3台、解Bは両日とも4台
- **AND** 両解の shortfallPeak・shortfallTotal・helpStaffTotal・fairnessVariance がすべて同値
- **WHEN** 両解を評価基準5で比較する
- **THEN** 解Bが優先される（ピーク = 4 < 5）
