## 1. StaffPage タブUIのテストを書く（Red）

- [ ] 1.1 StaffPage に「スタッフ一覧」「希望休」タブが表示されることのテストを書く
- [ ] 1.2 初期表示で「スタッフ一覧」タブがアクティブであることのテストを書く
- [ ] 1.3 「希望休」タブをクリックすると希望休タブのコンテンツが表示されるテストを書く
- [ ] 1.4 「スタッフ一覧」タブに戻るとスタッフ一覧UIが表示されるテストを書く
- [ ] 1.5 「スタッフ一覧」タブではフロー誘導CTA（スタッフ1件以上の場合）が表示されるテストを書く（既存テストをタブ対応に更新）
- [ ] 1.6 「希望休」タブではフロー誘導CTAが表示されないテストを書く

## 2. StaffPage タブUIを実装する（Green）

- [ ] 2.1 StaffPage.tsx に `activeTab` state（'staff-list' | 'day-off'）を追加する
- [ ] 2.2 StaffPage.tsx のヘッダー下にタブUI（「スタッフ一覧」「希望休」の2タブ）を追加する
- [ ] 2.3 タブ切り替えで表示コンテンツを条件分岐する（既存スタッフ一覧UIを「スタッフ一覧」タブに移動）
- [ ] 2.4 フロー誘導CTA（「シフト期間を設定する →」）を「スタッフ一覧」タブ内にのみ残す

## 3. StaffPage 希望休タブのUIテストを書く（Red）

- [ ] 3.1 希望休タブでシフト期間未保存時にフォールバックUI（日付入力フィールド）が表示されるテストを書く
- [ ] 3.2 希望休タブでシフト期間保存済み・スタッフ未選択時はカレンダーが表示されないテストを書く
- [ ] 3.3 希望休タブのスタッフ別サマリー表示のテストを書く（希望休が0件の場合のメッセージを含む）

## 4. StaffPage 希望休タブのUIを実装する（Green）

- [ ] 4.1 SettingsPage.tsx から希望休関連 state・handler をコピーして StaffPage.tsx に移植する（`dayOffStaffId`、`calendarStaffId`、`calendarSelectedDates`、`syncMessage` 等）
- [ ] 4.2 StaffPage.tsx に必要なフック・コンポーネントのインポートを追加する（`useDayOffs`、`useShiftPeriod`、`DayOffCalendar` 等）
- [ ] 4.3 希望休タブのコンテンツ（フォールバックUI・カレンダーUI・スタッフ別サマリー）を StaffPage.tsx に実装する

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
