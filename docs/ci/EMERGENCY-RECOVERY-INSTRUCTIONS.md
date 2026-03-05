# EMERGENCY: Merge Train Recovery Instructions

**Status**: 🚨 ACTIVE RECOVERY IN PROGRESS
**Started**: 2026-03-04
**Operator**: Follow these steps immediately

---

## Current Actions (Automated)

✅ **Step 1 RUNNING**: Canceling 200+ queued workflow runs
- Script: `cancel-queued-runs.sh`
- Status: In progress (~100 canceled so far)
- Expected completion: 5-10 minutes

---

## Required Manual Actions (DO NOW)

### ⚠️ **CRITICAL: Update Branch Protection**

**You must do this manually** - navigate to GitHub web UI:

#### 1. Open Branch Protection Settings

```
URL: https://github.com/BrianCLong/summit/settings/branch_protection_rules
```

Or navigate:
```
Settings → Branches → Find "main" → Click Edit
```

#### 2. Scroll to "Require status checks to pass before merging"

**Current state**: Likely 100+ checks listed

**Target state**: Reduce to 5-10 ESSENTIAL checks only

#### 3. Remove Most Checks (Keep Only These)

**KEEP ONLY** (click X on all others):
```
✓ Gates
✓ Build & Test
✓ Compliance & Security
✓ Governance Policy Check
✓ Integration Tests
```

**REMOVE** (click X to uncheck):
```
✗ Everything else (148+ checks)
```

#### 4. Save Changes

Click **"Save changes"** at bottom of page

**⏱️ Time required**: 5-10 minutes

---

## What This Achieves

### Before
```
Required checks: 153
Stabilization PRs: Stuck (cannot pass 153 checks)
Queue: Saturated
Status: DEADLOCK
```

### After
```
Required checks: 5
Stabilization PRs: Can merge in 20-30 min
Queue: Clearing
Status: RECOVERING
```

---

## Verification Steps

### Immediately After Branch Protection Update

Check stabilization PRs:
```bash
gh pr checks 19069  # Should show ~5 checks instead of 153
gh pr checks 19070
gh pr checks 19071
gh pr checks 19072
```

**Expected**: Dramatically fewer required checks

### Monitor Queue Clearing (Every 15 min)

```bash
# Check queue depth
gh run list --status queued --limit 200 | wc -l

# Target: Decreasing every check
# Goal: <50 within 2 hours
```

### Watch for Stabilization PR Merges

```bash
# Check PR status
gh pr list --search "author:@me is:open" --json number,title,state

# Watch for PRs 19069-19072 to merge
```

**Expected timeline**:
- Checks start running: 15-30 min
- PRs complete: 1-2 hours
- PRs merge: 2-4 hours

---

## After Stabilization PRs Merge

### Phase 2: Activate New Architecture

**Automatically triggers when PRs merge to main**

#### 2.1 Update Branch Protection (Second Time)

Navigate back to branch protection:
```
Settings → Branches → main → Edit
```

**Update Required Checks** to ONLY:
```
✓ pr-gate
```

**Remove**:
```
✗ All other checks (including the 5 temporary ones)
```

**Enable**:
```
☑ Require merge queue
☑ Require linear history
```

**Disable**:
```
☐ Require branches to be up to date before merging
```

**Save changes**

#### 2.2 Clean Workflow Registry

```bash
bash scripts/ci/workflow_registry_cleanup.sh
```

**Expected output**:
```
Found 50 registered workflows
Ghost workflows to disable: 40+
```

Select `y` to disable ghost workflows

#### 2.3 Verify Activation

Create test PR:
```bash
git checkout -b test/verify-activation
echo "# Test" >> docs/test-activation.md
git add docs/test-activation.md
git commit -m "test: verify new CI architecture"
git push -u origin test/verify-activation
gh pr create --title "[TEST] Verify new CI architecture" \
  --body "Should only run pr-gate + docs-ci"
```

Check workflows:
```bash
gh pr checks test/verify-activation
```

**Expected**:
```
✓ pr-gate (required)
✓ docs-ci (path matched)
✗ server-ci (skipped - paths don't match)
✗ client-ci (skipped - paths don't match)
```

**Success criteria**: Only 2 workflows run

Cleanup:
```bash
gh pr close test/verify-activation --delete-branch
```

---

## Phase 3: Monitor Recovery

### Collect Baseline Metrics

```bash
node scripts/ci/ci_metrics.mjs --save
```

