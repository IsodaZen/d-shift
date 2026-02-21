## 技術設計

### 全体方針

既存のカスタムフック群・ページコンポーネントの内部ロジックは変更しない。
変更範囲はルーティング基盤（`main.tsx`, `App.tsx`, `vite.config.ts`）と各ページへのナビゲーション追加に限定する。

---

## Decisions

### D1: Router選択 — BrowserRouter + `import.meta.env.BASE_URL`

**選択**: `BrowserRouter` に `basename={import.meta.env.BASE_URL}` を渡す。

- **理由**:
  - `import.meta.env.BASE_URL` は `vite.config.ts` の `base` 値を自動参照するため、ハードコード不要
  - `HashRouter` と比較してURLが `#` を含まずクリーンで、将来的な変更コストが低い
- **検討した代替案**:
  - `HashRouter`: GitHub Pages対応が簡単だが、URL に `#` が入り見た目が悪い。OGPなどメタデータとの相性も悪い
  - `createBrowserRouter` (Data Router API): v7の推奨APIだが、今回の変更範囲（既存フックの維持）では恩恵が少なく移行コストが高い

---

### D2: GitHub Pages 404対応 — spaFallback Viteプラグイン

**選択**: `vite.config.ts` にカスタムプラグイン `spaFallback()` を追加し、ビルド時に `404.html` を自動生成する。

**動作フロー**:
1. ユーザーが `/d-shift/shift` に直接アクセスまたはリロード
2. GitHub Pages はファイルが存在しないため `404.html` を返す
3. `404.html` 内スクリプトが `location.pathname` からベースパス以降を抽出し `sessionStorage('spa-redirect')` に保存
4. ベースURL（`/d-shift/`）へリダイレクト → `index.html` が返される
5. `src/main.tsx` の起動時に `sessionStorage('spa-redirect')` を読み取り `history.replaceState()` でURLを復元
6. React Router が復元されたパスでルートをマッチングして正しいページを表示

**プラグイン実装方針**（`vite.config.ts`）:

```ts
function spaFallback(): Plugin {
  let base: string
  return {
    name: 'spa-fallback-404',
    configResolved(config) { base = config.base },
    generateBundle() {
      this.emitFile({
        type: 'asset',
        fileName: '404.html',
        source: `<script>
  var b = ${JSON.stringify(base)};
  var p = location.pathname.slice(b.length);
  sessionStorage.setItem('spa-redirect', p + location.search);
  location.replace(b);
</script>`,
      })
    },
  }
}
```

- **理由**:
  - ビルド成果物として `404.html` が自動生成されるため手動管理不要
  - ベースパスをプラグイン内で `config.base` から読み取るため `vite.config.ts` の `base` 変更に追従できる
- **検討した代替案**:
  - `public/404.html` を手動配置: 動作するが `base` 変更時に手動修正が必要でハードコードになる
  - `HashRouter`: そもそも404問題が発生しないが URLが汚くなる（D1参照）

---

### D3: SettingsPage のURL連動方式 — `/settings/:tab` ルート

**選択**: `SettingsPage` を `/settings/:tab` 単一ルートで受け取り、`useParams()` でタブを切り替える。

**ルート定義**（`App.tsx`）:

```tsx
<Route path="/settings" element={<SettingsPage />} />
<Route path="/settings/:tab" element={<SettingsPage />} />
```

`SettingsPage` 内:

```tsx
const { tab } = useParams<{ tab?: string }>()
const activeTab = (['period','shift','dayoff','parking'] as const)
  .includes(tab as Tab) ? (tab as Tab) : 'period'
```

- **理由**:
  - `SettingsPage` のタブ内部実装（JSX・スタイル）をほぼ変えずに済む
  - `useNavigate('/settings/shift')` でタブ切り替えとURL更新が同時に完結する
  - タブ未指定（`/settings`）は `'period'` タブにフォールバックする
- **検討した代替案**:
  - ネストルート + `<Outlet>`: タブ内コンテンツを別ファイルに分割する必要があり変更範囲が広がる
  - `useSearchParams`（`/settings?tab=period`）: URLは機能するがパス形式と比べて直感的でない

---

### D4: グローバルナビゲーション — AppHeader にアイコンナビを統合

**課題**: ボトムタブ廃止後、前のステップ（例：ShiftPage → StaffPage）への自由な遷移手段が失われる。

**選択**: `AppHeader` の右端に3ページ分のアイコンナビ（`👤 ⚙️ 📅`）を小さく配置する。

