## 1. 型定義・定数の追加

- [x] 1.1 `src/types/index.ts` に曜日区分型 `DayCategory = 'weekday' | 'saturday' | 'sunday'` を追加する
- [x] 1.2 `src/types/index.ts` に `DEFAULT_SHIFT_SLOT_COUNTS: Record<DayCategory, Record<TimeSlot, number>>` 定数を追加する（平日6-6-1、土曜2-2-0、日曜0-0-0）

## 2. シフト枠デフォルト値の実装（TDD）

- [x] 2.1 `src/hooks/useShiftConfig.test.ts` を新規作成し、未設定の平日・土曜・日曜それぞれに対してデフォルト値が返されることを検証するテストを書く（Red）
- [x] 2.2 `src/hooks/useShiftConfig.test.ts` に設定済みの日付はデフォルト値より保存値が優先されることを検証するテストを書く（Red）
- [x] 2.3 `src/hooks/useShiftConfig.ts` の `getRequiredCount` に `date-fns` の `getDay` / `parseISO` を使った曜日判定とデフォルト値フォールバックを実装する（Green）
- [x] 2.4 テストがすべて通ることを確認する

## 3. 駐車場共有ロジックの実装（TDD）

- [x] 3.1 `src/utils/shiftUtils.test.ts` に「同一スタッフが同一日に複数時間帯でアサイン済みの場合、既存の枠が返される」テストを追加する（Red）
- [x] 3.2 `src/utils/shiftUtils.ts` の `assignParking` のシグネチャに `staffId?: string` を追加し、同一スタッフの既存枠を先に探す処理を実装する（Green）
- [x] 3.3 `src/utils/shiftUtils.test.ts` の既存テスト（`staffId` 引数なしの呼び出し）が引き続き通ることを確認する
- [x] 3.4 テストがすべて通ることを確認する

## 4. アサインフックの修正（TDD）

- [x] 4.1 `src/hooks/useAssignments.test.ts` に「同一スタッフが同一日に午前→午後の順でアサインした場合、午後も同じ駐車場枠が割り当てられる」テストを追加する（Red）
- [x] 4.2 `src/hooks/useAssignments.ts` の `addAssignment` 内で `assignParking` 呼び出しに `staffId` を渡すよう修正する（Green）
- [x] 4.3 テストがすべて通ることを確認する

## 5. 最終確認

- [x] 5.1 `bun run build` を実行してビルドエラーがないことを確認する