**Expected output**:
```
Queue Health: NORMAL or WARNING (improving from CRITICAL)
PR Gate Health: HEALTHY
Merge Queue: HEALTHY or NORMAL
```

### Track Recovery Progress

Run every hour for first 24h:
```bash
node scripts/ci/ci_metrics.mjs
```

**Monitor**:
- Queue depth decreasing
- PRs merging regularly
- pr-gate pass rate >90%

---

## Success Metrics

### Hour 4 (After branch protection update)
- [ ] Queue depth <100 (from 200+)
- [ ] Stabilization PRs completed checks
- [ ] First stabilization PR merged

### Hour 8 (After activation)
- [ ] All 4 stabilization PRs merged
- [ ] New architecture active (pr-gate only)
- [ ] Workflow registry cleaned
- [ ] First regular PR merged with new architecture

### Day 1
- [ ] Queue depth <50
- [ ] 5+ PRs merged
- [ ] pr-gate pass rate >90%
- [ ] Time to merge <60 min

### Week 1
- [ ] Queue depth <25
- [ ] 30+ PRs merged
- [ ] pr-gate pass rate >95%
- [ ] Time to merge <30 min
- [ ] Merge queue optimization enabled

---

## Troubleshooting

### Issue: Cancellation script fails

**Symptom**: Errors canceling runs

**Solution**:
```bash
# Check auth
gh auth status

# Re-auth if needed
gh auth login

# Retry
bash scripts/ci/cancel-queued-runs.sh
```

### Issue: Stabilization PRs still stuck after branch protection update

**Symptom**: PRs still showing 153 checks

**Cause**: GitHub cache delay

**Solution**:
```bash
# Close and reopen PR to refresh
gh pr close 19069
gh pr reopen 19069

# Or wait 5-10 minutes for cache refresh
```

### Issue: Queue not clearing

**Symptom**: Queue depth stays >150 after 2 hours

**Solution**:
```bash
# Check if new runs are being queued
gh run list --limit 50 --json createdAt,status

# If many new runs starting, may need to:
# 1. Enable stricter MERGE_SURGE mode
# 2. Temporarily pause PR creation
# 3. Consider Option A (force-merge) if critical
```

### Issue: Branch protection won't update

**Symptom**: Can't save branch protection changes

**Cause**: Insufficient permissions

**Solution**:
- Verify you have admin access to repo
- Ask repo owner to make changes
- Or use GitHub API with admin token

---

## Emergency Contacts

**If this recovery fails or you need assistance**:

- Check: `docs/ci/merge-train-assessment-2026-03-04.md` for full analysis
- Reference: `docs/ci/activation-verification-checklist.md` for detailed steps
- Escalate: To engineering lead if recovery stalls >8 hours

---

## Recovery Timeline

```
[NOW] Cancel queued runs (5-10 min)
  ↓
[MANUAL] Update branch protection - reduce to 5 checks (5 min)
  ↓
[WAIT] Stabilization PRs complete checks (1-2 hours)
  ↓
[WAIT] Stabilization PRs merge (2-4 hours total)
  ↓
[MANUAL] Update branch protection - only pr-gate (5 min)
  ↓
[RUN] Clean workflow registry (5 min)
  ↓
[TEST] Verify activation (10 min)
  ↓
[MONITOR] Track recovery (24-48 hours)
  ↓
[SUCCESS] Normal operations restored
```

**Total time**: 4-8 hours to activation, 24-48 hours to full recovery

---

## Current Status Tracking

### Completion Checklist

#### Phase 1: Emergency Actions
- [x] Queue cancellation initiated
- [ ] Branch protection updated (5 checks)
- [ ] Queue depth decreasing
- [ ] Stabilization PRs running checks

#### Phase 2: Activation
- [ ] PR #19069 merged (pr-gate)
- [ ] PR #19070 merged (path-filtering)
- [ ] PR #19071 merged (main-validation + cleanup)
- [ ] PR #19072 merged (drift-sentinel)
- [ ] Branch protection updated (pr-gate only)
- [ ] Workflow registry cleaned
- [ ] Activation verified with test PR

#### Phase 3: Optimization
- [ ] Baseline metrics collected
- [ ] Merge queue optimization configured
- [ ] First 24h monitoring complete
- [ ] Full recovery confirmed

---

**Last Updated**: 2026-03-04
**Status**: RECOVERY IN PROGRESS
**Next Action**: UPDATE BRANCH PROTECTION (Manual)
