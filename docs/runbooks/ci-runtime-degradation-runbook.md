# CI Runtime Degradation Runbook

## Overview
This runbook provides steps to troubleshoot and resolve alerts related to high CI pipeline runtimes.
Our SLI target is < 15 minutes for standard PR builds.

## Symptoms
- Alert: `HighCIRuntime`
- PR merge queue is backing up due to slow checks.
- Build timeouts or job cancellations.

## Initial Triage Steps
1. **Check CI Dashboard:** Open `docs/observability/dashboards/ci_observability.json` in Grafana to see which specific step or pipeline is causing the slowdown.
2. **Review CI Time Budget Report:** Check the latest GitHub Actions run summary for the "CI runtime profile" (see `docs/CI_TIME_BUDGET.md`).
3. **Verify Caches:**
   - Are `pnpm` caches hitting or missing?
   - Is the Turbo cache active and providing hits?
   - Did a recent PR update `pnpm-lock.yaml`, invalidating global caches?

## Mitigation
- **Cache Invalidation:** If caches are corrupted, manually clear GitHub Actions caches and re-run.
- **Rollback:** If a recent PR significantly degraded performance, consider reverting it (e.g., adding heavy dependencies or slow E2E tests).
- **Optimize:** Review `docs/CI_TIME_BUDGET.md` for optimization levers.
