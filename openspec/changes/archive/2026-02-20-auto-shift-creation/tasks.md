## タスクリスト

### Phase 1: 型定義・基盤

- [x] `src/types/index.ts` に `ShiftPeriod` 型を追加する
- [x] `src/hooks/useShiftPeriod.ts` を新規作成する（`setShiftPeriod`, `clearShiftPeriod`, `isWithinPeriod`, `getPeriodDates`）

### Phase 2: 自動生成アルゴリズム

- [x] `src/utils/autoShiftGenerator.ts` を新規作成する（純関数 `generateAutoShift()`）
  - 強制制約（希望休・出勤可能時間帯・週上限）でスタッフをフィルタリング
  - 週アサイン数の少ないスタッフ優先のグリーディ割り当て
  - 既存の `assignParking()` を再利用して駐車場番号を付与

### Phase 3: 既存フック拡張

- [x] `src/hooks/useAssignments.ts` に `bulkSetAssignments(newAssignments, periodDates)` を追加する
  - `periodDates` の日付に属する既存アサインを全削除してから新アサインを保存

### Phase 4: WeekNav コンポーネント更新

- [x] `src/components/WeekNav.tsx` に `minDate` / `maxDate` props を追加する
- [x] `minDate` 設定時、表示週が開始週であれば「前の週」ボタンを `disabled` にする
- [x] `maxDate` 設定時、表示週が終了週であれば「次の週」ボタンを `disabled` にする

### Phase 5: ShiftPage 更新

- [x] `src/pages/ShiftPage.tsx` で `useShiftPeriod()` を使い `weekStart` 初期値をシフト期間開始日の週の月曜日に変更する（期間未設定時は従来の `getDefaultWeekStart()` を使用）
- [x] `ShiftPage` のヘッダーに「自動生成」ボタンを追加する（`shiftPeriod` が null の場合は非表示）
- [x] `WeekNav` に `minDate` / `maxDate` を渡す
- [x] 「自動生成」ボタン押下時: `generateAutoShift()` を実行し期間内の既存アサイン有無を確認する
- [x] 既存アサインがある場合に上書き確認ダイアログを表示する
- [x] 確認後（または既存アサインなしの場合）に `bulkSetAssignments()` を呼び出す

### Phase 6: SettingsPage 更新

- [x] `src/pages/SettingsPage.tsx` に「シフト期間」タブを先頭に追加する
  - `<input type="date">` × 2（開始日・終了日）
  - 保存ボタン・クリアボタン
  - `useShiftPeriod()` と連携
- [x] 「シフト枠」タブの日付表示を `getWeekDates(currentWeek)` から `useShiftPeriod().getPeriodDates()` に切り替える
- [x] 「シフト枠」タブで `shiftPeriod` が null の場合に設定促進メッセージを表示し、編集UIを非表示にする

### Phase 7: 不足インジケーター表示（shift-schedule-view）

- [x] シフト表の各日付列ヘッダーに不足インジケーターを追加する
  - いずれかの時間帯でアサイン数が必要人数を下回っている日にのみ表示
  - 不足人数の合計または警告アイコンを表示
