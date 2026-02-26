## 1. 各スタッフアイテムへの「希望休」ボタン追加のテストを書く（Red）

- [ ] 1.1 各スタッフアイテムに「希望休」ボタンが表示されることのテストを書く
- [ ] 1.2 「希望休」ボタンをクリックすると希望休管理ビューが表示されるテストを書く（スタッフ一覧は非表示になる）
- [ ] 1.3 希望休管理ビューの見出しが「{スタッフ名} の希望休」になることのテストを書く
- [ ] 1.4 希望休管理ビューの「戻る」ボタンをクリックするとスタッフ一覧ビューに戻るテストを書く
- [ ] 1.5 希望休管理ビューにスタッフ選択ドロップダウンが表示されないことのテストを書く
- [ ] 1.6 希望休管理ビュー表示中はフロー誘導CTA（「シフト期間を設定する →」）が表示されないテストを書く

## 2. 各スタッフアイテムへの「希望休」ボタンと mode 拡張を実装する（Green）

- [ ] 2.1 StaffPage.tsx の `FormMode` 型に `{ type: 'dayoff'; staff: Staff }` を追加する
- [ ] 2.2 各スタッフアイテムに「希望休」ボタンを追加し、クリックで `mode = { type: 'dayoff', staff }` にセットする
- [ ] 2.3 `mode.type === 'dayoff'` のとき希望休管理ビューを表示し、スタッフ一覧UIを非表示にする
- [ ] 2.4 希望休管理ビューに見出し「{staff.name} の希望休」を表示する
- [ ] 2.5 「戻る」ボタンをクリックで `mode = null`（スタッフ一覧）に戻る処理を実装する

## 3. 希望休管理ビューのUIテストを書く（Red）

- [ ] 3.1 希望休管理ビューでシフト期間未保存時にフォールバックUI（日付入力フィールド）が表示されることのテストを書く
- [ ] 3.2 希望休管理ビューでシフト期間保存済み時はカレンダーUIが表示されることのテストを書く
- [ ] 3.3 カレンダーで日付をトグル選択できることのテストを書く
- [ ] 3.4 「保存」ボタンをクリックすると `syncDayOffs` が呼ばれることのテストを書く
- [ ] 3.5 保存後に結果メッセージが表示されることのテストを書く

## 4. 希望休管理ビューのUIを実装する（Green）

- [ ] 4.1 SettingsPage.tsx から希望休関連 state・handler を StaffPage.tsx に移植する（`calendarSelectedDates`、`syncMessage` 等）。`calendarStaffId` は不要（`mode.staff.id` で代替）
- [ ] 4.2 StaffPage.tsx に必要なフック・コンポーネントのインポートを追加する（`useDayOffs`、`useShiftPeriod`、`DayOffCalendar` 等）
- [ ] 4.3 希望休管理ビューのコンテンツ（フォールバックUI・カレンダーUI）を StaffPage.tsx に実装する（スタッフ選択ドロップダウンなし）

## 5. SettingsPage dayoff タブ削除のテストを書く（Red）

- [ ] 5.1 SettingsPage のタブ一覧に「希望休」ボタンが存在しないことのテストを追加する
- [ ] 5.2 SettingsPage.test.tsx から dayoff タブ関連の既存テストを削除する（または dayoff タブが存在しないことを確認するテストに置き換える）

## 6. SettingsPage から dayoff タブを削除する（Green）

- [ ] 6.1 SettingsPage.tsx のタブ定義から `dayoff` を削除する
- [ ] 6.2 `VALID_TABS` から `'dayoff'` を削除し、`Tab` 型を更新する
- [ ] 6.3 SettingsPage.tsx から dayoff タブの UI JSX（フォールバックフォーム・カレンダーUI・サマリー）を削除する
- [ ] 6.4 SettingsPage.tsx から dayoff 関連 state・handler（`dayOffStaffId`、`dayOffDate`、`calendarStaffId`、`calendarSelectedDates`、`syncMessage`、`handleCalendarStaffChange`、`handleAddDayOff`、`handleCalendarToggle`、`handleSyncDayOffs`）を削除する
- [ ] 6.5 SettingsPage.tsx から不要になったフック・コンポーネントのインポートを削除する（`useDayOffs`、`DayOffCalendar` 等）

## 7. 動作確認・リファクタリング

- [ ] 7.1 `bun run test` を実行してすべてのテストが通ることを確認する
- [ ] 7.2 `bun run build` を実行してビルドエラーがないことを確認する
