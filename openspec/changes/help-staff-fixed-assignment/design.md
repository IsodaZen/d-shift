## Context

`ShiftAssignment` 型はすでに `isLocked: boolean` フィールドを持ち、通常スタッフのアサイン固定の仕組みは実装済みである。
- `addAssignment` は常に `isLocked: true` でアサインを保存する（手動登録は自動的に固定）
- `bulkSetAssignments` は `isLocked: true` のアサインを期間内でも保持する（自動生成による上書き保護）
- `applyAutoShift` は `lockedStaffDates`（`staffId + date`）を収集し、自動生成でそのセルをスキップする

これらのロジックはヘルプスタッフのアサインにも同様に適用されているが、**シフト表 UI** においてはヘルプスタッフ行のセルに固定インジケーター・トグルボタンが表示されていない。

## Goals / Non-Goals

**Goals:**
- ヘルプスタッフのセルに固定インジケーター（鍵アイコン）を表示する
- ヘルプスタッフのセルに固定/非固定トグルボタンを追加し、セル単位でロック状態を切り替えられるようにする
- 通常スタッフと同様に、ヘルプスタッフの固定アサインは自動生成から保護される（既存機能で対応済み）

**Non-Goals:**
- ロジック（`useAssignments.ts`・`autoShiftGenerator.ts`・`ShiftPage.tsx`）への変更（既存実装で対応済み）
- 型定義（`ShiftAssignment.isLocked`）への変更（既存で対応済み）
- ヘルプスタッフの時間帯単位でのロック（セル=スタッフ×日付 単位のトグルは通常スタッフと同一）

## Decisions

### 1. `ShiftTable.tsx` のヘルプスタッフ行セルに既存のロック UI を再利用する

**Decision**: 通常スタッフ行で使用している `hasCellLocked`・`isAllCellLocked`・`handleToggleCellLocked` を、ヘルプスタッフ行のセルにも適用する。固定インジケーターとトグルボタンのマークアップは通常スタッフ行のものをそのまま再利用する。

**Rationale**: ロジックは通常スタッフとヘルプスタッフで共通（`staffId` と `date` のみで判定）。新たなコードを追加せず、既存ロジックを適用するだけで実現できる。

**Alternative**: ヘルプスタッフ専用の固定トグル関数を作成 → 完全に重複したロジックになるため採用しない。

---

### 2. ヘルプスタッフのセルクリックとロックトグルを独立して扱う

**Decision**: ヘルプスタッフのセルクリック（時間帯選択モーダルを開く）とロックトグルボタンのクリックを別々のイベントとして扱い、`e.stopPropagation()` でセルクリックへの伝播を防ぐ（通常スタッフと同じ方針）。

**Rationale**: ヘルプスタッフのセルクリックは時間帯選択モーダルを開く必要があり、トグルボタンとセルクリックを混在させないためには `stopPropagation` が必要。通常スタッフの実装と同じパターンを踏襲する。

---

### 3. `onSetCellLocked` props の受け渡しは既存のまま変更しない

**Decision**: `ShiftTable` はすでに `onSetCellLocked?: (staffId, date, isLocked) => void` props を受け取っており、`ShiftPage` から `setCellLocked` が渡されている。ヘルプスタッフ行でも同じ `onSetCellLocked` を呼び出すだけでよい。

**Rationale**: `setCellLocked` は `staffId` + `date` の組み合わせで `ShiftAssignment` を更新するため、通常スタッフ・ヘルプスタッフの区別がなくそのまま動作する。

## Risks / Trade-offs

- **[トレードオフ] ヘルプスタッフの手動アサインは常に `isLocked: true` で作成される** → `addAssignment` の仕様どおり。ユーザーがロック解除したい場合はトグルボタンで解除できる。今回の変更でトグルボタンが追加されるため、解除が可能になる。
- **[リスク] ヘルプスタッフのロック状態が自動生成に与える影響** → 既存の `applyAutoShift` はヘルプスタッフを含むすべての `isLocked: true` アサインをスキップ対象に含めているため、追加の変更は不要。ただしヘルプスタッフのロック固定後に自動生成を実行すると、そのヘルプスタッフ・日付の組み合わせは自動生成の候補から除外される。これは意図された動作である。

## Open Questions

- なし（要件は明確であり、既存実装の UI 拡張のみで対応できる）