```
┌─────────────────────────────────┐
│ ← D-Shift   スタッフ  │👤 ⚙️ 📅│
└─────────────────────────────────┘
```

- 現在のページのアイコンはアクティブカラー（indigo）で強調
- タップ領域を確保するため各アイコンのパディングは `p-2` 以上とする

- **理由**:
  - フロー誘導CTAだけでは「前の設定に戻りたい」ニーズを満たせない
  - ボトムタブほど目立たない配置でありながら、任意のページへ1タップでアクセスできる
- **検討した代替案**:
  - ハンバーガーメニュー: タップ数が増えて操作性が低下する
  - ボトムタブを残す（簡略化）: ユーザーの指示（タブ表示撤廃）に反する
  - CTAのみ・戻るボタンのみ: 新規利用時のフローには適するが既存ユーザーの自由遷移が不便

---

### D5: AppHeader の設計

**Props インターフェース**:

```ts
interface AppHeaderProps {
  title: string         // 現在ページのタイトル
  showBack?: boolean    // 戻るボタン表示（デフォルト: false）
  backTo?: string       // 戻り先パス（未指定時は navigate(-1)）
}
```

**レイアウト**:

```
左: [← 戻る] または [D-Shift]
中: ページタイトル（現在ページ）
右: アイコンナビ 👤 ⚙️ 📅
```

**表示パターン**:

| ページ | 左エリア | タイトル | 右エリア |
|---|---|---|---|
| `/` | 「D-Shift」ロゴ | スタッフ | 👤▪ ⚙️ 📅 |
| `/settings` / `/settings/:tab` | 「D-Shift」ロゴ | 設定 | 👤 ⚙️▪ 📅 |
| `/shift` | 「D-Shift」ロゴ | シフト表 | 👤 ⚙️ 📅▪ |

- ▪ = アクティブ（indigo色）
- `/settings/:tab` のサブパス遷移はページ内タブ切り替えであり、ヘッダーの「戻る」ボタンは表示しない
- `showBack` は将来的に詳細画面などを追加した際に使用する拡張ポイント

---

### D6: フロー誘導CTAの配置

| 場所 | 表示条件 | CTAラベル | 遷移先 |
|---|---|---|---|
| `StaffPage` リスト末尾 | `staff.length > 0` | 「シフト期間を設定する →」 | `/settings/period` |
| `SettingsPage` 期間タブ末尾 | `shiftPeriod !== null` | 「シフト枠を設定する →」 | `/settings/shift` |
| `SettingsPage` 枠タブ末尾 | 常時 | 「シフトを作成する →」 | `/shift` |

- デザイン: 幅フル・indigo塗りのボタン（既存の保存ボタンと同スタイル）
- `StaffPage` の空状態（スタッフ0件）にはCTAを表示しない

---

## 依存関係と影響範囲

### 変更ファイル（既存）

| ファイル | 変更内容 |
|---|---|
| `vite.config.ts` | `spaFallback()` プラグインを追加 |
| `src/main.tsx` | `BrowserRouter` ラップ + sessionStorage パス復元 |
| `src/App.tsx` | ボトムナビ削除・`<Routes>` ルーティングに置き換え・`AppHeader` を各ページに渡す |
| `src/pages/StaffPage.tsx` | `useNavigate` によるCTA追加 |
| `src/pages/SettingsPage.tsx` | `useParams` によるタブ連動・`useNavigate` によるCTA追加 |

### 新規ファイル

| ファイル | 内容 |
|---|---|
| `src/components/AppHeader.tsx` | Props: `title`, `showBack?`, `backTo?` + アイコンナビ |

### 既存機能への影響

- 各ページのビジネスロジック（フック群・LocalStorage）は変更なし
- `ShiftPage.tsx` は変更なし（AppHeaderの描画はAppレイヤーで処理）
- 既存のテスト（`*.test.tsx`）はルーティング非依存のため修正不要（MemoryRouterを使うテストは要確認）

---

## Risks / Trade-offs

- **開発中の `bun run dev`**: Viteの開発サーバーは `SPA fallback` を自動で行うため `404.html` は不要。本番ビルドのみで機能する
- **sessionStorage の競合**: 他のキー名との衝突を避けるため `spa-redirect` キーは用途限定。読み取り後即削除する
- **`/settings` と `/settings/:tab` の二重定義**: React Router v7 では両方定義しないと `/settings` がマッチしない。`/settings` にアクセスした際に `period` タブにフォールバックする実装が必要
