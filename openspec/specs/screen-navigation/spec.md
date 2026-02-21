## Purpose
React Router（BrowserRouter）を導入してURLベースのSPAページ遷移を実現する。ボトムタブナビゲーションを廃止し、AppHeaderのアイコンナビとフロー誘導CTAによりユーザーの操作フロー（スタッフ登録 → シフト期間設定 → シフト枠設定 → シフト確認）を明確化する。

---

## ADDED Requirements

### Requirement: URLベースのページ遷移ができる
システムは、React Router（**BrowserRouter**、HashRouterは採用しない）を使用して、URLに基づいたページ遷移を提供しなければならない（SHALL）。`basename` には `import.meta.env.BASE_URL` を使用する。ルート構成は以下の通り。

| URL | ページ | 備考 |
|---|---|---|
| `/` | StaffPage（スタッフ登録） | 初回フローの起点 |
| `/settings` | SettingsPage | `/settings/period` 相当。タブ詳細は「Requirement: SettingsPageのタブがURLサブパスと連動する」参照 |
| `/settings/:tab` | SettingsPage（:tabで指定したタブ） | タブ詳細は「Requirement: SettingsPageのタブがURLサブパスと連動する」参照 |
| `/shift` | ShiftPage（シフト表） | |

定義されていないURLにアクセスした場合はルート（`/`）にリダイレクトする。

#### Scenario: スタッフページ（ルート）にアクセスできる
- **WHEN** ユーザーが `/` にアクセスする
- **THEN** スタッフ登録ページが表示される

#### Scenario: 設定ページにアクセスできる
- **WHEN** ユーザーが `/settings` にアクセスする
- **THEN** 設定ページが表示される

#### Scenario: シフト表ページにアクセスできる
- **WHEN** ユーザーが `/shift` にアクセスする
- **THEN** シフト表ページが表示される

#### Scenario: 定義されていないURLにアクセスした場合はスタッフページにリダイレクトされる
- **WHEN** ユーザーが `/foo` など定義されていないURLにアクセスする
- **THEN** `/`（StaffPage）にリダイレクトされる

---

### Requirement: 直接URLアクセスおよびリロード後も正しいページが表示される（本番ビルドのみ）
システムは、GitHub PagesのサブパスへのリクエストをspaFallbackプラグインが生成する `404.html` によって処理し、リロード後も正しいページを復元しなければならない（SHALL）。本要件はGitHub Pagesへのデプロイ時（本番ビルド）に適用される。開発環境（`bun run dev`）ではViteのSPAフォールバックが自動で動作するため `404.html` は不要。

`404.html` が使用するsessionStorageのキー名は `spa-redirect` とする。`main.tsx` 起動時にこのキーを読み取り、`history.replaceState()` でURLを復元後、直ちにキーを削除する。

#### Scenario: サブパスへの直接アクセス後に正しいページが表示される
- **WHEN** ユーザーが `/shift` のURLを直接ブラウザに入力してアクセスする（本番ビルド）
- **THEN** `404.html` が `sessionStorage['spa-redirect']` にパスを保存してルートへリダイレクトし、アプリ起動時にURLを復元してシフト表ページが表示される

#### Scenario: ページをリロードしても同じページが表示される
- **WHEN** ユーザーが `/settings/shift` を表示している状態でページをリロードする（本番ビルド）
- **THEN** リロード後もシフト枠設定タブが選択された設定ページが表示される

---

### Requirement: 全ページ共通のAppHeaderが表示される
システムは、すべてのページにAppHeaderを表示しなければならない（SHALL）。AppHeaderは以下の要素を含む：
- アプリ名「D-Shift」（左端）
- 現在ページのタイトル（中央）
- アイコンナビゲーション（右端）：スタッフ・設定・シフト表の3アイコン

各ページで表示されるAppHeaderのタイトル文字列は以下の通り：

| URL | ヘッダータイトル |
|---|---|
| `/` | スタッフ |
| `/settings`、`/settings/:tab` | 設定 |
| `/shift` | シフト表 |

アイコンナビゲーションの各アイコンにはスクリーンリーダー向けに `aria-label` を設定する（スタッフ、設定、シフト表）。

#### Scenario: AppHeaderにアイコンナビゲーションが表示される
- **WHEN** ユーザーがアプリの任意のページを表示する
- **THEN** ヘッダー右端にスタッフ・設定・シフト表の3つのアイコンが表示される

#### Scenario: 現在ページのアイコンがアクティブ表示される
- **WHEN** ユーザーが `/shift` を表示している
- **THEN** シフト表アイコンがアクティブカラー（indigo）で強調表示され、他のアイコンは非アクティブで表示される

#### Scenario: アイコンをタップすると対応するページに遷移する
- **WHEN** ユーザーがヘッダーの設定アイコンをタップする
- **THEN** `/settings` に遷移して設定ページが表示される

---

### Requirement: SettingsPageのタブがURLサブパスと連動する
システムは、SettingsPage内の各タブをURLサブパス（`/settings/:tab`）と連動させなければならない（SHALL）。タブパラメーターが未指定または定義されていない値の場合は `period` タブにフォールバックする。

| タブ | URL |
|---|---|
| シフト期間 | `/settings/period` |
| シフト枠 | `/settings/shift` |
| 希望休 | `/settings/dayoff` |
| 駐車場 | `/settings/parking` |

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

### Requirement: フロー誘導CTAが適切な条件で表示される
システムは、ユーザーが正しい操作フロー（スタッフ登録 → シフト期間設定 → シフト枠設定 → シフト確認）を自然に進められるよう、各ページに次のステップへのCTAボタンを表示しなければならない（SHALL）。希望休タブ・駐車場タブへのCTAは本変更の対象外とし表示しない。

| 表示場所 | 表示条件 | CTAラベル | 遷移先 |
|---|---|---|---|
| StaffPage リスト末尾 | スタッフが1件以上登録されている | 「シフト期間を設定する →」 | `/settings/period` |
| SettingsPage 期間タブ末尾 | LocalStorageにシフト作成期間が明示的に保存されている（デフォルト値適用中は表示しない） | 「シフト枠を設定する →」 | `/settings/shift` |
| SettingsPage 枠タブ末尾 | 常時表示 | 「シフトを作成する →」 | `/shift` |

#### Scenario: スタッフが1件以上いる場合にStaffPageにCTAが表示される
- **WHEN** スタッフが1件以上登録されている状態でStaffPageを表示する
- **THEN** 「シフト期間を設定する →」ボタンがスタッフ一覧の末尾に表示される

#### Scenario: スタッフが0件の場合にStaffPageのCTAが非表示になる
- **WHEN** スタッフが1件も登録されていない状態でStaffPageを表示する
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
