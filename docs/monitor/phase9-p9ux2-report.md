# P9-UX2 Report: user home fixed header overlap fix

## Ticket
- `P9-UX2`
- Branch: `codex/phase9-p9ux2-userhome-header-offset`

## Changed Files
- `src/app/user/[userId]/home/page.module.css`

## What Changed
- Updated mobile-only top offset on user home container:
  - before: `padding-top: calc(env(safe-area-inset-top, 0px) + 76px)`
  - after: `padding-top: calc(env(safe-area-inset-top, 0px) + 112px)`
- Added short comment to clarify iPhone PWA/Safari intent.

## Why This Fix
- `UserHeader` is fixed and includes safe-area top padding.
- The mobile override (`+76px`) was smaller than the effective fixed header height in iPhone PWA, so the first card could slide under the header.
- This patch is limited to `user home` only, as requested, and does not change global layout tokens.

## Scope Guardrails
- No changes to `globals.css`
- No route/data/auth/firestore/functions changes
- No unrelated page edits

## Verification
- `npm run lint` => success
- `npm run build` => success

## Manual Check Targets (post-merge)
- `/user/[userId]/home`: first white card no longer overlaps header
- logout button and first card do not overlap on iPhone PWA / Safari width
