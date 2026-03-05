# Runbook: React Practices Gate

## Commands

- `pnpm react:report` runs all checks and writes deterministic report artifacts.
- `pnpm react:analyze` runs only boundary analysis.
- `pnpm react:validate` runs only cache/streaming validation.

## CI Triage Flow

1. Open `reports/react-best-practices/report.json` and identify `ruleId`.
2. For `RBP-001`, remove server->client imports or move the consuming file behind `'use client'`.
3. For `RBP-002`, add explicit caching strategy (`revalidate`, `dynamic`, `fetchCache`, or fetch cache options).
4. For `RBP-003`, add `<Suspense>` or route-level `loading.tsx` for async route boundaries.
5. Re-run `pnpm react:report` until zero violations.

## Temporary Override

Use a short-lived source code allowlist comment only with linked issue and removal date. Default posture is deny-by-default in CI.

## SLO

- Critical boundary violations on `main`: `0`.
