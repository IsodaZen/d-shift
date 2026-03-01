## 1. テスト作成（Red フェーズ）

- [x] 1.1 `shiftOptimizer.evaluate.test.ts` に「希望休を考慮した調整済み上限で公平性母分散が0になる」テストを追加（調整済み上限=17・実出勤10のスタッフAと調整済み上限=20・実出勤13のスタッフBで分散=0を確認）
- [x] 1.2 `shiftOptimizer.evaluate.test.ts` に「ヘルプスタッフは公平性計算から除外される」テストを追加（通常スタッフAのみ計算に含まれることを確認）
- [x] 1.3 `shiftOptimizer.ts` の `toInternalState()` が返す `weeklyCapacity` を検証するテストを追加（期間内希望休3日分が差し引かれることを確認）
- [x] 1.4 `toInternalState()` の `weeklyCapacity` テストに「期間外希望休は差し引かれない」ケースを追加
- [x] 1.5 `toInternalState()` の `weeklyCapacity` テストに「希望休数 > 週上限合計でも0以上」の境界値ケースを追加
- [x] 1.6 `bun run test` を実行し、追加したテストが失敗（Red）することを確認

## 2. 実装（Green フェーズ）

- [x] 2.1 `src/utils/shiftOptimizer.ts` の `toInternalState()` で `preferredDayOffDates` の計算を `weeklyCapacity` の計算より前に移動する
- [x] 2.2 `toInternalState()` で期間内希望休日数を計算する（`periodDates` に含まれる日付のみカウント）
- [x] 2.3 `weeklyCapacity` を `Math.max(0, weeks * s.maxWeeklyShifts - preferredDayOffCountInPeriod)` で計算するよう変更する
- [x] 2.4 `bun run test` を実行し、追加したテストがすべて通過（Green）することを確認

## 3. リファクタリング・コメント更新

- [x] 3.1 `toInternalState()` に `weeklyCapacity` が「調整済み上限」であることを説明するコメントを追加する
- [x] 3.2 `bun run test` を実行し、既存テストも含め全テストが通過することを確認
