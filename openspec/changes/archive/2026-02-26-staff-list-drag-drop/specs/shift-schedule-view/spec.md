# shift-schedule-view Specification — 差分仕様

> **このファイルは差分仕様（デルタ）です。** `staff-list-drag-drop` 変更に対応する追加要件のみを記述します。
> ベースとなる仕様は `openspec/specs/shift-schedule-view/spec.md` を参照してください。

---

## MODIFIED Requirements

### Requirement: シフト表を週単位で表示できる（変更）

既存要件に以下のシナリオを追加する。

#### Scenario: シフト表のスタッフ行順序がスタッフ一覧の並び順と一致する

- **GIVEN** スタッフ一覧で並び替えが行われ、その順序が LocalStorage に保存されている
- **WHEN** ユーザーがシフト表画面を開く
- **THEN** シフト表の通常スタッフ行が、スタッフ管理画面の一覧と同じ順序で表示される

#### Scenario: スタッフ一覧を並び替えるとシフト表の行順序も変わる

- **GIVEN** スタッフA、スタッフB、スタッフCがこの順序で登録されており、シフト表が表示されている
- **WHEN** スタッフ管理画面でスタッフBを先頭に移動させる
- **THEN** シフト表を再表示すると、スタッフB、スタッフA、スタッフCの順序で行が表示される
