## Context

現在、スタッフ管理に関わるUIが2ページに分散している：
- **StaffPage（`/`）**: スタッフの登録・編集・削除・並び替え
- **SettingsPage（`/settings/dayoff`）**: 希望休の登録・編集・スタッフ別サマリー

希望休はスタッフ単位で管理するため、本来スタッフページとの親和性が高い。本変更では、StaffPage の各スタッフアイテムに「希望休」ボタンを追加し、クリックで対象スタッフの希望休管理ビューに切り替える。

## Goals / Non-Goals

**Goals:**
- StaffPage の各スタッフアイテムに「希望休」ボタンを追加する
- 「希望休」ボタンクリックで、対象スタッフの希望休管理ビューに StaffPage 内でビュー切り替えする
- 希望休管理ビューではスタッフ選択ドロップダウンを設けず、対象スタッフを固定する
- SettingsPage から dayoff タブおよび関連 state・handler を削除する
- 既存の希望休ロジック（`useDayOffs`・`DayOffCalendar`・`syncDayOffs`）は変更しない

**Non-Goals:**
- URL ルーティングへの希望休ビュー連動
- タブUIの導入
- 希望休の UX・ロジック変更
- SettingsPage の他タブへの影響

## Decisions

### 1. ビュー切り替えの実装方式：既存の mode パターンを拡張

**決定**: 既存の `FormMode = { type: 'add' } | { type: 'edit'; staff: Staff } | null` に `{ type: 'dayoff'; staff: Staff }` を追加する。

**理由**: StaffPage はすでに mode state でビューを切り替える実装パターンを持っている（スタッフ追加・編集時に全体を差し替え）。同パターンを拡張するだけでよく、新規アーキテクチャが不要。`staff` を mode に含めることで、スタッフ選択ドロップダウンが不要になり、UXがシンプルになる。

**代替案**: タブUIの導入 → 2タブ切り替えでは「全スタッフの希望休を一覧から選択」というフローが必要になりドロップダウンが残る。per-staff ボタンのほうがUXが明快なため不採用。

### 2. 希望休管理 state・handler の移植方針：StaffPage に直接記述

**決定**: `SettingsPage.tsx` から dayoff 関連の state（`calendarSelectedDates`、`syncMessage` 等）と handler（`handleCalendarStaffChange`、`handleSyncDayOffs` 等）を StaffPage.tsx に移植する。ただし `calendarStaffId` は不要（mode.staff.id で代替）。共通コンポーネント化は行わない。

**理由**: 希望休管理ビューは StaffPage 専用となるため、抽象化のメリットがない。変更範囲を最小化できる。

### 3. 希望休ビューのヘッダー

**決定**: 「{スタッフ名} の希望休」を見出しとして表示し、「戻る」ボタンでスタッフ一覧に戻る。

**理由**: 編集フォームと同じUI構造を踏襲することで一貫性を保つ。

## Risks / Trade-offs

- **StaffPage のファイルサイズ増加**: 希望休関連 state・handler が追加されるため StaffPage.tsx が肥大化する → 現時点では許容範囲。将来的なコンポーネント分割は別タスクで対応
- **SettingsPage のテスト削除**: dayoff タブのテストケースを削除するため、テストカバレッジが一時的に下がる → StaffPage のテストで同等のカバレッジを確保する

## Migration Plan

1. StaffPage に「希望休」ボタンと希望休管理ビューを追加（テスト先行）
2. SettingsPage から dayoff タブ関連コードを削除（テスト先行）
3. 仕様ファイル（specs）を更新

ロールバック戦略：本変更は LocalStorage スキーマを変更しないため、コードのロールバックのみで対応可能。

## Open Questions

（なし）
