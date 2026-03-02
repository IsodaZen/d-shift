# shift-optimization Specification

## Purpose

局所探索アルゴリズムを用いて、グリーディアルゴリズムで生成されたシフト初期解を改善する最適化エンジンの仕様。評価基準に基づきより良い解を探索し、不足ピークの最小化・スタッフ負担の公平化・駐車場ピーク最小化を実現する。

## Requirements

### Requirement: 局所探索により自動生成結果を最適化する

システムは、グリーディアルゴリズムで生成されたシフト割り当て（初期解）を局所探索で改善しなければならない（SHALL）。最適化は既存の強制制約をすべて維持しながら、辞書式評価基準に基づいてより良い解を探索する。最適化後のシフト割り当ては、初期解と同じデータ構造（`ShiftAssignment[]`）で返却される。

**基本前提（全時間帯アサイン原則）**: 最適化の内部表現では、スタッフの出勤状態を日単位の真偽値（`working[staffIndex][dateIndex]`）で管理する。「出勤」は、そのスタッフの `availableSlots` に含まれるすべての時間帯（必要人数 > 0）にアサインされることを意味する。この原則は既存仕様 `auto-shift-generation` の「出勤日には利用可能な全時間帯にアサインする」制約と同一である。

#### Scenario: 初期解が改善可能な場合、最適化により評価値が改善される
- **GIVEN** スタッフ3人（各週上限5日）、5日間の期間で、初期解が1日目に3人出勤・2〜5日目に0〜1人出勤の偏った状態
- **AND** スタッフを均等に分散すれば不足ピークを減らせる
- **WHEN** 最適化エンジンを実行する
- **THEN** 最適化後の解は初期解以上の評価値を持つ（辞書式比較で同等以上）

#### Scenario: 初期解がすでに最適な場合、初期解がそのまま返却される
- **GIVEN** グリーディアルゴリズムで生成された初期解がすでに局所最適である
- **WHEN** 最適化エンジンを実行する
- **THEN** 初期解がそのまま返却される

#### Scenario: 固定アサインは最適化で変更されない
- **GIVEN** `isLocked: true` のアサインが存在する
- **WHEN** 最適化エンジンを実行する
- **THEN** 固定アサインの日付・スタッフ・時間帯は変更されない

---

### Requirement: 評価基準1 — 不足人数のピーク最小化

システムは、全期間の全(日, 時間帯)ペアにおける不足人数（必要人数 - アサイン人数）の最大値を第1評価基準として使用しなければならない（SHALL）。不足人数が0以下の場合は0として扱う。この基準は最も優先度が高い。

#### Scenario: 不足ピークが低い解が優先される
- **GIVEN** 解Aの最大不足が2人、解Bの最大不足が1人
- **WHEN** 両解を評価基準1で比較する
- **THEN** 解Bが優先される（最大不足が小さい）

#### Scenario: 不足を分散する解が優先される
- **GIVEN** 解Aは1日に2人不足・他の日は不足0、解Bは2日にそれぞれ1人不足
- **WHEN** 両解を評価基準1で比較する
- **THEN** 解Bが優先される（最大不足が1 < 2）

---

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

### Requirement: 評価基準4 — スタッフ負担の公平性

システムは、各通常スタッフの残余容量（期間内の全週にわたる週上限出勤回数の合計 - 実出勤日数）の母分散（N で割る）を第4評価基準として使用しなければならない（SHALL）。この基準は評価基準1（shortfallPeak）・評価基準2（shortfallTotal）・評価基準3（helpStaffTotal）がすべて同値の場合にのみ比較に使用される。ヘルプスタッフはこの基準の計算対象から除外する（ヘルプスタッフには週上限が存在しないため）。

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

### Requirement: 評価基準5 — 駐車場ピーク利用数の最小化

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

---

### Requirement: 近傍操作による解の探索

システムは、以下の4種類の近傍操作を均等確率（各25%）でランダムに選択して適用し、解空間を探索しなければならない（SHALL）。各操作は適用前に強制制約を検証し、制約違反が発生する操作は棄却する。

1. **Toggle ON**: 休みのスタッフを出勤に変更する（全時間帯アサイン原則に従い、利用可能な全時間帯にアサインされる）
2. **Toggle OFF**: 出勤中のスタッフを休みに変更する（固定アサインのスタッフは対象外）
3. **Swap**: 同一日で出勤中のスタッフと休みのスタッフを入れ替える（両方について制約チェック）
4. **Move**: スタッフの出勤日を別の日に移動する（移動元のToggle OFFと移動先のToggle ONの複合操作）

**各操作で検証する強制制約一覧:**

| 制約 | Toggle ON | Toggle OFF | Swap | Move |
|------|-----------|------------|------|------|
| 希望休 | ○（対象日が希望休でない） | - | ○（休み→出勤側） | ○（移動先が希望休でない） |
| 週上限 | ○（対象週の出勤日数が上限未満） | - | ○（休み→出勤側） | ○（移動先の週で上限未満） |
| 固定アサイン | ○（対象が固定でない） | ○（対象が固定でない） | ○（両方が固定でない） | ○（対象が固定でない） |
| 駐車場上限 | ○（usesParking時、対象日の利用数が枠数未満） | - | ○（usesParking時） | ○（usesParking時、移動先の利用数が枠数未満） |
| ヘルプスタッフavailableDates | ○（ヘルプスタッフは対象日がavailableDatesに含まれる） | - | ○（休み→出勤側がヘルプスタッフの場合） | ○（移動先がavailableDatesに含まれる） |

