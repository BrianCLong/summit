# Perf Budgets — RepoFlow (Vercel v0 “90% Problem” Subsumption)

## Summit Readiness Assertion
This performance budget is governed by the Summit Readiness Assertion and inherits its enforcement posture. See `docs/SUMMIT_READINESS_ASSERTION.md` for the authoritative mandate.

## Budgets
- Sandbox run wall time: ≤ 120s per agent run.
- Memory: ≤ 1.5GB in CI sandbox.
- Evidence artifacts size: ≤ 5MB per evidence ID.

## Enforcement
- CI step: `pnpm summit:repoFlow:profile`.
- Fail the build if artifact size exceeds budget.

## Deferred Pending Validation
- Memory enforcement via sandbox profile and runtime limits.
