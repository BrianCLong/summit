# CI Performance Budget

**Authority:** Summit Readiness Assertion (`docs/SUMMIT_READINESS_ASSERTION.md`).

## Purpose

This policy enforces deterministic CI performance budgets per workflow gate and job. Budgets are
measured from GitHub Actions metadata (run/job timing fields) and enforced on PRs and protected
branches. Violations require a time-boxed Governed Exception with owner and ticket.

## Files & Schemas

- **Budget definition:** `release/CI_PERF_BUDGET.yml`
- **Budget schema:** `schemas/ci-perf-budget.schema.json`
- **Override registry:** `.github/ci-budget-overrides.yml`
- **Override schema:** `schemas/ci-budget-overrides.schema.json`

## Stable Identifiers

Each measured unit has a stable identifier derived from:

```
<workflow_file>::<job>::<step_group?>
```

The evaluator derives this identifier from the workflow file name, job name, and optional step
group. Gates use the reserved job name `__gate__`.

## Budget Fields

- `budget_seconds_p50`: target p50 runtime for the unit.
- `budget_seconds_p95`: target p95 runtime for the unit.
- `hard_limit_seconds`: absolute cap; breaches fail immediately.
- `regression_threshold_percent`: maximum percent increase vs baseline p50/p95.
- `scope`: `PR`, `main-only`, or `release-branch-only`.
- `owner`: accountable owner for the budget.
- `ticket`: tracking ticket for updates or changes.

## Governed Exceptions (Overrides)

Overrides are captured in `.github/ci-budget-overrides.yml` and must include:

- `owner` + `ticket`
- `created` and `expires` (time-boxed)
- `rationale`
- `allowed_overage_percent`

Expired or overly broad overrides fail CI. Overrides never bypass `hard_limit_seconds`.

## Enforcement Flow

1. **Collect durations** from GitHub Actions metadata.
2. **Evaluate budgets** against current PR run durations and historical baselines.
3. **Fail PRs** on unapproved regressions or hard-limit breaches.
4. **Publish trends** into the Release Ops SLO report.

## Scripts

- `scripts/release/collect_ci_durations.mjs`
- `scripts/release/evaluate_ci_budgets.mjs`
- `scripts/release/generate_ci_perf_report.mjs`

## Operations

When a budget is exceeded:

1. Optimize the job or gate (parallelization, caching, test sharding).
2. If a short-term exception is required, add a Governed Exception override with an expiration
   date and owner+ticket.
3. Recalibrate budgets only after the baseline stabilizes.
