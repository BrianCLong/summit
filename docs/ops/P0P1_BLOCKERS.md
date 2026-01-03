# P0/P1 Blockers

**Last Updated:** 2026-01-03
**Status:** ACTIVE

This document enumerates all P0 (merge-blocking) and P1 (stability) risks currently present in the repository. These are verified failures, not theoretical risks.

| ID | Severity | Symptom | Scope | Root Cause | Fix Owner | Verification Command | Status |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| BLK-001 | **P0** | `error TS6059: File ... is not under 'rootDir'` | `apps/gateway` | `libs/flags` and `libs/audit` are imported from outside `apps/gateway/src` but `tsconfig.json` `rootDir` is restrictive. | Claude | `pnpm --filter @intelgraph/gateway build` | **OPEN** |
| BLK-002 | **P0** | `TypeError: pify(...).bind is not a function` | `apps/mobile-interface` | `next build` fails. Likely a dependency issue or misconfiguration in Next.js build process. | Claude | `pnpm --filter @intelgraph/mobile-interface build` | **OPEN** |
| BLK-003 | **P1** | `Executable doesn't exist at ...` | `apps/a11y-lab` | Playwright browsers are not installed in the environment. | Ops/Infra | `pnpm exec playwright install` | **OPEN** |
| BLK-004 | **P1** | Zod Version Mismatch (v3 vs v4) | `server` vs `apps/web` | `server` uses `zod@3.25.76`, `apps/web` uses `zod@4.2.1`. Potential for validation behavior drift. | Codex | `pnpm list -r zod` | **OPEN** |
| BLK-005 | **P2** | Mixed Test Runners | Repo-wide | Root uses `jest`, `apps/web` uses `vitest`, `server` uses `jest` (but memory claims `node:test` only). | Jules | `pnpm ops:readiness` | **OPEN** |

## Detailed Analysis

### BLK-001: `apps/gateway` TS Config
The `apps/gateway` package fails to build because it imports files from `libs/` which are outside its `rootDir`.
**Fix Strategy:** Update `apps/gateway/tsconfig.json` to include `../../libs` in `include` or adjust `rootDir` to `../../`. Ideally, use Project References.

### BLK-002: `apps/mobile-interface` Next.js Build
The build fails with a runtime error in the build process `pify(...).bind is not a function`. This often indicates a bad dependency version or a transpilation issue in `next.config.js`.

### BLK-003: Playwright Browsers
The `apps/a11y-lab` tests require Playwright browsers. In CI, these should be cached or installed. Locally, `pnpm exec playwright install` fixes it.

### BLK-004: Zod Version Mismatch
`zod` v4 is a major breaking change. Having `server` on v3 and `apps/web` on v4 means shared types might break or behave differently.
**Recommendation:** Upgrade `server` to v4 or downgrade `apps/web` to v3 (v3 is safer for stability).
