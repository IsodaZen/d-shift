## タスクリスト

### Phase 1: テストの更新（TDD: Red → Green）

- [ ] `src/pages/SettingsPage.test.tsx` のクリアボタンテストを削除する（Red → テスト自体が不要になる）
  - 「クリアボタンを押すとシフト期間が削除される」テストケースを削除する
  - クリアボタンの存在を前提とするテスト記述を除去する

### Phase 2: 実装の変更（Green）

- [ ] `src/pages/SettingsPage.tsx` からクリアボタンおよび関連ロジックを削除する
  - `clearShiftPeriod` を `useShiftPeriod` の分割代入から削除する
  - `handleClearPeriod` 関数を削除する
  - 「クリア」ボタンの `<button>` 要素を削除する
  - ボタン行のレイアウト（`flex gap-2`）を「保存」ボタン1つのみに修正する

### Phase 3: 仕様の更新

- [ ] `openspec/specs/shift-period-config/spec.md` を確認し、クリア機能に関する記述があれば削除する

### Phase 4: 動作確認

- [ ] テストがすべてパスすることを確認する（`bun run test` 相当）
- [ ] ビルドエラーがないことを確認する（`bun run build` 相当）
