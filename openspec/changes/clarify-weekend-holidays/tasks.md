## タスクリスト

### Phase 1: 祝日ユーティリティのテストを書く（Red）

- [x] `src/utils/dateUtils.test.ts` を作成し、`isJapaneseHoliday` のテストを書く（Red）
  - 「元日（1月1日）は祝日と判定される」
  - 「建国記念の日（2月11日）は祝日と判定される」
  - 「ハッピーマンデー: 体育の日（10月第2月曜）は祝日と判定される」
  - 「振替休日: 祝日が日曜の場合、翌月曜は振替休日と判定される」
  - 「平日（月曜〜金曜で祝日でない日）は祝日と判定されない」

- [x] `src/utils/dateUtils.test.ts` に `getDayType` のテストを追加する（Red）
  - 「土曜日（祝日でない）は 'saturday' を返す」
  - 「日曜日（祝日でない）は 'sunday' を返す」
  - 「祝日（平日）は 'holiday' を返す」
  - 「祝日かつ土曜は 'holiday' を返す（祝日が優先）」
  - 「祝日かつ日曜は 'holiday' を返す（祝日が優先）」
  - 「平日は 'weekday' を返す」

---

### Phase 2: 祝日ユーティリティを実装する（Green）

- [x] `src/utils/dateUtils.ts` に `isJapaneseHoliday(dateStr: string): boolean` を追加する（Green）
  - 固定祝日リスト（元日・成人の日を除く固定日）をハードコード
  - ハッピーマンデー（成人の日・海の日・敬老の日・体育の日）を月・週計算で算出
  - 振替休日ロジック（祝日が日曜 → 翌月曜が振替）を実装
  - 国民の休日（祝日に挟まれた平日は休日）ロジックを実装

- [x] `src/utils/dateUtils.ts` に `getDayType(dateStr: string): 'weekday' | 'saturday' | 'sunday' | 'holiday'` を追加する（Green）
  - 優先順位（上から評価）:
    1. `isJapaneseHoliday` が true → `'holiday'`（土曜・日曜と重なる場合も祝日が最優先）
    2. 日曜 → `'sunday'`
    3. 土曜 → `'saturday'`
    4. それ以外 → `'weekday'`

- [x] テストが全てパスすることを確認する

---

### Phase 3: useShiftConfigの祝日対応テストを書く（Red）

- [x] `src/hooks/useShiftConfig.test.ts` に祝日デフォルト値のテストを追加する（Red）
  - 「未設定の祝日（平日）は午前0を返す」
  - 「未設定の祝日（平日）は午後0を返す」
  - 「未設定の祝日（平日）は夕方0を返す」
  - 「未設定の祝日（土曜）は午前0を返す（土曜デフォルト2ではなく祝日デフォルト0）」
  - 「祝日に保存値がある場合は保存値が優先される」

---

### Phase 4: useShiftConfigの祝日対応を実装する（Green）

- [x] `src/types/index.ts` を更新する（Green）
  - `DayCategory` に `'holiday'` を追加: `'weekday' | 'saturday' | 'sunday' | 'holiday'`
  - `DEFAULT_SHIFT_SLOT_COUNTS` に `holiday: { morning: 0, afternoon: 0, evening: 0 }` を追加

- [x] `src/hooks/useShiftConfig.ts` の `getDayCategory()` を更新する（Green）
  - `isJapaneseHoliday` を `dateUtils.ts` からインポートする
  - 優先順位（上から評価）:
    1. `isJapaneseHoliday(date)` が true → `'holiday'`
    2. 日曜 → `'sunday'`
    3. 土曜 → `'saturday'`
    4. それ以外 → `'weekday'`

- [x] テストが全てパスすることを確認する

---

### Phase 5: ShiftTableコンポーネントのテストを書く（Red）

- [x] `src/components/ShiftTable.test.tsx` に土日祝スタイルのテストを追加する（Red）
  - 「土曜日（祝日でない）の列ヘッダーに blue 系クラスが付与されている」
  - 「日曜日の列ヘッダーに red 系クラスが付与されている」
  - 「祝日（平日）の列ヘッダーに red 系クラスが付与されている」
  - 「祝日かつ土曜日の列ヘッダーに red 系クラスが付与されている（blue ではない）」
  - 「平日の列ヘッダーには blue/red 系クラスが付与されていない」

---

### Phase 6: ShiftTableコンポーネントを修正する（Green）

- [x] `src/components/ShiftTable.tsx` の列ヘッダー（`<th>`）に曜日・祝日スタイルを適用する（Green）
  - `getDayType` を使って各日付のタイプを取得する
  - `saturday` → ヘッダー背景 `bg-blue-50`、テキスト `text-blue-700`
  - `sunday` / `holiday` → ヘッダー背景 `bg-red-50`、テキスト `text-red-700`
  - `weekday` → 現状のスタイル維持（`text-gray-600`）

- [x] テストが全てパスすることを確認する

---

### Phase 7: 動作確認

- [x] `bun run test` を実行し、全テストがパスすることを確認する
- [x] `bun run build` を実行し、エラーなくビルドが完了することを確認する
