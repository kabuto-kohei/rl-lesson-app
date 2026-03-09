# Phase9 P9-UX1-fix Report

## 1. 変更ファイル一覧
- `package.json`
- `package-lock.json`
- `src/app/globals.css`
- `src/app/component/Calendar/Calendar.tsx`
- `src/app/component/Calendar/Calendar.module.css`
- `src/app/component/LoadingProgress/LoadingProgress.tsx` (new)
- `src/app/component/LoadingProgress/LoadingProgress.module.css` (new)
- `src/app/component/motion/FadeInSection.tsx` (new)
- `src/app/admin/home/adminAllreservation/page.tsx`
- `src/app/admin/home/adminAllreservation/AdminAllReservation.module.css`
- `src/app/admin/home/adminMypage/page.tsx`
- `src/app/admin/home/adminMypage/AdminMypage.module.css`
- `src/app/user/[userId]/home/userClassSelect/page.tsx`
- `src/app/user/[userId]/home/userClassSelect/page.module.css`
- `src/app/user/[userId]/home/userAllreservation/page.tsx`
- `src/app/user/[userId]/home/userAllreservation/page.module.css`
- `src/lib/date/monthDateRange.ts` (new)
- `src/lib/firestore/chunkArray.ts` (new)
- `src/lib/session/userSession.ts` (new)
- `src/lib/session/guestSession.ts` (new)
- `src/lib/session/resolveUserId.ts` (new)
- `src/lib/session/resolveActorIdentity.ts` (new)
- `docs/monitor/phase9-p9ux1-fix-report.md` (new)

## 2. `/tmp/rl-lesson-app-p9ux1` から採用した UI 部分
- `LoadingProgress` コンポーネント一式（ラベル + % + プログレスバー）
- `FadeInSection` コンポーネント（`motion/react` + reduced motion 対応）
- `globals.css` のレイアウト token（max width / padding / section gap / card shadow）
- `Calendar` のアクセシビリティ改善
  - 日付セルを `button` 化
  - `aria-label` / nav button の `aria-label`
- `Calendar` の見た目改善
  - 余白、セル、モバイルの詰まりを調整
- 4画面の CSS 再構成（余白、カード連結感、transition）
- 4画面への `LoadingProgress` / `FadeInSection` 差し込み

## 3. 維持した承認済みロジック
- `adminAllreservation`
  - 月単位 `lessonSchedules` query (`date >= monthStart`, `date <= monthEnd`)
  - teacher 名解決の batched read（`documentId() in chunk`）
  - `selectedDate` 後のみ `participations` 読取
  - `teacherId` での表示絞り込みは行わず全講師表示を維持
- `adminMypage`
  - 月単位 `lessonSchedules` query を維持
  - `scheduleIds` chunk による `participations` 絞り込み維持
  - `selectedDate` 未選択時はカード非表示維持
  - `日程一覧` / `日付選択を解除` ボタンは追加していない
  - 同日再タップで解除の挙動維持
- `userClassSelect`
  - 月単位 `lessonSchedules` 読取維持
  - `participations` の `scheduleIds` chunk 読取維持
  - `actorKey ?? userId` 互換読取維持
  - `setDoc` payload の `actorKey` 維持
- `userAllreservation`
  - `actorKey ?? userId` dual-read 維持
  - batched `lessonSchedules` / `teacherId` 解決維持（`documentId() in chunk`）
  - N+1 復活なし

## 4. 不変性の根拠
- `actorKey` 維持確認
  - `src/app/user/[userId]/home/userClassSelect/page.tsx`
  - `src/app/user/[userId]/home/userAllreservation/page.tsx`
- 月単位読取維持確認
  - `src/app/admin/home/adminAllreservation/page.tsx`
  - `src/app/admin/home/adminMypage/page.tsx`
  - `src/app/user/[userId]/home/userClassSelect/page.tsx`
- batched read 維持確認
  - `where(documentId(), 'in', ids)` / `where('scheduleId', 'in', ids)` が継続

## 5. 検証結果
- `npm run lint`: 成功
- `npm run build`: 成功

## 6. 手動確認項目（実施観点）
- `adminAllreservation`
  - 初期表示で進捗バー表示
  - 日付選択後に詳細がフェード表示
  - `teacherId` query 有無で表示件数が変わらない（全講師表示）
- `adminMypage`
  - 日付未選択時は補助文言のみ
  - 同日再タップで詳細解除
  - 解除ボタンが出ていない
- `userClassSelect`
  - full-screen / block loading が進捗バー表示
  - 詳細カードは選択日でのみフェード表示
  - 参加/おやすみ導線の既存挙動維持
- `userAllreservation`
  - 初期ロードで進捗バー表示
  - 選択日詳細のフェード表示
  - おやすみトグルの既存挙動維持

## 7. 補足
- この新worktreeの基点コミットに `src/lib/*` helper が未存在だったため、承認済みロジックを維持する目的で `ec3f` 側の同一実装をそのまま最小追加しています（挙動変更なし）。
