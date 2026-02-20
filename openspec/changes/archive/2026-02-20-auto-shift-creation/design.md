## 技術設計

### 全体方針

既存のフック・ユーティリティのアーキテクチャ（`useLocalStorage` を核とした薄いカスタムフック群）を踏襲する。新機能は既存コードへの影響を最小限に抑え、明確な責務分離を維持しながら追加する。

---

## データモデル

### 新規型: `ShiftPeriod`（`src/types/index.ts`）

```ts
export interface ShiftPeriod {
  startDate: string; // YYYY-MM-DD
  endDate: string;   // YYYY-MM-DD
}
```

日付は既存の `ShiftAssignment` 等と同じ `YYYY-MM-DD` 文字列形式を使用し、型の一貫性を保つ。

### LocalStorageキー

| キー | 型 | 用途 |
|---|---|---|
| `d-shift:shift-period` | `ShiftPeriod \| null` | シフト作成期間の永続化 |

---

## 新規フック設計

### `src/hooks/useShiftPeriod.ts`

```ts
interface UseShiftPeriodReturn {
  shiftPeriod: ShiftPeriod | null;
  setShiftPeriod: (period: ShiftPeriod) => void;
  clearShiftPeriod: () => void;
  isWithinPeriod: (date: string) => boolean;
  getPeriodDates: () => string[]; // YYYY-MM-DD[]
}
```

- `useLocalStorage<ShiftPeriod | null>('d-shift:shift-period', null)` を内部使用
- `getPeriodDates()`: `date-fns` の `eachDayOfInterval` で開始日〜終了日の全日付配列を生成
- `isWithinPeriod(date)`: 開始日 ≤ date ≤ 終了日 を判定

---

## 自動生成アルゴリズム

### 設計方針: 純関数 + グリーディ法

副作用を排除して単体テスト可能にするため、アルゴリズムは純関数として `src/utils/autoShiftGenerator.ts` に実装する。

### 関数シグネチャ

```ts
export function generateAutoShift(params: {
  periodDates: string[];           // 対象日付リスト（昇順）
  staff: Staff[];
  dayOffs: PreferredDayOff[];
  shiftConfigs: ShiftSlotConfig[];
  getRequiredCount: (date: string, slot: TimeSlot) => number;
}): ShiftAssignment[]
```

### アルゴリズム

1. **日付ループ（昇順）**: 期間内の各日付を順に処理
2. **週境界管理**: 各スタッフの週ごとのアサイン数をアルゴリズム内で追跡。ISO週（月〜日）単位でカウント
3. **時間帯ループ**: 各日の時間帯を `morning → afternoon → evening` の順に処理
4. **スタッフフィルタリング（強制制約）**:
   - `isDayOff(staffId, date)` が true のスタッフを除外
   - `staff.availableSlots` に対象時間帯を含まないスタッフを除外
   - 当該週のアサイン数 ≥ `staff.maxWeeklyShifts` のスタッフを除外
5. **優先順位付け**: 週アサイン数の少ないスタッフを優先（等しい場合は配列順）
6. **アサイン数上限**: `getRequiredCount(date, slot)` で取得した必要人数まで割り当て。候補が少ない場合はベストエフォートで割り当て（ゼロでも可）
7. **駐車場割り当て**: 既存の `assignParking()` ユーティリティを再利用

### 出力

`ShiftAssignment[]` を返す。駐車場は `assignParking()` で付与済み。呼び出し側（フック）が LocalStorage への書き込みを担当する。

---

## 既存フックへの変更

### `src/hooks/useAssignments.ts`

バルクアサイン関数を追加する。

```ts
// 新規追加
bulkSetAssignments: (newAssignments: ShiftAssignment[], periodDates: string[]) => void;
```

実装:
1. `assignments` 状態から `periodDates` に含まれる日付のアサインをすべて削除
2. `newAssignments` を追加した新しい配列を `setValue()` で保存

既存の `addAssignment` / `removeAssignment` のインターフェースは変更しない。

