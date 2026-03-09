# RL Lesson App - Monitor/Coder Operating Guide

## 0. Project Status
- This repository is a **production app already published** (GitHub + Firebase + Vercel configured).
- Default policy: **non-destructive, minimal-diff, no speculative rewrites**.
- Any change that may affect data integrity, access control, or routing must be treated as high risk.

## 1. Project Overview
- Frontend: Next.js App Router (`src/app`)
- Runtime data access: client-side Firestore SDK
- Backend: Firebase Functions (`functions/src/index.ts`) for push notification trigger
- Main domains:
  - `admin`: schedule management
  - `user`: schedule browse/participation/booking/mypage

## 2. Roles
### Monitor (design/review owner)
- Owns discovery, scope definition, impact analysis, and rollout plan.
- Defines implementation phases and acceptance criteria.
- Approves or rejects large refactors, schema changes, and auth/rules changes.
- Performs post-implementation review with regression/security focus.

### Coder (implementation owner)
- Implements only approved scope from Monitor tickets.
- Keeps changes minimal and localized.
- Must not alter architecture, schema, routing, or rules beyond approved ticket scope.
- Must report any unexpected repo changes or hidden dependencies before continuing.

## 3. Workflow
1. Monitor creates/updates:
   - current-state summary
   - target-state diff
   - phase tickets
   - risk checklist
2. Coder implements one phase at a time.
3. Coder runs required checks and provides evidence.
4. Monitor reviews for regressions/security/data consistency.
5. Only then proceed to next phase.

## 4. Hard Guardrails (Do Not Break)
- Do not perform broad rewrites when a focused patch is enough.
- Do not remove existing routes without explicit approval.
- Do not change Firestore document shape silently.
- Do not add unaudited public write paths.
- Do not bypass monitor approval for high-impact changes:
  - auth model change
  - Firestore Rules change
  - collection/document schema change
  - URL structure change
  - migration/backfill scripts

## 5. Scope Control Rules
- Work only on files needed for the current ticket.
- No opportunistic cleanup in unrelated modules.
- If you find unrelated bugs, log them separately; do not bundle them without approval.
- Keep PR/commit scope single-purpose.

## 6. Type and Code Rules
- TypeScript strict mode must remain passing.
- Prefer explicit types for Firestore document shapes used in each screen.
- Avoid `any`; if unavoidable, isolate and document why.
- Keep data parsing/formatting centralized where practical (utility extraction over duplication when approved).

## 7. Naming Rules
- Use clear domain names:
  - `teacherId`, `scheduleId`, `userId`, `isAbsent`, `classType`, `lessonType`
- Keep collection names consistent with existing production schema unless migration is approved.
- New fields must use lowerCamelCase and be documented in ticket and PR.

## 8. UI/CSS Rules
- Preserve current UX behavior unless ticket requires change.
- Avoid global CSS side effects; prefer existing module CSS pattern.
- Keep mobile behavior intact (footer nav and calendar usability are critical paths).

## 9. Firebase / Firestore / Auth / Rules Rules
- Current app auth is localStorage-based pseudo-auth; this is security-sensitive.
- Firestore Rules are not versioned in this repo currently; treat rules changes as controlled manual ops.
- For any write-path change, define required Rules update before coding.
- For any query-shape change, check index impact and document required index updates.
- Functions changes require `functions` build/lint validation before deploy.

## 10. Testing and Verification Minimum
- Frontend checks:
  - `npm run lint`
  - `npm run build`
- Functions checks (when touched):
  - `npm --prefix functions run build`
  - `npm --prefix functions run lint` (if lint config remains usable)
- Manual critical flow checks (required):
  - admin select -> add/edit/delete schedule
  - user schedule browse -> participate/absent toggle
  - trial booking submission
  - mypage update (name/myTeachers/notification setup)

## 11. Pre-Deploy Checklist
- Confirm target environment (production/staging) and project IDs.
- Confirm no route-breaking change.
- Confirm data compatibility (old docs still readable).
- Confirm Rules/index/manual steps are prepared.
- Confirm rollback path (revert commit and/or toggle behavior path).

## 12. Branch / PR Conventions
- Branch naming: `codex/<scope>-<short-description>`
- One logical phase per PR.
- PR description must include:
  - objective
  - changed files
  - risk/impact
  - verification evidence
  - manual ops required

## 13. Manual Operation Logging Rule
- Any step requiring console/CLI outside code (Firebase console, Vercel dashboard, secret/env set, rule publish, index creation) must be recorded in:
  - what was changed
  - why
  - exact target environment
  - operator and timestamp

## 14. Monitor Approval Gates
- Coder must stop and request monitor approval before:
  - schema migrations/backfills
  - Rules policy changes
  - route contract changes
  - deleting existing features
  - cross-cutting refactor across admin and user domains

## 15. Definition of Done (Per Phase)
- Ticket acceptance criteria satisfied.
- Lint/build pass.
- Manual critical flows validated for touched areas.
- Risks and follow-ups documented.
- No unapproved scope expansion.
