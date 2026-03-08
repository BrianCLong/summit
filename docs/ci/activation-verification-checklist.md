# CI Stabilization Activation & Verification Checklist

## Overview

This checklist ensures the 4-PR CI stabilization stack is properly activated and functioning after merge.

## Prerequisites

All 4 PRs must be merged:
- [ ] PR #19069: Minimal deterministic PR gate
- [ ] PR #19070: Path-filtered workflows
- [ ] PR #19071: Main branch validation + cleanup
- [ ] PR #19072: CI drift sentinel

## 1. Verify Workflow Topology

### Check Active Workflows

```bash
gh workflow list --all
```

**Expected active workflows** (non-reusable):
- `pr-gate.yml`
- `main-validation.yml`
- `server-ci.yml`
- `client-ci.yml`
- `infra-ci.yml`
- `docs-ci.yml`

**Expected reusable workflows** (supporting):
- `_*.yml` (various reusable workflows)

### Count Workflow Files

```bash
ls .github/workflows/*.yml | wc -l
```

**Expected**: ~20 files (6 active + ~14 reusable)

```bash
ls .github/workflows/archived/*.yml | wc -l
```

**Expected**: 200+ archived files

### Clean Ghost Workflows

Run registry cleanup to disable workflows that were moved to archived/:

```bash
bash scripts/ci/workflow_registry_cleanup.sh
```