---

## コンポーネント変更方針

### `src/components/WeekNav.tsx`

Propsを拡張して期間制限を受け取る。

```ts
interface WeekNavProps {
  weekStart: Date;
  onPrev: () => void;
  onNext: () => void;
  // 新規追加
  minDate?: Date;  // シフト期間開始日（未設定時は制限なし）
  maxDate?: Date;  // シフト期間終了日（未設定時は制限なし）
}
```

- `weekStart < minDate の週` の場合、「前の週」ボタンを `disabled`
- `weekStart > maxDate の週` の場合、「次の週」ボタンを `disabled`
- 後方互換性維持のため `minDate`/`maxDate` はオプション

### `src/pages/ShiftPage.tsx`

**初期表示**:
- `useShiftPeriod()` で期間を取得
- `weekStart` の初期値を `shiftPeriod.startDate` の週の月曜日に変更。期間未設定時は `getDefaultWeekStart()` を使用

**「自動生成」ボタン**:
- 既存ヘッダー（WeekNav の隣）に配置
- `shiftPeriod` が null の場合はボタンを非表示またはdisable

**確認ダイアログ**:
- 期間内に既存アサインがある場合にのみ表示
- 「上書きして生成」「キャンセル」の2択
- React状態 (`useState`) でダイアログ表示を管理。外部ライブラリ不要

**生成フロー**:
1. `generateAutoShift()` を呼び出して新アサインを計算
2. 期間内に既存アサインがあれば確認ダイアログ表示
3. 確認後 `bulkSetAssignments()` で保存

### `src/pages/SettingsPage.tsx`

**タブ構成変更**:
- 既存の3タブ（シフト枠 / 希望休 / 駐車場）に先頭タブとして「シフト期間」を追加（計4タブ）

**「シフト期間」タブ**:
- `<input type="date">` × 2（開始日・終了日）
- 保存ボタン、クリアボタン

**「シフト枠」タブ変更**:
- `getWeekDates(currentWeek)` による今週固定の表示を廃止
- `useShiftPeriod().getPeriodDates()` で期間内全日付を取得
- 期間未設定時: 設定を促すメッセージを表示（編集UIは非表示）
- 日数が多い場合は既存の縦スクロールで対応（追加コンポーネント不要）

---

## 依存関係と影響範囲

### 変更ファイル（既存）

| ファイル | 変更内容 |
|---|---|
| `src/types/index.ts` | `ShiftPeriod` 型を追加 |
| `src/hooks/useAssignments.ts` | `bulkSetAssignments()` を追加 |
| `src/components/WeekNav.tsx` | `minDate`/`maxDate` props を追加、ボタン無効化ロジック追加 |
| `src/pages/ShiftPage.tsx` | 初期週、自動生成ボタン、確認ダイアログを追加 |
| `src/pages/SettingsPage.tsx` | 「シフト期間」タブ追加、「シフト枠」タブを期間対応に変更 |

### 新規ファイル

| ファイル | 内容 |
|---|---|
| `src/hooks/useShiftPeriod.ts` | シフト期間のCRUD・LocalStorage同期 |
| `src/utils/autoShiftGenerator.ts` | 自動生成純関数 |

### 既存機能への影響

- 既存の `useAssignments` の個別アサイン操作（add/remove）は変更なし
- `WeekNav` は `minDate`/`maxDate` 未指定時は従来通り動作（後方互換性あり）
- `useShiftConfig.getRequiredCount()` のインターフェースは変更なし

---

## 未解決事項・設計判断メモ

- **自動生成の実行速度**: シフト期間が長い場合（例: 1ヶ月31日×3時間帯×スタッフ数）でも同期処理で十分と判断。非同期化は不要
- **日付ライブラリ**: 既存の `date-fns` を引き続き使用。`eachDayOfInterval` / `startOfWeek` / `endOfWeek` を活用
- **「シフト枠」タブのページング**: 期間が長い場合は縦スクロールのみで対応。週ページングは将来対応とする
