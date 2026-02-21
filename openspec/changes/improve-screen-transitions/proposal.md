## Why

現在のアプリはボトムナビゲーション（3タブ：シフト表 / スタッフ / 設定）でページを切り替える構造になっており、以下の課題がある。

1. **操作フローが不明瞭**: 初めて使うユーザーは「スタッフ登録 → シフト期間設定 → シフト枠設定 → 自動生成 → 手動修正」という正しい手順を自力で発見しなければならない。タブ構成はこのフローを表現しない。
2. **設定ページの肥大化**: SettingsPage が「シフト期間・シフト枠・希望休・駐車場」の4タブを内包し、コンポーネントが単一ファイルに集中して複雑化している。
3. **URL管理がない**: タブ切り替えはURLに反映されないため、ブックマーク・ブラウザバック・リロード後に意図したページへ戻れない。

React Router を導入してURLベースの画面遷移（SPA）に切り替え、ボトムタブを廃止する。各ページにフロー誘導のナビゲーションを加えることで、ユーザーが迷わず操作できる体験を提供する。

## What Changes

### React Router の導入（SPA化）

- `react-router-dom` を依存関係に追加する
- GitHub Pages（静的ホスティング）で動作するよう `HashRouter` を採用する
  - `vite.config.ts` の `base: '/d-shift/'` により本番URLは `https://<owner>.github.io/d-shift/` になる
  - `BrowserRouter` を使う場合、GitHub Pagesはサブパス（例: `/d-shift/shift`）のリクエストに対して404を返す。`HashRouter` ではハッシュ以降はサーバーに送られないため、この問題が発生しない
  - アプリ内リンク・`useNavigate` はハッシュパス（`/`, `/shift` など）を使用し、Viteの `base` パスは意識しなくてよい
- 既存の3つのページ（シフト表・スタッフ・設定）をURLルートとして定義する

### ルート構成

| URL（ハッシュ） | ページ | 役割 |
|---|---|---|
| `#/` | StaffPage | スタッフ登録（初回フローの起点） |
| `#/settings` | SettingsPage | シフト期間・シフト枠・希望休・駐車場設定 |
| `#/settings/period` | SettingsPage（期間タブ選択） | シフト期間設定 |
| `#/settings/shift` | SettingsPage（枠タブ選択） | シフト枠設定 |
| `#/settings/dayoff` | SettingsPage（希望休タブ選択） | 希望休設定 |
| `#/settings/parking` | SettingsPage（駐車場タブ選択） | 駐車場設定 |
| `#/shift` | ShiftPage | シフト表・自動生成・手動編集 |

### ボトムタブナビゲーションの廃止

- `App.tsx` のボトムナビゲーション（`<nav>`）を削除する
- タブ状態管理（`useState<Tab>`）を削除する
- 代わりにトップヘッダーに現在ページのタイトルと戻るボタンを設ける

### ヘッダーの統合

- 全ページ共通の `AppHeader` コンポーネントを新設する
- `AppHeader` は以下を含む:
  - アプリ名「D-Shift」
  - 現在ページのタイトル
  - 戻るナビゲーション（ルートに応じて表示）

### フロー誘導ナビゲーション

各ページの末尾・完了後に次のステップへ誘導するCTAを追加する:

- **StaffPage**: スタッフが1件以上登録されている場合「→ シフト期間を設定する」ボタンを表示
- **SettingsPage（シフト期間タブ）**: 期間が保存された後「→ シフト枠を設定する」ボタンを表示
- **SettingsPage（シフト枠タブ）**: 「→ 自動生成でシフトを作成する」ボタンを表示
- **ShiftPage**: 変更なし（自動生成・手動編集はすでに完結している）

### SettingsPage のURL連動

- 設定ページの内部タブ（期間 / 枠 / 希望休 / 駐車場）をURLのサブパスと連動させる
- URLを直接入力・共有したときに対応するタブが開く

## Capabilities

### New Capabilities

- `screen-navigation`: React Router（HashRouter）によるURLベースのページ遷移。全ページ共通のヘッダー（AppHeader）を提供する。フロー誘導CTAにより「スタッフ登録 → シフト設定 → 自動アサイン → シフト確認・手動編集」の操作フローをユーザーに示す

### Modified Capabilities

- `staff-management`: ボトムタブによるページ切り替えをRoute遷移に変更。フロー誘導CTAを追加
- `shift-period-config`: URLサブパス（`#/settings/period`）と連動するタブ選択に変更。フロー誘導CTAを追加
- `shift-slot-config`: URLサブパス（`#/settings/shift`）と連動するタブ選択に変更。フロー誘導CTAを追加
- `preferred-day-off`: URLサブパス（`#/settings/dayoff`）と連動するタブ選択に変更
- `shift-schedule-view`: ボトムタブによるページ切り替えをRoute遷移に変更

## Impact

### 依存関係の追加
- `react-router-dom`（v7系）を `dependencies` に追加

### 変更ファイル（既存）
| ファイル | 変更内容 |
|---|---|
| `package.json` / `bun.lockb` | `react-router-dom` 追加 |
| `src/main.tsx` | `HashRouter` でアプリをラップ |
| `src/App.tsx` | ボトムナビゲーション・タブ制御を削除し、`<Routes>` を使ったルーティングに置き換え |
| `src/pages/StaffPage.tsx` | フロー誘導CTA追加 |
| `src/pages/SettingsPage.tsx` | URLサブパス連動タブ・フロー誘導CTA追加 |
| `src/pages/ShiftPage.tsx` | 変更なし（構造はそのまま） |

### 新規ファイル
| ファイル | 内容 |
|---|---|
| `src/components/AppHeader.tsx` | 全ページ共通ヘッダー（タイトル・戻るボタン） |
