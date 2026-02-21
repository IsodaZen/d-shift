## タスクリスト

### Phase 1: 依存関係追加

- [ ] `react-router-dom`（v7系）を `dependencies` に追加する
  - `bun add react-router-dom` を実行する
  - `package.json` に `react-router-dom` が追加されていることを確認する

---

### Phase 2: spaFallback Vite プラグイン

- [ ] `vite.config.ts` に `spaFallback()` カスタムプラグインを追加する
  - ビルド時に `dist/404.html` が自動生成されることを確認する（`bun run build` 後に `ls dist/404.html` で検証）
  - `404.html` 内スクリプトのロジック: `location.pathname` からベースパス以降を抽出 → `sessionStorage['spa-redirect']` に保存 → ベースURLへリダイレクト

---

### Phase 3: main.tsx — BrowserRouter + sessionStorage パス復元

- [ ] `src/main.tsx` を更新する
  - `BrowserRouter` を `react-router-dom` からインポートし、`basename={import.meta.env.BASE_URL}` で `<App>` をラップする
  - 起動時に `sessionStorage['spa-redirect']` を読み取り、存在すれば `history.replaceState()` でURLを復元し、直ちにキーを削除する処理を追加する

---

### Phase 4: AppHeader コンポーネント（TDD）

- [ ] `src/components/AppHeader.test.tsx` を作成する（Red）
  - テスト環境では `MemoryRouter` でラップしてレンダリングする
  - 「現在のページタイトルが表示される」: `/` では「スタッフ」、`/settings` では「設定」、`/shift` では「シフト表」が表示されること
  - 「3つのアイコンナビゲーションが表示される」: スタッフ・設定・シフト表のアイコンがそれぞれ `aria-label` 付きで表示されること
  - 「現在ページのアイコンがアクティブ表示される」: `/shift` では シフト表アイコンが indigo クラスを持ち、他の2つは非アクティブであること
  - 「アイコンクリックで対応するパスに遷移する」: 設定アイコンをクリックすると `/settings` に遷移すること

- [ ] `src/components/AppHeader.tsx` を実装する（Green）
  - Props: `title: string`（ページタイトル）を受け取る
  - `useLocation()` で現在のパスを取得してアクティブアイコンを判定する
  - `useNavigate()` でアイコンクリック時に対応するパスに遷移する
  - アイコンナビの各ボタンに `aria-label` を設定する（「スタッフ」「設定」「シフト表」）
  - アクティブアイコンは `text-indigo-600`、非アクティブは `text-gray-400` で表示する

---

### Phase 5: App.tsx — ルーティング置き換え（TDD）

- [ ] `src/App.test.tsx` を新規作成する（Red）
  - `MemoryRouter` で初期パスを指定してレンダリングし、正しいページが表示されることを検証する
  - `/` → StaffPage のコンテンツが表示されること（例：「スタッフ管理」見出し）
  - `/settings` → SettingsPage のコンテンツが表示されること（例：「シフト期間」タブ）
  - `/shift` → ShiftPage のコンテンツが表示されること（例：「シフト表」見出し）
  - 未定義パス（`/foo`）→ StaffPage にフォールバックすること

- [ ] `src/App.tsx` を更新する（Green）
  - `useState<Tab>` によるタブ管理を削除する
  - ボトムナビゲーション `<nav>` を削除する
  - `<Routes>` / `<Route>` を使ったルーティングに置き換える
    - `path="/"` → `<StaffPage />`
    - `path="/settings"` → `<SettingsPage />`
    - `path="/settings/:tab"` → `<SettingsPage />`
    - `path="/shift"` → `<ShiftPage />`
    - `path="*"` → `<Navigate to="/" replace />`
  - `<AppHeader>` を各ルートに対応するタイトルとともにレンダリングする
    - `/` → title="スタッフ"
    - `/settings*` → title="設定"
    - `/shift` → title="シフト表"
  - `<main>` の `pb-20`（ボトムナビ分の余白）を削除する

---

### Phase 6: SettingsPage — URLタブ連動 + フロー誘導 CTA（TDD）

- [ ] `src/pages/SettingsPage.test.tsx` にURLタブ連動テストを追加する（Red）
  - `MemoryRouter initialEntries={['/settings/shift']}` でレンダリングし、シフト枠タブがアクティブであることを検証する
  - `MemoryRouter initialEntries={['/settings/invalid']}` でレンダリングし、シフト期間タブにフォールバックすることを検証する
  - タブボタンをクリックすると `navigate('/settings/<tab>')` が呼ばれることを検証する（`useNavigate` をモック）

- [ ] `src/pages/SettingsPage.test.tsx` にフロー誘導 CTA テストを追加する（Red）
  - シフト期間が LocalStorage に保存されている場合、期間タブに「シフト枠を設定する →」ボタンが表示されること
  - シフト期間が LocalStorage に保存されていない場合（デフォルト値のみ）、期間タブにCTAが表示されないこと
  - シフト枠タブに常に「シフトを作成する →」ボタンが表示されること
  - 「シフトを作成する →」ボタンをクリックすると `/shift` に遷移すること

- [ ] `src/pages/SettingsPage.tsx` を更新する（Green）
  - `useState<Tab>` によるタブ管理を削除し、`useParams<{ tab?: string }>()` でタブを取得する
  - タブ切り替え時に `useNavigate('/settings/<tab>')` を呼び出す
  - 不正なタブパラメーターは `'period'` にフォールバックする
  - 期間タブ末尾に CTA ボタンを追加する（表示条件: LocalStorage に `d-shift:shift-period` キーが存在する）
  - シフト枠タブ末尾に CTA ボタンを追加する（常時表示）
  - 既存テストが引き続きパスするよう `MemoryRouter` でのレンダリングに対応する

---

### Phase 7: StaffPage — フロー誘導 CTA（TDD）

- [ ] `src/pages/StaffPage.test.tsx` を新規作成する（Red）
  - `MemoryRouter` でラップしてレンダリングする
  - スタッフが0件の場合、「シフト期間を設定する →」ボタンが表示されないこと
  - スタッフが1件以上の場合、「シフト期間を設定する →」ボタンが表示されること
  - 「シフト期間を設定する →」ボタンをクリックすると `/settings/period` に遷移すること

- [ ] `src/pages/StaffPage.tsx` を更新する（Green）
  - `useStaff()` からスタッフ一覧を取得し、件数が1件以上の場合に CTA ボタンを表示する
  - `useNavigate()` を使って `/settings/period` に遷移する

---

### Phase 8: 既存テストの MemoryRouter 対応

- [ ] `src/pages/SettingsPage.test.tsx` の既存テストを `MemoryRouter` でラップする
  - `useParams` / `useNavigate` 導入後にルーターコンテキストが必要になるため
  - 既存のすべてのテストが引き続きパスすることを確認する（`bun run test`）

- [ ] `src/pages/ShiftPage.test.tsx` の既存テストを `MemoryRouter` でラップする（必要な場合のみ）
  - ShiftPage に `useNavigate` 等を追加した場合のみ対応する

---

### Phase 9: ビルド確認

- [ ] `bun run test` を実行し、全テストがパスすることを確認する
- [ ] `bun run build` を実行し、エラーなくビルドが完了することを確認する
- [ ] ビルド後に `dist/404.html` が生成されていることを確認する（`ls dist/404.html`）
