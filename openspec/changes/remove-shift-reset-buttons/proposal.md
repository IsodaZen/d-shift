## Why

シフト期間設定画面に「クリア」ボタンが存在するが、このボタンはシフト期間をLocalStorageから削除し、入力フォームも空にする。運用上、一度設定したシフト期間を誤って消去するリスクがあり、かつクリア操作が必要なユースケースはほぼ存在しない。

- **誤操作リスク**: 「保存」ボタンの隣に配置されているため、誤ってクリアしてしまう可能性がある
- **再設定の手間**: 誤ってクリアした場合、開始日・終了日を再入力する必要があり、運用上の無駄が生じる
- **不要な機能**: 期間を変更したい場合は日付を直接上書きすれば十分であり、クリアは必要ない

「クリア」ボタン（及びクリアに連動する日付リセット動作）を削除することで、UIをシンプルにし、誤操作を防ぐ。

## What Changes

### シフト期間設定のUIからクリアボタンを削除

- **削除するもの**:
  - `SettingsPage.tsx` の「クリア」ボタン（`handleClearPeriod` を呼ぶ `<button>`要素）
  - `handleClearPeriod` 関数（不要になる）
  - `clearShiftPeriod` のインポート（`useShiftPeriod` からの分割代入から削除）
- **変更するもの**:
  - ボタン行を「保存」ボタン1つのみにする（`flex gap-2` レイアウト変更）

### 仕様の更新

`openspec/specs/shift-period-config/spec.md` から「期間のクリア」に関する記述（あれば）を削除する。

## Capabilities

### Modified Capabilities

- `shift-period-config`: シフト期間設定UIからクリアボタンを削除する。保存ボタンのみを残す

## Impact

### 変更ファイル（既存）

| ファイル | 変更内容 |
|---|---|
| `src/pages/SettingsPage.tsx` | 「クリア」ボタンとその関連ハンドラー（`handleClearPeriod`）を削除 |
| `src/pages/SettingsPage.test.tsx` | クリアボタンに関するテスト（あれば）を削除 |
| `openspec/specs/shift-period-config/spec.md` | クリア機能に関する記述（あれば）を削除 |
