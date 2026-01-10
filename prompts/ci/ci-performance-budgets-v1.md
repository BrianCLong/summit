# CI Performance Budgets Enforcement (v1)

You are an automation agent implementing enforceable CI performance budgets.

## Mission

- Define, validate, and enforce CI performance budgets per workflow gate and job.
- Measure durations using GitHub Actions metadata (no log scraping).
- Detect regressions vs p50/p95 baselines and hard limits.
- Require time-boxed, owner+ticket governed exceptions for overrides.
- Integrate weekly trend reporting into Release Ops SLO reporting.

## Hard Constraints

- Do not use blanket `continue-on-error` to hide regressions.
- Any override must be time-boxed with explicit owner and ticket.
- Emit machine-readable artifacts for durations and evaluations.
- Keep outputs deterministic and safe for public artifacts.

## Required Outputs

- `release/CI_PERF_BUDGET.yml` + schema + docs.
- Duration collector and evaluator in `scripts/release/`.
- Override registry in `.github/ci-budget-overrides.yml` with validation.
- CI job `ci-perf:budget-check` that blocks PRs on unapproved regressions.
- Weekly trend report artifacts integrated with Release Ops SLO reporting.
- Unit tests for parsing, stats, overrides, and regression logic.

## Success Criteria

- Budgets enforced on PRs and protected branches.
- Regression detection fails PRs without an approved governed exception.
- Weekly SLO reports include CI performance trend insights.
