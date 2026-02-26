## Context

現在、スタッフ管理に関わるUIが2ページに分散している：
- **StaffPage（`/`）**: スタッフの登録・編集・削除・並び替え
- **SettingsPage（`/settings/dayoff`）**: 希望休の登録・編集・スタッフ別サマリー

希望休はスタッフ単位で管理するため、本来スタッフページとの親和性が高い。本変更では StaffPage にタブUIを導入し、希望休管理を統合する。

## Goals / Non-Goals

**Goals:**
- StaffPage にシンプルなタブUI（スタッフ一覧 / 希望休）を追加する
- 希望休管理UI一式（カレンダーモード・フォールバック・スタッフ別サマリー）を StaffPage の希望休タブへ移植する
- SettingsPage から dayoff タブおよび関連 state・handler を削除する
- 既存の希望休ロジック（`useDayOffs`・`DayOffCalendar`・`syncDayOffs`）は変更しない

**Non-Goals:**
- URL ルーティングへのタブ連動（`/dayoff` などのサブパス化）は行わない（シンプルな in-page タブとする）
- 希望休の UX・ロジック変更
- SettingsPage の他タブへの影響

## Decisions

### 1. タブUIの実装方式：in-page state（URLサブパスなし）

**決定**: StaffPage 内の `useState` でアクティブタブを管理し、URL には反映しない。

**理由**: SettingsPage のタブは複数の独立した設定カテゴリのため URL 連動が有用だが、StaffPage のタブは「スタッフ一覧」と「希望休」という密接に関連した2機能のみ。URLサブパスを導入すると App.tsx のルート定義・AppHeader のタイトル・screen-navigation 仕様の変更が広範に及ぶため、コストに見合わない。

**代替案**: `/` と `/dayoff` を別ルートにする → ルート追加・リダイレクト処理・ナビゲーションアイコンの変更が必要になり複雑化するため不採用。

### 2. 希望休管理 state・handler の移植方針：StaffPage に直接記述

**決定**: `SettingsPage.tsx` から dayoff 関連の state（`dayOffStaffId`、`calendarStaffId` 等）と handler（`handleCalendarStaffChange`、`handleSyncDayOffs` 等）をそのまま `StaffPage.tsx` に移植する。共通コンポーネント化は行わない。

**理由**: 希望休管理 UI は StaffPage 専用となるため、抽象化のメリットがない。ロジックをそのままコピーすることで変更範囲を最小化できる。

### 3. タブの初期表示：スタッフ一覧タブ

**決定**: ページ初期表示では「スタッフ一覧」タブをアクティブにする。

**理由**: 既存のフロー（スタッフ登録 → シフト期間設定）を維持するため。

## Risks / Trade-offs

- **SettingsPage のテスト削除**: dayoff タブのテストケースを削除するため、テストカバレッジが一時的に下がる → StaffPage のテストで同等のカバレッジを確保する
- **StaffPage のファイルサイズ増加**: 希望休関連 state・handler が追加されるため StaffPage.tsx が肥大化する → 現時点では許容範囲。将来的なコンポーネント分割は別タスクで対応
- **フロー誘導 CTAの表示タブ**: CTAはスタッフ一覧タブにのみ表示する。希望休タブに誤って遷移していても CTA が見えないため、操作フローを見失う可能性がある → 軽微なリスクとして許容

## Migration Plan

1. StaffPage にタブUIと希望休管理コードを追加（テスト先行）
2. SettingsPage から dayoff タブ関連コードを削除（テスト先行）
3. 仕様ファイル（specs）を更新

ロールバック戦略：本変更は LocalStorage スキーマを変更しないため、コードのロールバックのみで対応可能。

## Open Questions

（なし）
