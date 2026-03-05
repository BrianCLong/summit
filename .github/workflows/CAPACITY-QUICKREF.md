# GitHub Actions Capacity Quick Reference

## Emergency Response (Queue Stuck)

```bash
# 1. Enable MERGE_SURGE (skips heavy jobs)
gh api --method PATCH repos/:owner/:repo/actions/variables/MERGE_SURGE -f value="true"

# 2. Cancel all queued runs
bash scripts/ci/cancel-queued-runs.sh

# 3. Monitor recovery
bash scripts/ci/monitor-runner-capacity.sh

# 4. After queue < 20, disable MERGE_SURGE
gh api --method PATCH repos/:owner/:repo/actions/variables/MERGE_SURGE -f value="false"
```

## Health Checks

```bash
# Queue depth (WARNING if > 50, CRITICAL if > 100)
gh run list --status queued --limit 100 | wc -l

# Active jobs (CRITICAL if = 0 and queue > 20)
gh run list --status in_progress --limit 100 | wc -l

# Comprehensive monitoring
bash scripts/ci/monitor-runner-capacity.sh
```

## What MERGE_SURGE Does

When enabled, skips these expensive jobs in `ci-core.yml`:
- `deterministic-build` (2x builds + checksums)
- `golden-path` (bootstrap + smoke tests)
- `e2e-tests` (Playwright suite)

**Estimated savings**: 15-20 minutes per PR, 60-75% reduction in runner time

## Current Stats (2026-03-03)

- **Total workflows**: 260+
- **Workflows per PR**: 45
- **Concurrency limit**: ~60 jobs (plan-dependent)
- **Bottleneck**: 45 workflows × 23 PRs = 1,035 potential jobs

## See Also

- Full runbook: `docs/runbooks/ci/workflow-capacity-management.md`
- Consolidation plan: `docs/analysis/workflow-consolidation-plan.md`
- Scripts: `scripts/ci/cancel-queued-runs.sh`, `scripts/ci/monitor-runner-capacity.sh`
