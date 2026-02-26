#!/bin/bash
set -euo pipefail

# Webセッション（Claude Code on the web）以外ではスキップ
if [ "${CLAUDE_CODE_REMOTE:-}" != "true" ]; then
  exit 0
fi

cd "$CLAUDE_PROJECT_DIR"

# プロジェクト依存関係のインストール
echo "=== プロジェクト依存関係をインストール中 ==="
bun install

# openspec CLI のインストール（未インストール時のみ）
echo "=== openspec CLI の確認 ==="
if ! command -v openspec &> /dev/null; then
  echo "openspec CLI が見つかりません。@fission-ai/openspec をインストール中..."
  npm install -g @fission-ai/openspec@latest
  echo "openspec CLI のインストール完了: $(openspec --version)"
else
  echo "openspec CLI は導入済みです: $(openspec --version)"
fi
