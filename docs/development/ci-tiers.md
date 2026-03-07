# CI Tiers

This repository now uses a tiered CI strategy so that pull requests get fast feedback while deeper coverage continues to run elsewhere.

## PR Gate (fast)

- Triggered by pull requests via `.github/workflows/ci-pr-gate.yml`.
- Runs dependency installation with cache reuse, linting, type checks, and targeted unit tests for changed packages when available (falls back to the minimal core suite).
- Intended to finish quickly so that contributors get immediate signals on regressions.

Run locally with:

```bash
bash scripts/ci/pr-gate.sh
```

## Full CI

- Existing pipelines that exercise the complete lint, typecheck, and test matrix (including end-to-end suites where configured).
- Used for merge validation and release safety; unchanged by the PR gate workflow.

## Nightly

- Scheduled workflows that run extended checks, long-running verification, and slow end-to-end scenarios.
- Provides longer-term quality signals without slowing down day-to-day PR velocity.
