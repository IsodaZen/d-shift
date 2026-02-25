## 1. 型定義の更新

- [ ] 1.1 `ShiftAssignment` に `isLocked: boolean` フィールドを追加するテストを書く（Red）
- [ ] 1.2 `src/types/index.ts` の `ShiftAssignment` 型に `isLocked: boolean` を追加する（Green）

## 2. useAssignments フックの更新

- [ ] 2.1 旧データ（`isLocked` なし）を読み込んだとき `isLocked: false` にフォールバックするテストを書く（Red）
- [ ] 2.2 旧データの後方互換処理を `useAssignments` 内で実装する（Green）
- [ ] 2.3 `addAssignment` が `isLocked: true` でアサインを保存するテストを書く（Red）
- [ ] 2.4 `addAssignment` の実装に `isLocked: true` を追加する（Green）
- [ ] 2.5 `bulkSetAssignments` が `isLocked: true` のアサインを保持するテストを書く（Red）
- [ ] 2.6 `bulkSetAssignments` を固定アサイン保護ロジックに変更する（Green）

## 3. 自動生成アルゴリズムの更新

- [ ] 3.1 固定スタッフ・日付をスキップするテストを書く（Red）
- [ ] 3.2 `generateAutoShift` に `lockedStaffDates: Set<string>` パラメータを追加してスキップロジックを実装する（Green）
- [ ] 3.3 固定アサインの必要人数への算入（remaining のデクリメント）テストを書く（Red）
- [ ] 3.4 固定アサインを `remaining` カウントに算入する処理を実装する（Green）
- [ ] 3.5 固定アサインが必要人数を超過しても追加生成しないテストを書く（Red）
- [ ] 3.6 超過ケースの境界条件を実装で対応する（Green）

## 4. 自動生成の呼び出し側（bulkSet連携）の更新

- [ ] 4.1 自動生成実行時に固定スタッフ・日付を収集して `generateAutoShift` に渡すテストを書く（Red）
- [ ] 4.2 自動生成ページ（またはフック）で `lockedStaffDates` を収集し `generateAutoShift` に渡す実装をする（Green）

## 5. setCellLocked フックの追加

- [ ] 5.1 `setCellLocked(staffId, date, isLocked)` で対象セルの全アサインが更新されるテストを書く（Red）
- [ ] 5.2 `useAssignments` に `setCellLocked` を実装する（Green）
- [ ] 5.3 混在セル（固定+非固定）に対して `setCellLocked(true)` で全アサインが固定化されるテストを書く（Red）
- [ ] 5.4 混在セルの固定化を実装で対応する（Green）

## 6. シフト表UIの更新

- [ ] 6.1 固定アサインのセルに固定インジケーターが表示されることのテストを書く（Red）
- [ ] 6.2 シフト表のセルコンポーネントに固定インジケーター（鍵アイコン）を追加する（Green）
- [ ] 6.3 混在セル（固定あり + 非固定あり）でもインジケーターが表示されることを確認する（Green）
- [ ] 6.4 アサインが存在するセルにトグルボタンが表示されることのテストを書く（Red）
- [ ] 6.5 シフト表のセルコンポーネントにトグルボタンを追加し `setCellLocked` を呼び出す実装をする（Green）
- [ ] 6.6 アサインが存在しないセルにはトグルボタンが表示されないことを確認する（Green）
- [ ] 6.7 トグルボタン押下後に固定インジケーターの表示状態が反転することを確認する（Green）

## 8. リファクタリング・仕上げ

- [ ] 8.1 型・フック・アルゴリズム全体のリファクタリング（テストが全通過していることを確認）
- [ ] 8.2 全テストが通ることを確認する（`bun test`）
- [ ] 8.3 ビルドが通ることを確認する（`bun run build`）
