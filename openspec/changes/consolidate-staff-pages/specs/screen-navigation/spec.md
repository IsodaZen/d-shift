## MODIFIED Requirements

### Requirement: SettingsPageのタブがURLサブパスと連動する
システムは、SettingsPage内の各タブをURLサブパス（`/settings/:tab`）と連動させなければならない（SHALL）。タブパラメーターが未指定または定義されていない値の場合は `period` タブにフォールバックする。

| タブ | URL |
|---|---|
| シフト期間 | `/settings/period` |
| シフト枠 | `/settings/shift` |
| 駐車場 | `/settings/parking` |
| ヘルプスタッフ | `/settings/help-staff` |

> **変更点**: 「希望休」タブ（`/settings/dayoff`）を削除した。希望休管理は StaffPage の希望休タブに移動した。

#### Scenario: URLで指定したタブが開く
- **WHEN** ユーザーが `/settings/shift` にアクセスする
- **THEN** SettingsPageのシフト枠タブが選択された状態で表示される

#### Scenario: `/settings` にアクセスするとperiodタブが開く
- **WHEN** ユーザーが `/settings` にアクセスする（tabパラメーターなし）
- **THEN** シフト期間タブが選択された状態で表示される

#### Scenario: 不正なタブパラメーターが指定された場合はperiodタブが開く
- **WHEN** ユーザーが `/settings/invalid` など定義されていないタブパラメーターのURLにアクセスする
- **THEN** シフト期間タブが選択された状態でSettingsPageが表示される

#### Scenario: タブを切り替えるとURLが変わる
- **WHEN** ユーザーがシフト枠タブをタップする
- **THEN** URLが `/settings/shift` に更新される

---

## REMOVED Requirements

### Requirement: 設定ページ希望休タブ（`/settings/dayoff`）
**Reason**: 希望休管理をスタッフページに統合したため、設定ページの希望休タブは廃止する。
**Migration**: 希望休管理は StaffPage（`/`）の「希望休」タブで行う。`/settings/dayoff` へのアクセスは `period` タブにフォールバックされる。既存のブックマークや共有リンクで `/settings/dayoff` にアクセスした場合は `/settings/period` が表示されるため、希望休管理は `/`（スタッフページ）から操作すること。

---

## ADDED Requirements

### Requirement: StaffPageがタブUIを持つ
システムは、StaffPage（`/`）において「スタッフ一覧」と「希望休」の2つのタブをページ内状態（URLサブパス連動なし）で切り替えられなければならない（SHALL）。初期表示は「スタッフ一覧」タブとする。

> **注記**: タブ状態はURLに反映されないため、「希望休」タブ表示中にリロードした場合は「スタッフ一覧」タブが初期表示される（タブ状態の復元は行わない）。これは意図的な設計である。
> **注記**: 希望休管理UI（カレンダーモード・フォールバックUI）の詳細は `preferred-day-off` 仕様を参照。

#### Scenario: StaffPage初期表示でスタッフ一覧タブが選択されている
- **WHEN** ユーザーが `/` にアクセスする
- **THEN** 「スタッフ一覧」タブがアクティブ状態で表示される

#### Scenario: 希望休タブをタップすると希望休管理UIが表示される
- **WHEN** ユーザーがStaffPageの「希望休」タブをタップする
- **THEN** 希望休管理UI（`preferred-day-off` 仕様に定義されたカレンダーモードまたはフォールバックUI）が表示される

#### Scenario: スタッフ一覧タブをタップするとスタッフ一覧が表示される
- **WHEN** ユーザーがStaffPageの「スタッフ一覧」タブをタップする
- **THEN** スタッフ一覧UIが表示される

#### Scenario: 希望休タブ表示中にリロードするとスタッフ一覧タブが表示される
- **GIVEN** ユーザーが StaffPage の「希望休」タブを表示している
- **WHEN** ユーザーがページをリロードする
- **THEN** 「スタッフ一覧」タブがアクティブ状態で表示される

---

## MODIFIED Requirements

### Requirement: フロー誘導CTAが適切な条件で表示される
システムは、ユーザーが正しい操作フロー（スタッフ登録 → シフト期間設定 → シフト枠設定 → シフト確認）を自然に進められるよう、各ページに次のステップへのCTAボタンを表示しなければならない（SHALL）。希望休タブ・駐車場タブへのCTAは本変更の対象外とし表示しない。

| 表示場所 | 表示条件 | CTAラベル | 遷移先 |
|---|---|---|---|
| StaffPage「スタッフ一覧」タブのリスト末尾 | スタッフが1件以上登録されている | 「シフト期間を設定する →」 | `/settings/period` |
| SettingsPage 期間タブ末尾 | LocalStorageにシフト作成期間が明示的に保存されている（デフォルト値適用中は表示しない） | 「シフト枠を設定する →」 | `/settings/shift` |
| SettingsPage 枠タブ末尾 | 常時表示 | 「シフトを作成する →」 | `/shift` |

> **変更点**: StaffPage の CTA 表示場所を「リスト末尾」から「『スタッフ一覧』タブのリスト末尾」に変更した。タブUIの導入に伴い、CTAは「希望休」タブには表示しない。

#### Scenario: スタッフが1件以上いる場合にStaffPageのスタッフ一覧タブにCTAが表示される
- **GIVEN** スタッフが1件以上登録されている
- **WHEN** ユーザーが StaffPage の「スタッフ一覧」タブを表示する
- **THEN** 「シフト期間を設定する →」ボタンがスタッフ一覧の末尾に表示される

#### Scenario: スタッフが0件の場合にStaffPageのCTAが非表示になる
- **WHEN** スタッフが1件も登録されていない状態でStaffPageを表示する
- **THEN** 「シフト期間を設定する →」ボタンは表示されない

#### Scenario: 希望休タブではフロー誘導CTAが表示されない
- **GIVEN** スタッフが1件以上登録されている
- **WHEN** ユーザーが StaffPage の「希望休」タブを表示する
- **THEN** 「シフト期間を設定する →」ボタンは表示されない

#### Scenario: シフト期間がLocalStorageに明示的に保存されている場合に期間タブにCTAが表示される
- **WHEN** ユーザーがシフト期間を入力して保存した後、SettingsPageの期間タブを表示する
- **THEN** 「シフト枠を設定する →」ボタンが表示される

#### Scenario: シフト期間がデフォルト値のみの場合に期間タブのCTAが非表示になる
- **WHEN** LocalStorageにシフト作成期間が保存されていない（デフォルト値適用中）状態でSettingsPageの期間タブを表示する
- **THEN** 「シフト枠を設定する →」ボタンは表示されない

#### Scenario: シフト枠タブには常にCTAが表示される
- **WHEN** SettingsPageのシフト枠タブを表示する
- **THEN** 「シフトを作成する →」ボタンが常に表示される

#### Scenario: CTAボタンをタップすると次のページに遷移する
- **WHEN** ユーザーが「シフト期間を設定する →」ボタンをタップする
- **THEN** `/settings/period` に遷移する
