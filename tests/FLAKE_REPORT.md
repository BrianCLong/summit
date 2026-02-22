# Flake Tracking & Auto-Rerun Policy

## Quarantined Tests (as of 2025-09-12)
- `tests/e2e/search-results.e2e.ts` (intermittent timeout on cold data) — rerun x3, quarantine until cache warmup fixed.
- `server/tests/privacy/budget-throttle.test.ts` (rate limiter timing variance) — rerun x2, under stabilization.

## Auto-Rerun Policy
- Any failed test reruns up to 3 times in CI.
- If passes on rerun, marked flaky and added to quarantine list with issue link.
- Weekly report summarizes flake counts and owners.

## Reporting
- CI job `flake-report` emits JSON + Markdown summary to `artifacts/flake-report/` and posts in #qa.
