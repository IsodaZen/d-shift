# CLAUDE.md

## プロジェクト概要

チームのシフト作成を支援するWebツール。バックエンドなしのフロントエンドのみの構成。

## 技術スタック

| 項目 | 採用技術 |
| ---- | -------- |
| フレームワーク | React |
| ビルドツール | Vite |
| 言語 | TypeScript |
| スタイリング | Tailwind CSS |
| パッケージマネージャー | bun |
| ホスティング | GitHub Pages |
| CI/CD | GitHub Actions |

## アーキテクチャ方針

- **フロントエンドのみ**: バックエンドサーバーなし。データはブラウザのローカルストレージまたはエクスポート/インポートで管理
- **静的サイト**: Viteでビルドし、GitHub Pagesに静的ファイルとして配信
- **オフライン対応優先**: 外部APIへの依存なし

## ディレクトリ構成

```text
d-shift/
├── .claude/              # Claude Code設定（OpenSpec）
├── .github/
│   └── workflows/        # GitHub Actions（ビルド・デプロイ）
├── openspec/             # OpenSpec仕様管理
│   ├── specs/            # 実装済み仕様
│   └── changes/          # 変更提案
├── src/
│   ├── components/       # 再利用可能なUIコンポーネント
│   ├── hooks/            # カスタムフック
│   ├── pages/            # ページコンポーネント
│   ├── types/            # TypeScript型定義
│   ├── utils/            # ユーティリティ関数
│   ├── App.tsx
│   └── main.tsx
├── public/
├── index.html
├── vite.config.ts
├── tsconfig.json
├── tailwind.config.ts
└── bun.lockb
```

## 開発コマンド

```bash
bun install          # 依存関係インストール
bun run dev          # 開発サーバー起動
bun run build        # プロダクションビルド
bun run preview      # ビルド結果のプレビュー
```

## コーディング規約

`.claude/rules/coding-conventions.md` を参照。

## OpenSpec 開発フロー

機能追加・変更は必ずOpenSpecを通じて行う。

1. `/opsx:new` — 変更提案を作成
2. `/opsx:continue` — proposal → tasks → specsの順にアーティファクトを作成
3. `/opsx:apply` — 仕様に基づいて実装
4. `/opsx:archive` — 完了後、仕様に統合

## Git・コミット規約

Conventional Commits形式を使用：

```text
<type>(<scope>): <説明（日本語）>
```

- `feat`: 新機能
- `fix`: バグ修正
- `docs`: ドキュメント
- `style`: コードスタイル（動作変更なし）
- `refactor`: リファクタリング
- `test`: テスト
- `chore`: ビルド・設定変更

## GitHub Pages デプロイ

- `main`ブランチへのpushでGitHub Actionsが自動ビルド・デプロイ
- ベースパスは`vite.config.ts`の`base`オプションで設定（リポジトリ名に合わせる）
