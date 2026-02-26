## MODIFIED Requirements

### Requirement: スタッフを日付・時間帯に手動でアサインできる
システムは、ユーザーがスタッフを特定の日付・時間帯に手動でアサイン（割り当て）できなければならない（SHALL）。アサインはLocalStorageに永続化される。手動で登録されたアサインは `isLocked: true` として保存され、自動生成による上書きから保護される。

#### Scenario: スタッフをシフトにアサインできる
- **WHEN** ユーザーがシフト表のセル（スタッフ×日付）から時間帯を選択してアサインする
- **THEN** `isLocked: true` のアサインがLocalStorageに保存され、シフト表に反映される

#### Scenario: アサインを解除できる
- **WHEN** ユーザーが既存のアサインを解除する操作を行う
- **THEN** そのアサインがLocalStorageから削除され、シフト表からも消える

#### Scenario: 固定アサインも手動で削除できる
- **WHEN** ユーザーが `isLocked: true` のアサインを解除する操作を行う
- **THEN** そのアサインはLocalStorageから削除される。同日の他の `isLocked: true` のアサインが残っていなければ、その日の固定状態も解除される（次回の自動生成の対象となる）

---

## ADDED Requirements

### Requirement: 旧データの isLocked フィールド不在を後方互換で処理する
システムは、`isLocked` フィールドが存在しない既存の `ShiftAssignment` データをLocalStorageから読み込んだ場合、`isLocked: false` として扱わなければならない（SHALL）。

#### Scenario: isLocked フィールドなしの旧データが正常に読み込まれる
- **WHEN** `isLocked` フィールドを持たない既存の ShiftAssignment データがLocalStorageに存在する状態でアプリを起動する
- **THEN** 旧データは `isLocked: false` として扱われ、アサインが正常に表示される

---

### Requirement: セル単位で固定/非固定を切り替えられる
システムは、特定のスタッフ × 日付（セル）に属する全アサインの `isLocked` を一括で更新できなければならない（SHALL）。

#### Scenario: 非固定アサインがあるセルを固定化できる
- **GIVEN** あるスタッフの特定の日に `isLocked: false` のアサインが1件以上存在する
- **WHEN** そのセルの固定トグルを「固定」にする操作を行う
- **THEN** そのセルに属する全アサインが `isLocked: true` に更新され、LocalStorageに保存される

#### Scenario: 全固定のセルを固定解除できる
- **GIVEN** あるスタッフの特定の日の全アサインが `isLocked: true` である
- **WHEN** そのセルの固定トグルを「解除」にする操作を行う
- **THEN** そのセルに属する全アサインが `isLocked: false` に更新され、LocalStorageに保存される

#### Scenario: 混在セル（固定+非固定）を固定化できる
- **GIVEN** あるスタッフの特定の日に `isLocked: true` と `isLocked: false` のアサインが混在している
- **WHEN** そのセルの固定トグルを「固定」にする操作を行う
- **THEN** そのセルに属する全アサインが `isLocked: true` に更新される

---

### Requirement: 固定アサインは自動生成による一括上書きから保護される
システムは、`bulkSetAssignments` 実行時にシフト作成期間内の `isLocked: true` のアサインを削除してはならない（SHALL NOT）。

#### Scenario: 固定アサインが一括上書きで保持される
- **GIVEN** シフト作成期間内に `isLocked: true` のアサインが存在する
- **WHEN** `bulkSetAssignments` で新しいアサインを一括保存する
- **THEN** `isLocked: true` のアサインはそのまま保持され、`isLocked: false` のアサインのみ置き換えられる

#### Scenario: 固定でないアサインは一括上書きで置き換えられる
- **GIVEN** シフト作成期間内に `isLocked: false` のアサインが存在する
- **WHEN** `bulkSetAssignments` で新しいアサインを一括保存する
- **THEN** `isLocked: false` の既存アサインは削除され、新しいアサインに置き換えられる
