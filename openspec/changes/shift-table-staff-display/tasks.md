## 1. テスト追加（Red）

- [ ] 1.1 ShiftTable.test.tsx にスタッフ名列への availableSlots 表示テストを追加する（通常スタッフ）
- [ ] 1.2 ShiftTable.test.tsx に availableSlots が空の場合は全時間帯ラベルを表示するテストを追加する
- [ ] 1.3 ShiftTable.test.tsx にヘルプスタッフ名列への availableSlots 表示テストを追加する
- [ ] 1.4 ShiftTable.test.tsx にアサイン有りセルに◯が表示されるテストを追加する
- [ ] 1.5 ShiftTable.test.tsx のヘルプスタッフのアサインバッジテストを◯表示に更新する

## 2. 実装変更（Green）

- [ ] 2.1 ShiftTable.tsx の通常スタッフ名列に availableSlots ラベルを追加表示する
- [ ] 2.2 ShiftTable.tsx のヘルプスタッフ名列に availableSlots ラベルを追加表示する
- [ ] 2.3 ShiftTable.tsx の通常スタッフセルの TimeSlotBadge を◯に置き換える
- [ ] 2.4 ShiftTable.tsx のヘルプスタッフセルの TimeSlotBadge を◯に置き換える

## 3. テスト確認（Verify）

- [ ] 3.1 bun run test を実行して全テストが通ることを確認する
