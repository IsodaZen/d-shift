## Context

シフト管理ツールの既存実装への追加変更。以下の2つの問題を解決する。

1. `useShiftConfig` の `getRequiredCount` は未設定の日付・時間帯に `0` を返すため、毎週全枠を手動入力する必要がある
2. `assignParking` は同一日の「使用済み枠」を単純に収集するため、同一スタッフが午前・午後の両方に出勤すると2枠を消費してしまう

既存のデータ構造（`ShiftSlotConfig[]`、`ShiftAssignment[]`）はそのまま維持し、読み取り・割り当てロジックのみを変更する。

## Goals / Non-Goals

**Goals:**
- 未設定日の `getRequiredCount` が曜日に応じたデフォルト値を返す
- 同一スタッフ・同一日に既存の駐車場割り当てがある場合、新たな枠を消費せず既存の枠を再利用する
- 既存の設定済みデータは一切変更しない

**Non-Goals:**
- デフォルト値をユーザーが設定画面から変更できる機能（今回は定数として固定）
- 時間帯を超えた駐車場共有（同一スタッフの夕方のみ出勤は別途枠を取得する）
- 既存LocalStorageデータの一括マイグレーション

## Decisions

### D1: デフォルト値の配置 — `src/types/index.ts` に定数定義

**選択**: `DEFAULT_SHIFT_SLOT_COUNTS` として `Record<曜日区分, Record<TimeSlot, number>>` を `types/index.ts` に定義する。

- **理由**: `DEFAULT_PARKING_CONFIG` と同じパターンで一元管理できる。フックに直接書くより変更・テストがしやすい。
- **曜日区分の型**: `'weekday' | 'saturday' | 'sunday'` — シンプルで意図が明確。祝日対応は Non-Goals のため不要。

```
DEFAULT_SHIFT_SLOT_COUNTS = {
  weekday:  { morning: 6, afternoon: 6, evening: 1 },
  saturday: { morning: 2, afternoon: 2, evening: 0 },
  sunday:   { morning: 0, afternoon: 0, evening: 0 },
}
```

### D2: デフォルト値の適用場所 — `getRequiredCount` のフォールバック

**選択**: `useShiftConfig` の `getRequiredCount` 内で、LocalStorageに設定がない場合のフォールバックとしてデフォルト値を返す。`date-fns` の `getDay()` で曜日を判定する。

- **理由**: 呼び出し側は変更不要。既存の `setRequiredCount` でUserが明示的に設定した値は上書きされない（LocalStorageに存在する値が常に優先される）。
- **検討した代替案**:
  - 月初や週初に自動でLocalStorageに書き込む: 既存データを汚染するリスクがあり、Non-Goals と矛盾する
  - UIコンポーネント側でフォールバック: 複数箇所に分散するため不採用

### D3: 駐車場共有の実装 — `assignParking` に `staffId` を追加

**選択**: `assignParking(date, allSpots, existingAssignments, staffId?)` のシグネチャに `staffId` を追加する。同一スタッフの既存割り当てを先にチェックし、駐車場枠があればそれを返す。

```
// 優先順位:
// 1. 同一staffId・同一日・既存parkingSpotがあればその値を返す
// 2. なければ通常の空き枠検索（既存ロジック）
```

- **理由**: 最小変更。既存の `assignParking` のロジックを壊さず、オプショナル引数として追加することで後方互換性を保つ。
- **`useAssignments.addAssignment`**: `staffId` を `assignParking` に渡すよう変更する（既に引数として受け取っている）。

## Risks / Trade-offs

- **駐車場なしで午前に登録→午後に駐車場ありで登録した場合**: 午前のアサインには `parkingSpot: null` が記録されているため、再利用できず新規枠が割り当てられる。ただし、駐車場利用有無はスタッフ属性として固定されているため、このケースは実運用上発生しない。
- **`date-fns` への依存追加**: すでに `shiftUtils.ts` で `date-fns` を使用しているため、新規依存ではない。`parseISO` と `getDay` を組み合わせる。
- **既存テストの更新**: `assignParking` のシグネチャ変更に伴い、既存テストの引数を更新する必要がある。振る舞いの変化（2枠→1枠）もテストで明示する。
