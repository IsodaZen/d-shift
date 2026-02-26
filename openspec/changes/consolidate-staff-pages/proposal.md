## Why

スタッフに関連する情報（スタッフ基本情報・希望休）がスタッフページと設定ページの「希望休」タブに分散しており、ユーザーが1か所でスタッフ管理を完結できない。スタッフページに希望休管理を統合することで、スタッフに関わるすべての操作を単一ページに集約し、UXを向上させる。

## What Changes

- スタッフページ（`/`）にタブを追加する：「スタッフ一覧」タブ（既存機能）と「希望休」タブ（設定ページから移動）
- 設定ページから「希望休」タブ（`/settings/dayoff`）を削除する
- スタッフページの「希望休」タブに、現在 `/settings/dayoff` にある希望休管理UI（カレンダーモード・フォールバックモード・スタッフ別サマリー）をそのまま移植する
- スタッフページのフロー誘導CTA（「シフト期間を設定する →」ボタン）は「スタッフ一覧」タブにのみ表示する

## Capabilities

### New Capabilities

（なし）

### Modified Capabilities

- `screen-navigation`: SettingsPage から dayoff タブを削除し、StaffPage にタブUI（スタッフ一覧／希望休）を追加する。ルート構成・ヘッダータイトルは変更しない
- `staff-management`: StaffPage がタブUIを持ち、「スタッフ一覧」と「希望休」の2タブを持つようになる
- `preferred-day-off`: 希望休管理UIの設置場所が `/settings/dayoff`（SettingsPage）から `/`（StaffPage内の希望休タブ）に変わる。UI仕様（カレンダーモード・フォールバック・サマリー・syncDayOffs）は変更しない

## Impact

- `src/pages/StaffPage.tsx`: タブ追加・希望休管理UIの移植
- `src/pages/SettingsPage.tsx`: dayoff タブの削除・関連 state/handler の削除
- `src/pages/StaffPage.test.tsx`: 希望休タブのテスト追加
- `src/pages/SettingsPage.test.tsx`: dayoff タブのテスト削除
- `openspec/specs/screen-navigation/spec.md`: タブ構成の変更を反映
- `openspec/specs/staff-management/spec.md`: StaffPage のタブUIを反映
- `openspec/specs/preferred-day-off/spec.md`: UI設置場所の変更を反映
