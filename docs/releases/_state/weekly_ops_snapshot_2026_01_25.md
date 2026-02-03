# Weekly Ops Snapshot: 2026-01-25

**Status:** STEADY-STATE GA
**Week:** 2026-W04
**Operator:** Jules

---

## Signal Action Review — Decisions

| Signal | Status | Owner | Decision |
| :--- | :--- | :--- | :--- |
| **Code Health** (Lint) | RED | @acme/platform-core | **FIX** |
| **CI Health** (Webapp Tests) | RED | @acme/ops-team | **FIX** |

## FIX Kickoff & Handoffs

| Signal | Owner | Scope | Success Criteria | SLA | Evidence Location |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Code Health** (Lint) | @acme/platform-core | Restore `pnpm lint` pass on root & packages. Fix dependencies (chalk/eslint). | `pnpm lint` exits 0 | 24h | PR Link + CI Log |
| **CI Health** (Webapp Tests) | @acme/ops-team | Fix `apps/webapp` test suite compatibility with React 19 & Jest presets. | `pnpm test` in `apps/webapp` exits 0 | 24h | PR Link + CI Log |

## Mid-Cycle FIX Status

| Signal | Owner | Progress status | SLA risk | Evidence link or PENDING | Escalation (if any) |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Code Health** (Lint) | @acme/platform-core | `IN PROGRESS` | **ON TRACK** | [Branch origin/claude/fix-typecheck-deps-Ahlu8](https://github.com/BrianCLong/summit/tree/claude/fix-typecheck-deps-Ahlu8) | None |
| **CI Health** (Webapp Tests) | @acme/ops-team | `IN PROGRESS` | **ON TRACK** | [Branch origin/feat/comprehensive-test-suite-8328666290994426204](https://github.com/BrianCLong/summit/tree/feat/comprehensive-test-suite-8328666290994426204) | None |