#### Scenario: Toggle ONが制約を満たす場合に適用される
- **GIVEN** スタッフAが日付Xで休みであり、出勤させても強制制約を満たす
- **WHEN** Toggle ON操作が選択される
- **THEN** スタッフAが日付Xに出勤状態に変更され（利用可能な全時間帯にアサイン）、評価値が計算される

#### Scenario: Toggle OFFが適用される
- **GIVEN** スタッフAが日付Xで出勤中であり、固定アサイン（isLocked）でない
- **WHEN** Toggle OFF操作が選択される
- **THEN** スタッフAが日付Xで休み状態に変更され（全時間帯のアサインが解除）、評価値が計算される

#### Scenario: 固定アサインのスタッフへのToggle OFFは棄却される
- **GIVEN** スタッフAの日付Xのアサインが `isLocked: true` である
- **WHEN** スタッフAの日付XへのToggle OFF操作が選択される
- **THEN** 操作は棄却され、解は変更されない

#### Scenario: 週上限に達しているスタッフへのToggle ONは棄却される
- **GIVEN** スタッフAが日付Xの属する週で既に週上限に達している
- **WHEN** スタッフAの日付XへのToggle ON操作が選択される
- **THEN** 操作は棄却され、解は変更されない

#### Scenario: 駐車場上限に達している日へのToggle ONは棄却される
- **GIVEN** 日付Xの駐車場利用スタッフ数が駐車場枠の合計数に達している
- **AND** スタッフAは `usesParking: true` である
- **WHEN** スタッフAの日付XへのToggle ON操作が選択される
- **THEN** 操作は棄却され、解は変更されない

#### Scenario: Swap操作で公平性が改善される
- **GIVEN** 同一日で出勤中のスタッフA（残余容量0）と休みのスタッフB（残余容量3）がいる
- **AND** Swap後も両スタッフの強制制約が満たされる
- **WHEN** Swap操作が適用される
- **THEN** スタッフAが休み、スタッフBが出勤に変更される

#### Scenario: 希望休の日へのMove操作は棄却される
- **GIVEN** スタッフAの日付Yに希望休が登録されている
- **WHEN** スタッフAの出勤を日付Yに移動するMove操作が選択される
- **THEN** 操作は棄却され、解は変更されない

#### Scenario: ヘルプスタッフのToggle ONはavailableDatesに含まれる日のみ有効
- **GIVEN** ヘルプスタッフAの `availableDates` に日付Xが含まれていない
- **WHEN** ヘルプスタッフAの日付XへのToggle ON操作が選択される
- **THEN** 操作は棄却され、解は変更されない

---

### Requirement: 最適化の終了条件

システムは、以下のいずれかの条件を満たした場合に最適化を終了しなければならない（SHALL）。

1. 最大反復回数（20,000回）に到達した
2. 連続して改善なしの反復が一定回数（1,000回）に達した
3. 経過時間が上限（8秒）に達した

想定される最大規模（スタッフ10名・期間35日）で、最大反復回数20,000回は10秒以内に完了する見込みである。経過時間上限は安全策として設ける。

#### Scenario: 最大反復回数に到達して終了する
- **WHEN** 反復回数が20,000回に達する
- **THEN** その時点の最良解を返却して最適化を終了する

#### Scenario: 改善なしが続いて早期終了する
- **WHEN** 連続して1,000回の反復で評価値の改善がない
- **THEN** その時点の最良解を返却して最適化を終了する

#### Scenario: 経過時間上限に達して終了する
- **WHEN** 最適化の経過時間が8秒に達する
- **THEN** その時点の最良解を返却して最適化を終了する

---

### Requirement: Web Workerでの非同期実行

システムは、最適化処理をWeb Workerで実行し、メインスレッドをブロックしてはならない（SHALL NOT）。Web Workerはプログレス情報をメインスレッドに通知し、最適化完了時に結果を返却する。進捗率は `(現在の反復回数 / 最大反復回数) * 100` として計算する。早期終了の場合は、終了時に100%を通知する。

#### Scenario: 最適化中にUIがブロックされない
- **WHEN** 最適化処理が実行中である
- **THEN** UIスレッドは応答可能な状態を維持する

#### Scenario: 最適化完了時に結果が返却される
- **WHEN** Web Workerが最適化を完了する
- **THEN** 最適化された `ShiftAssignment[]` がメインスレッドに返却される

#### Scenario: プログレスが通知される
- **WHEN** 最適化処理が進行中である
- **THEN** 進捗率（`(現在の反復回数 / 最大反復回数) * 100`、0〜100%）がメインスレッドに定期的に通知される

#### Scenario: Web Workerでエラーが発生した場合はメインスレッドに通知される
- **WHEN** Web Worker内で予期しないエラーが発生する
- **THEN** メインスレッドにエラーが通知され、ローディング表示が解除され、初期解（グリーディ生成結果）がフォールバックとして使用される