This will:
1. List all workflows registered in GitHub
2. Identify "ghost" workflows (registered but file doesn't exist)
3. Prompt to disable them
4. Clean up the registry

**Expected result**: Only 6-8 active workflows remain registered

---

## 2. Update Branch Protection (CRITICAL)

⚠️ **This is the most critical step** - the new architecture won't activate until this is done.

### Navigate to Settings

```
https://github.com/BrianCLong/summit/settings/branches
```

Find: `main` branch → Click **Edit**

### Required Status Checks

**Current (before)**:
```
✓ comprehensive-test-suite
✓ e2e-tests
✓ integration-tests
✓ security-scan
... (100+ checks)
```

**Target (after)**:
```
✓ pr-gate   ← ONLY THIS
```

**Steps**:
1. Scroll to "Require status checks to pass before merging"
2. Click **X** on ALL existing checks
3. Search for `pr-gate`
4. Add only `pr-gate`
5. Verify only one check listed

### Merge Queue Settings

Enable:
```
☑ Require merge queue
```

Configure:
```
Merge method: Squash
Build concurrency: 5
Merge strategy: Allgreen
Minimum time in queue: 5 minutes
Maximum time in queue: 60 minutes
```

### Other Protection Settings

Enable:
```
☑ Require linear history
☑ Require conversation resolution before merging
☑ Lock branch (prevent force push)
☑ Require pull request before merging
```

Disable:
```
☐ Require branches to be up to date before merging
```

**⚠️ CRITICAL**: Must disable "require up to date" or merge queue will force rebases on every merge, causing:
- Invalidated approvals
- Retriggered CI
- Stalled merge train

### Via GitHub CLI (Alternative)

```bash
gh api repos/BrianCLong/summit/branches/main/protection \
  --method PUT \
  -H "Accept: application/vnd.github+json" \
  -f required_status_checks[strict]=false \
  -f required_status_checks[contexts][]=pr-gate
```

---

## 3. Verify Path Filtering

### Create Docs-Only Test PR

```bash
git checkout -b test/verify-path-filtering
echo "# Test Path Filtering" >> docs/test-path-filtering.md
git add docs/test-path-filtering.md
git commit -m "test: verify path filtering works"
git push -u origin test/verify-path-filtering
gh pr create --title "[TEST] Verify path filtering" \
  --body "Should only trigger pr-gate and docs-ci"
```

### Expected CI Runs

```
✓ pr-gate (required)
✓ docs-ci (path filter matched)
✗ server-ci (skipped - paths don't match)
✗ client-ci (skipped - paths don't match)
✗ infra-ci (skipped - paths don't match)
```

### Verify

```bash
gh pr checks test/verify-path-filtering
```

Should show only 2 workflows ran.

### Cleanup

```bash
gh pr close test/verify-path-filtering --delete-branch
```

---

## 4. Verify Drift Sentinel

### Create Test with Missing Concurrency

Create test workflow without concurrency guard:

```bash
cat > .github/workflows/test-no-concurrency.yml <<'EOF'
name: test-no-concurrency

on:
  pull_request:

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - run: echo "test"
EOF

git checkout -b test/verify-drift-sentinel
git add .github/workflows/test-no-concurrency.yml
git commit -m "test: workflow without concurrency (should fail)"
git push -u origin test/verify-drift-sentinel
gh pr create --title "[TEST] Verify drift sentinel" \
  --body "Should fail pr-gate due to missing concurrency"
```

### Expected Result

```
❌ pr-gate fails
  - validate_workflows.mjs error:
    "test-no-concurrency.yml: Missing concurrency guard"
```

### Verify

```bash
gh pr checks test/verify-drift-sentinel
```

Should show pr-gate failed with validation error.

### Cleanup

```bash
gh pr close test/verify-drift-sentinel --delete-branch
rm .github/workflows/test-no-concurrency.yml
```

---

## 5. Monitor Merge Queue Throughput

### Watch Queue Behavior

```bash
watch -n 15 "gh pr list --state open | wc -l"
```

**Expected**: Steady decrease as PRs merge

### Check Queue Depth

```bash
gh pr list --search "is:queued"
```

**Target**: <25 PRs in queue

### Monitor Main Branch Runs

```bash
gh run list --branch main --limit 10
```

**Expected**: main-validation runs after each merge

### Check Queue Metrics

```bash
node scripts/ci/ci_metrics.mjs
```

**Healthy metrics**:
- Queue depth: <50
- PR gate duration: <20 min
- PR gate pass rate: >95%
- Merge queue depth: <25

---

## 6. Disable Legacy Workflows

### List All Registered Workflows

```bash
gh workflow list --all
```

### Disable Unexpected Active Workflows

For any workflow not in the expected list:

```bash
gh workflow disable "<workflow-name>"
```

Or use the cleanup script:

```bash
bash scripts/ci/workflow_registry_cleanup.sh
```

---

## 7. Run CI Metrics Collection

### Collect Baseline Metrics

```bash
node scripts/ci/ci_metrics.mjs --save
```

This creates:
- `docs/ci/metrics/ci-metrics-<timestamp>.json`
- `docs/ci/metrics/latest.json`

### Review Metrics

```bash
cat docs/ci/metrics/latest.json
```

**Target metrics**:
- Queue health: `HEALTHY` or `NORMAL`
- PR gate health: `HEALTHY`
- PR gate avg duration: <20 min
- PR gate pass rate: >95%
- Merge queue health: `HEALTHY` or `NORMAL`

### Schedule Automated Monitoring

Add to cron or GitHub Actions to run metrics hourly:

```yaml
# .github/workflows/ci-metrics.yml
name: CI Metrics Collection

on:
  schedule:
    - cron: '0 * * * *'  # Every hour
  workflow_dispatch:

jobs:
  collect-metrics:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
      - run: node scripts/ci/ci_metrics.mjs --save
      - uses: actions/upload-artifact@v4
        with:
          name: ci-metrics
          path: docs/ci/metrics/latest.json
```

---

## 8. Verify End-to-End Flow

### Create Full-Stack Test PR

```bash
git checkout -b test/verify-full-flow
echo "// Test" >> server/test.js
echo "// Test" >> client/test.ts
git add server/test.js client/test.ts
git commit -m "test: verify full CI flow"
git push -u origin test/verify-full-flow
gh pr create --title "[TEST] Verify full CI flow" \
  --body "Should trigger pr-gate, server-ci, client-ci"
```

### Expected Flow

1. **PR Created**
   - pr-gate starts (required)
   - server-ci starts (path matched)
   - client-ci starts (path matched)

2. **All Pass**
   - pr-gate: ✓ <20 min
   - server-ci: ✓ <15 min
   - client-ci: ✓ <15 min

3. **Enable Auto-Merge**
   ```bash
   gh pr merge test/verify-full-flow --auto --squash
   ```

4. **Enters Merge Queue**
   - Shows in queue: `gh pr list --search "is:queued"`

5. **Merges to Main**
   - main-validation runs (30-60 min)
   - Integration, E2E, security, graph validation

### Cleanup

After verification:
```bash
git revert HEAD
git push origin main
```

---

## Success Criteria

### Workflow Topology
- [x] Only 6-8 active workflows
- [x] 200+ workflows archived
- [x] No ghost workflows in registry

### Branch Protection
- [x] Only `pr-gate` required
- [x] Merge queue enabled
- [x] "Require up to date" disabled

### Path Filtering
- [x] Docs PR only runs docs-ci
- [x] Server PR only runs server-ci
- [x] Client PR only runs client-ci
- [x] Full-stack PR runs relevant workflows

### Drift Sentinel
- [x] Blocks PRs with missing concurrency
- [x] Enforces workflow count <25
- [x] Prevents duplicate names

### Performance
- [x] Queue depth <50
- [x] PR gate <20 min
- [x] PR gate pass rate >95%
- [x] Merge queue depth <25
- [x] Time to merge <30 min

### Monitoring
- [x] CI metrics collecting
- [x] Metrics show healthy status
- [x] Alerts configured (if applicable)

---

## Rollback Plan

If issues arise:

### Quick Rollback (5-10 minutes)

1. **Re-enable old required checks** in branch protection
2. **Temporarily disable pr-gate** requirement
3. **Restore critical workflows** from archived/

### Full Rollback

```bash
# Move archived workflows back
mv .github/workflows/archived/*.yml .github/workflows/

# Re-enable in branch protection
# (manually add workflow names back)

# Force registry sync
git push
```

---

## Troubleshooting

### Issue: pr-gate not in status checks dropdown

**Solution**:
```bash
gh workflow run pr-gate.yml
# Wait 2 minutes, then check again
```

### Issue: PRs stuck in merge queue

**Solution**:
```bash
# Check if "require up to date" is disabled
# If enabled, disable it and restart queue
```

### Issue: Old workflows still running

**Solution**:
```bash
# Run registry cleanup
bash scripts/ci/workflow_registry_cleanup.sh
```

### Issue: Queue saturation returning

**Solution**:
```bash
# Check metrics
node scripts/ci/ci_metrics.mjs

# If queue depth >100, investigate:
gh run list --status queued --limit 200

# Cancel if needed
bash scripts/ci/cancel-queued-runs.sh
```

---

## Post-Activation Monitoring

### First 24 Hours

- Run metrics every 2 hours
- Watch queue depth
- Monitor pr-gate pass rate
- Verify merge queue functioning

### First Week

- Daily metrics review
- Track average time to merge
- Monitor for unexpected workflow runs
- Verify path filtering working

### Ongoing

- Weekly metrics review
- Monthly CI cost comparison
- Quarterly workflow audit
- Continuous improvement

---

**Status**: Ready for activation after 4 PRs merge
**Owner**: DevOps/SRE team
**Last Updated**: 2026-03-04
