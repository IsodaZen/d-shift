## Delta Spec: shift-slot-config — 祝日のデフォルトシフト枠

> このファイルは `openspec/specs/shift-slot-config/spec.md` への追加仕様（delta）です。
> アーカイブ時にメイン仕様にマージされます。

---

### Requirement: 設定されていない祝日の必要人数にデフォルト値0が適用される

システムは、LocalStorageに必要人数が設定されていない祝日の必要人数を取得する際、全時間帯に0を返さなければならない（SHALL）。
祝日は土曜・日曜と重なる場合も含む（祝日の判定が曜日より優先される）。
LocalStorageに値が保存されている場合は、デフォルト値より保存値を優先しなければならない（SHALL）。

既存のデフォルト値との優先順位は以下のとおりである：

| 区分 | 午前 | 午後 | 夕方 |
|---|---|---|---|
| 祝日（曜日問わず） | 0 | 0 | 0 |
| 日曜日（祝日でない） | 0 | 0 | 0 |
| 土曜日（祝日でない） | 2 | 2 | 0 |
| 平日（祝日でない月〜金） | 6 | 6 | 1 |

#### Scenario: 未設定の祝日（平日）の必要人数はすべて0を返す
- **WHEN** LocalStorageに設定がない祝日（月〜金）の日付・時間帯の必要人数を取得する
- **THEN** 午前は0、午後は0、夕方は0が返される

#### Scenario: 未設定の祝日（土曜）の必要人数はすべて0を返す
- **WHEN** LocalStorageに設定がない、土曜日に当たる祝日の日付・時間帯の必要人数を取得する
- **THEN** 午前は0、午後は0、夕方は0が返される（土曜のデフォルト値2/2/0ではなく祝日の0/0/0が適用される）

#### Scenario: 祝日に手動で必要人数を設定した場合は設定値が優先される
- **WHEN** 祝日の日付に対してLocalStorageに必要人数が保存されている
- **THEN** デフォルト値（0）ではなく保存されている値が返される

---

### 実装ノート

- `src/types/index.ts` の `DayCategory` 型に `'holiday'` を追加する
  - 変更後: `'weekday' | 'saturday' | 'sunday' | 'holiday'`
- `src/types/index.ts` の `DEFAULT_SHIFT_SLOT_COUNTS` に祝日エントリを追加する
  - `holiday: { morning: 0, afternoon: 0, evening: 0 }`
- `src/hooks/useShiftConfig.ts` の `getDayCategory()` を `isJapaneseHoliday()` を考慮するよう更新する
  - 優先順位（上から順に評価）:
    1. `isJapaneseHoliday(date)` が true → `'holiday'`（土曜・日曜と重なる場合も祝日が最優先）
    2. 日曜 → `'sunday'`
    3. 土曜 → `'saturday'`
    4. それ以外 → `'weekday'`
  - `isJapaneseHoliday` は `src/utils/dateUtils.ts` からインポートする
