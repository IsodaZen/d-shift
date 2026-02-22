## タスクリスト

### Phase 1: 型定義とヘルプスタッフフック（TDD）

- [x] `src/types/index.ts` に `HelpStaff` 型を追加する
  - `id: string`, `name: string`, `availableSlots: TimeSlot[]`, `availableDates: string[]`, `usesParking: boolean`

- [x] `src/hooks/useHelpStaff.test.ts` を作成しテストを書く（Red）
  - 「初期状態で空配列が返る」
  - 「ヘルプスタッフを追加するとLocalStorageに保存される」
  - 「ヘルプスタッフを編集するとLocalStorageが更新される」
  - 「ヘルプスタッフを削除するとLocalStorageから削除される」
  - 「稼働可能日付を更新できる」

- [x] `src/hooks/useHelpStaff.ts` を作成し実装する（Green）
  - `useLocalStorage` を活用して `helpStaff` を管理
  - `addHelpStaff`, `updateHelpStaff`, `deleteHelpStaff`, `updateAvailableDates` 関数を提供

---

### Phase 2: ヘルプスタッフフォームコンポーネント（TDD）

- [x] `src/components/HelpStaffForm.test.tsx` を作成しテストを書く（Red）
  - 「名前を入力して登録できる」
  - 「名前が空の場合はバリデーションエラーが表示される」
  - 「出勤可能時間帯を選択できる」
  - 「駐車場利用有無を設定できる」
  - 「編集モードで既存値が初期表示される」

- [x] `src/components/HelpStaffForm.tsx` を作成し実装する（Green）
  - Props: `onSubmit`, `initialData?`（編集時）
  - 氏名入力、出勤可能時間帯のチェックボックス、駐車場利用トグル

---

### Phase 3: 稼働可能日付カレンダーUI（TDD）

- [x] `src/components/HelpStaffAvailabilityCalendar.test.tsx` を作成しテストを書く（Red）
  - 「シフト期間内の日付がカレンダーに表示される」
  - 「登録済みの稼働可能日付が選択済み状態で表示される」
  - 「シフト期間外の日付はグレーアウトして選択不可」
  - 「期間内の日付をタップすると選択状態がトグルされる」
  - 「保存ボタンを押すと選択中の日付がコールバックで返される」

- [x] `src/components/HelpStaffAvailabilityCalendar.tsx` を作成し実装する（Green）
  - Props: `periodDates: string[]`, `selectedDates: string[]`, `onSave: (dates: string[]) => void`
  - 既存の `DayOffCalendar` のパターンを参考にカレンダーグリッドを実装
  - 月送り（前月/翌月）ボタン対応

---

### Phase 4: 設定ページへのヘルプスタッフタブ追加（TDD）

- [x] `src/pages/SettingsPage.test.tsx` にヘルプスタッフタブのテストを追加する（Red）
  - 「`/settings/help-staff` でヘルプスタッフタブが表示される」
  - 「ヘルプスタッフ一覧が表示される」
  - 「ヘルプスタッフを追加できる」
  - 「ヘルプスタッフを編集できる」
  - 「ヘルプスタッフを削除できる」
  - 「スタッフ選択後にカレンダーで稼働可能日付を設定できる」

- [x] `src/pages/SettingsPage.tsx` にヘルプスタッフタブを追加する（Green）
  - タブ定義に `help-staff` を追加（URL: `/settings/help-staff`, ラベル: ヘルプスタッフ）
  - ヘルプスタッフ一覧 + 追加/編集/削除UI
  - カレンダーUIで稼働可能日付を設定

- [ ] `openspec/specs/screen-navigation/spec.md` のタブ一覧に `help-staff` を追記する

---

### Phase 5: 自動生成アルゴリズムの拡張（TDD）

- [x] `src/utils/autoShiftGenerator.test.ts` にヘルプスタッフ関連テストを追加する（Red）
  - 「通常スタッフで充足可能な場合、ヘルプスタッフはアサインされない」
  - 「通常スタッフだけでは不足する場合、ヘルプスタッフがアサインされる」
  - 「ヘルプスタッフは稼働可能日付のみにアサインされる」
  - 「ヘルプスタッフは出勤可能時間帯のみにアサインされる」
  - 「ヘルプスタッフは駐車場制約を満たす」
  - 「ヘルプスタッフも出勤日には全時間帯にアサインされる」
  - 「複数ヘルプスタッフがいる場合、アサイン数の少ないヘルプスタッフが優先される」

- [x] `src/utils/autoShiftGenerator.ts` を拡張する（Green）
  - `GenerateAutoShiftParams` に `helpStaff: HelpStaff[]` を追加
  - ソート順: 通常スタッフ（週アサイン数昇順）→ ヘルプスタッフ（アサイン数昇順）
  - ヘルプスタッフの制約: `availableDates` に含まれる日付のみ、`availableSlots` の時間帯のみ
  - 週上限なし（ヘルプスタッフは `availableDates` で出勤日を制御するため）

---

### Phase 6: ヘルプスタッフアラートの改善（TDD）

- [ ] `src/hooks/useHelpAlert.test.ts` にヘルプスタッフ考慮テストを追加する（Red）
  - 「稼働可能なヘルプスタッフがいる場合、不足人数から差し引かれる」
  - 「ヘルプスタッフだけで不足を補える場合、アラートは表示されない」
  - 「ヘルプスタッフでも不足する場合、残りの不足人数がアラートに表示される」
  - 「稼働可能日付に含まれないヘルプスタッフはカウントされない」

- [ ] `src/hooks/useHelpAlert.ts` を拡張する（Green）
  - `useHelpStaff` からヘルプスタッフを取得
  - 不足判定に稼働可能なヘルプスタッフ数を加算して再計算

---

### Phase 7: ShiftPageへの統合（TDD）

- [ ] `src/pages/ShiftPage.tsx` の自動生成呼び出しにヘルプスタッフデータを追加する
  - `useHelpStaff` からヘルプスタッフを取得
  - `generateAutoShift` にヘルプスタッフを渡す

---

### Phase 8: リファクタリング

- [ ] ヘルプスタッフ関連コンポーネントをリファクタリングする（Refactor）
  - カレンダーUIの共通ロジックを `DayOffCalendar` と共有検討
  - Tailwindクラスの重複をまとめる

- [ ] 全テストが通ることを確認する
