## Why

スタッフに関連する情報（スタッフ基本情報・希望休）がスタッフページと設定ページの「希望休」タブに分散しており、ユーザーが1か所でスタッフ管理を完結できない。スタッフページの各スタッフアイテムに「希望休」ボタンを追加し、クリックでそのスタッフの希望休管理ビューに切り替えることで、スタッフに関わるすべての操作を単一ページに集約し、UXを向上させる。

## What Changes

- スタッフ一覧の各アイテムに「希望休」ボタンを追加する
- 「希望休」ボタンをクリックすると、StaffPage 内でビューを切り替え（既存の「編集」ボタンと同じ mode パターン）、対象スタッフの希望休管理UIを表示する
- 希望休管理UIにはスタッフ選択ドロップダウンを設けない（ボタンを押したスタッフが対象のため）
- 設定ページから「希望休」タブ（`/settings/dayoff`）を削除する
- 既存の希望休ロジック（`useDayOffs`・`DayOffCalendar`・`syncDayOffs`）は変更しない

## Capabilities

### New Capabilities

（なし）

### Modified Capabilities

- `screen-navigation`: SettingsPage から dayoff タブを削除する。StaffPage はタブUIを持たず、各スタッフアイテムに「希望休」ボタンを追加する形で希望休管理へのエントリーポイントを提供する
- `staff-management`: 各スタッフアイテムに「希望休」ボタンを追加し、クリックで希望休管理ビューに切り替える（mode パターンの拡張）
- `preferred-day-off`: 希望休管理UIの設置場所が `/settings/dayoff`（SettingsPage）から StaffPage 内の希望休管理ビューに変わる。スタッフ選択ドロップダウンは不要になる。その他のUI仕様（カレンダーモード・フォールバック・syncDayOffs）は変更しない

## Impact

- `src/pages/StaffPage.tsx`: 各スタッフアイテムへの「希望休」ボタン追加・mode 拡張・希望休管理ビューの実装
- `src/pages/SettingsPage.tsx`: dayoff タブの削除・関連 state/handler の削除
- `src/pages/StaffPage.test.tsx`: 希望休ビューのテスト追加
- `src/pages/SettingsPage.test.tsx`: dayoff タブのテスト削除
- `openspec/specs/screen-navigation/spec.md`: タブ構成の変更を反映
- `openspec/specs/staff-management/spec.md`: 希望休ボタン・ビュー切り替えを反映
- `openspec/specs/preferred-day-off/spec.md`: UI設置場所の変更を反映
