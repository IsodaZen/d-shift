## タスクリスト

### Phase 1: `syncDayOffs` フック追加（TDD）

- [x] `src/hooks/useDayOffs.test.ts` に `syncDayOffs` のテストを追加する（Red）
  - 「date1 を外し date3 を追加した場合、`{ added: 1, removed: 1 }` が返り LocalStorage が更新される」
  - 「空配列を渡すとすべて削除され `{ added: 0, removed: 2 }` が返る」
  - 「変化なしで呼ぶと `{ added: 0, removed: 0 }` が返り LocalStorage は変更されない」
  - 「他スタッフのデータに影響しない」

- [x] `src/hooks/useDayOffs.ts` に `syncDayOffs` を実装する（Green）
  - 引数: `staffId: string, dates: string[]`
  - 戻り値: `{ added: number; removed: number }`
  - `dates` にあるが未登録の日付を追加、登録済みだが `dates` にない日付を削除
  - 1回の `setDayOffs` で一括更新（原子性を保証）
  - 既存の `addDayOff` / `deleteDayOff` は変更しない

---

### Phase 2: カレンダーUIコンポーネント作成（TDD）

- [x] `src/components/DayOffCalendar.test.tsx` を作成しテストを書く（Red）
  - 「シフト期間内の日付がカレンダーに表示される」
  - 「登録済みの日付が初期選択済み状態で表示される」
  - 「シフト期間外の日付はグレーアウトして選択不可で表示される」
  - 「期間内の日付をタップすると選択状態がトグルされる」
  - 「シフト期間外の日付をタップしても選択状態が変化しない」
  - 「複数月またがり時に前月/翌月ボタンが表示される」
  - 「前月ボタンは開始月で非活性になる」
  - 「翌月ボタンは終了月で非活性になる」

- [x] `src/components/DayOffCalendar.tsx` を作成する（Green）
  - Props:
    - `periodDates: string[]` — シフト期間内の日付一覧
    - `selectedDates: string[]` — 選択中の日付一覧（外部 state）
    - `onToggle: (date: string) => void` — 日付タップ時のコールバック
  - 月ごとのグリッド表示（日曜始まり）
  - 現在表示月を state で管理（初期値: `periodDates[0]` の月）
  - 前月/翌月ボタン: `periodDates` の範囲内でのみ活性化
  - シフト期間外の日付: `pointer-events: none` ＋ グレースタイル

---

### Phase 3: 希望休タブUIの更新（TDD）

- [x] `src/pages/SettingsPage.test.tsx` に希望休タブの新UIテストを追加する（Red）
  - 「`isShiftPeriodSaved === false` の場合は日付入力フィールドが表示される（フォールバック）」
  - 「`isShiftPeriodSaved === true` かつスタッフ未選択の場合はカレンダーが表示されない」
  - 「`isShiftPeriodSaved === true` かつスタッフ選択済みの場合はカレンダーが表示される」
  - 「カレンダー初期表示時に選択スタッフの登録済み日付が選択済み状態になる」
  - 「スタッフを切り替えると選択状態が切り替え先の登録状態にリセットされる」
  - 「「保存」ボタンを押すと `syncDayOffs` が呼ばれ結果メッセージが表示される」
  - 「全選択を解除して保存すると全希望休が削除される」
  - 「次に日付をタップすると結果メッセージが消える」
  - 「スタッフ別サマリーにシフト期間内の希望休件数が表示される」
  - 「希望休のないスタッフはサマリーに表示されない」
  - 「希望休が0件の場合は「登録された希望休はありません」が表示される」

- [x] `src/pages/SettingsPage.tsx` の希望休タブを更新する（Green）
  - `isShiftPeriodSaved` を `useShiftPeriod` から取得する
  - `syncDayOffs` を `useDayOffs` から取得する
  - フォールバック: `!isShiftPeriodSaved` の場合は既存の日付入力UIを表示
  - カレンダーモード:
    - スタッフ選択時に `DayOffCalendar` を表示
    - 選択済み日付の state を管理（スタッフ切り替え時にその staff の登録済み日付で初期化）
    - 「保存」ボタンで `syncDayOffs(staffId, selectedDates)` を呼び出す
    - 保存結果メッセージ（`${added}件を追加、${removed}件を削除しました`）を表示
    - 結果メッセージは日付タップまたはスタッフ切り替えでクリア
  - サマリー表示:
    - `staff` 一覧をループし、`dayOffs.filter` でシフト期間内かつ該当 staffId の件数を算出
    - 1件以上のスタッフのみ表示
    - 0件の場合は「登録された希望休はありません」を表示

---

### Phase 4: リファクタリング

- [x] `DayOffCalendar` コンポーネントをリファクタリングする（Refactor）
  - カレンダーグリッド生成ロジックを `src/utils/dateUtils.ts` のユーティリティ関数に切り出す（`buildCalendarGrid`, `getCalendarMonths`）
  - Tailwind クラスの重複をまとめる

- [x] `SettingsPage` の希望休タブロジックをリファクタリングする（Refactor）
  - `useEffect` を廃止し、スタッフ選択変更ハンドラー（`handleCalendarStaffChange`）に選択状態初期化ロジックを統合
  - 結果メッセージ管理の state をシンプルに保つ
