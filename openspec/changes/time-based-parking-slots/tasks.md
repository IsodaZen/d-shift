## タスクリスト

### Phase 1: テスト追加（Red）

- [x] `src/utils/shiftUtils.test.ts` に時間帯ベース共有の新規テストを追加する（Red）
  - 「AMのみのスタッフがA1を使用している状態で、PMのみのスタッフがA1を取得できる」
  - 「同一時間帯に別スタッフがA1を使用している場合、A1ではなくA2が割り当てられる」
  - 「同一スタッフが同一日のAM・PM両方に出勤する場合、PM時も同じスロットを再利用する」
  - 「全スロットが同一時間帯に埋まっている場合はnullを返す」

---

### Phase 2: `assignParking` 関数の変更（Green）

- [x] `src/utils/shiftUtils.ts` の `assignParking` 関数に `timeSlot: TimeSlot` 引数を追加する（Green）
  - シグネチャ: `assignParking(date, timeSlot, allSpots, existingAssignments, staffId?)`
  - 「使用中スロット」の計算を `a.timeSlot === timeSlot` でフィルタリングするよう変更する
  - 同一スタッフ・同一日の再利用ロジックは変更しない

---

### Phase 3: 呼び出し元の更新（Green）

- [x] `src/hooks/useAssignments.ts` の `addAssignment` 内で `assignParking` 呼び出し時に `timeSlot` を渡す（Green）

- [x] `src/utils/autoShiftGenerator.ts` の `generateAutoShift` 内で `assignParking` 呼び出し時に適切な `timeSlot` を渡す（Green）
  - 事前チェック用呼び出しでは、スタッフが最初にアサインされる時間帯（`availableSlots` のうち `remaining > 0` の先頭）を使用する

---

### Phase 4: 動作確認

- [x] `bun run test` を実行し、全テストがパスすることを確認する
- [x] `bun run build` を実行し、エラーなくビルドが完了することを確認する
