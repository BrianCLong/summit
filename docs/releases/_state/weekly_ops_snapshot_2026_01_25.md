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
