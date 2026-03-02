## 1. テスト追加（Red）

- [ ] 1.1 `ShiftTable.isLocked.test.tsx` にヘルプスタッフの固定インジケーター表示テストを追加する（`isLocked: true` のアサインがある場合にインジケーターが表示されること）
- [ ] 1.2 `ShiftTable.isLocked.test.tsx` にヘルプスタッフの固定インジケーター非表示テストを追加する（`isLocked: false` のみ・アサインなしの場合にインジケーターが表示されないこと）
- [ ] 1.3 `ShiftTable.isLocked.test.tsx` にヘルプスタッフの混在セルでインジケーターが表示されるテストを追加する
- [ ] 1.4 `ShiftTable.isLocked.test.tsx` にヘルプスタッフの固定トグルボタン表示テストを追加する（アサインあり/なし）
- [ ] 1.5 `ShiftTable.isLocked.test.tsx` にヘルプスタッフのトグルボタンクリックで `onSetCellLocked` が呼ばれるテストを追加する（非固定→固定・全固定→非固定・混在→全固定）
- [ ] 1.6 `ShiftTable.isLocked.test.tsx` にトグルボタンのクリックが時間帯選択モーダルを開かないテストを追加する（`stopPropagation` の確認）
- [ ] 1.7 `bun run test` を実行して、追加したテストが失敗することを確認する（Red）

## 2. 実装（Green）

- [ ] 2.1 `ShiftTable.tsx` のヘルプスタッフ行の `<td>` 内に、既存の `hasCellLocked`・`isAllCellLocked`・`handleToggleCellLocked` を再利用して固定インジケーターとトグルボタンを追加する
- [ ] 2.2 トグルボタンのクリックに `e.stopPropagation()` を追加して時間帯選択モーダルとの干渉を防ぐ（`handleToggleCellLocked` は既に `e.stopPropagation()` を呼んでいるため、既存関数をそのまま使用する）
- [ ] 2.3 `bun run test` を実行して、追加したテストがすべて通ることを確認する（Green）

## 3. 品質確認・コミット

- [ ] 3.1 `impl-quality-reviewer` エージェントを実行してCRITICAL/WARNINGがないことを確認する
- [ ] 3.2 CRITICAL/WARNINGがある場合は修正してから再確認する
- [ ] 3.3 変更をコミットしてブランチにプッシュする
