# Workflow Capacity Management Runbook

## Problem Statement

With 260+ workflow files and 45 workflows per PR, this repo can trigger 1000+ jobs when 23 PRs are active. GitHub Actions has concurrency limits (20-180 concurrent jobs depending on plan), causing massive queue backlogs.

## Immediate Recovery (When Queue is Stuck)

### Step 1: Enable MERGE_SURGE Mode
```bash
gh api --method PATCH repos/:owner/:repo/actions/variables/MERGE_SURGE -f value="true"
```

This skips heavy jobs (deterministic builds, E2E tests, golden path) to reduce load.

### Step 2: Cancel All Queued Runs
```bash
bash scripts/ci/cancel-queued-runs.sh
```

This clears the backlog and allows fresh runs with MERGE_SURGE enabled.

### Step 3: Monitor Recovery
```bash
# Watch queue size
watch -n 30 'gh run list --status queued --limit 100 | wc -l'

# Watch in-progress jobs
gh run list --status in_progress --limit 20

# Or use the monitoring script
bash scripts/ci/monitor-runner-capacity.sh
```

### Step 4: Disable MERGE_SURGE After Recovery
```bash
gh api --method PATCH repos/:owner/:repo/actions/variables/MERGE_SURGE -f value="false"
```

Wait until queued runs drop below 20, then re-enable full CI.

## Root Cause Analysis

### Current State (2026-03-03)
- **Workflows**: 260+ files
- **Workflows per PR**: 45
- **Active PRs**: 23 (merge train)
- **Potential jobs**: 45 × 23 = 1,035 queued
- **GitHub Actions limit**: ~20-60 concurrent jobs
- **Result**: 200+ queued, 0 running = complete gridlock

### Contributing Factors
1. **Workflow proliferation**: 260+ workflows is excessive
2. **No path filtering**: Most workflows run on every PR regardless of changes
3. **Parallel execution**: All workflows trigger simultaneously
4. **Heavy jobs**: Deterministic builds, E2E tests consume significant runner time

## Monitoring & Alerts

### Key Metrics
```bash
# Queue depth
gh run list --status queued --limit 100 | wc -l

# In-progress jobs
gh run list --status in_progress --limit 100 | wc -l

# Comprehensive monitoring
bash scripts/ci/monitor-runner-capacity.sh
```

### Alert Thresholds
- **Warning**: Queue depth > 50
- **Critical**: Queue depth > 100 OR queue time > 10 minutes
- **Emergency**: In-progress jobs = 0 AND queue depth > 20

## Decision Tree

```
Queue depth > 100?
├─ YES → Enable MERGE_SURGE + Cancel queued runs
└─ NO
   └─ Queue depth > 50?
      ├─ YES → Enable MERGE_SURGE only
      └─ NO → Monitor normally

After recovery (queue < 20):
├─ Peak hours (9am-5pm) → Keep MERGE_SURGE enabled
└─ Off-peak → Disable MERGE_SURGE for full CI coverage
```

## Long-Term Solutions

### 1. Workflow Consolidation (High Impact)
**Goal**: Reduce from 45 workflows/PR to 15-20 workflows/PR

See: `docs/analysis/workflow-consolidation-plan.md` for detailed plan.

### 2. Add Path Filters (Medium Impact)
**Goal**: Only run workflows when relevant files change

**Example**:
```yaml
# In .github/workflows/docker-build.yml
on:
  pull_request:
    paths:
      - 'Dockerfile'
      - 'docker/**'
      - '.dockerignore'
      - '.github/workflows/docker-build.yml'
```

### 3. Increase Runner Capacity (Cost Impact)
**Options**:
- Upgrade GitHub Actions plan for more concurrent jobs
- Add self-hosted runners (requires infrastructure)
- Use GitHub Actions large runners (2x-4x parallelism)

## Incident History

### 2026-03-03: Complete Gridlock
- **Cause**: 23 PRs × 45 workflows = 1,035 queued jobs
- **Impact**: 200+ queued, 0 running for 3+ hours
- **Resolution**: Enabled MERGE_SURGE, canceled 200 queued runs
- **Recovery time**: 15 minutes
- **Lessons learned**: Need workflow consolidation strategy

## References

- GitHub Actions concurrency limits: https://docs.github.com/en/actions/learn-github-actions/usage-limits-billing-and-administration
- Workflow syntax: https://docs.github.com/en/actions/using-workflows/workflow-syntax-for-github-actions
- Best practices: https://docs.github.com/en/actions/learn-github-actions/best-practices-for-github-actions
