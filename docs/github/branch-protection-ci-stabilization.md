# Branch Protection Settings for CI Stabilization

## Overview

After the 4-PR CI stabilization stack merges, update GitHub branch protection to activate the new two-tier architecture.

## Critical Change Required

⚠️ **IMPORTANT**: The new CI architecture **will not take effect** until you update branch protection settings.

### Current State (Before)
```
Required status checks:
  ✓ comprehensive-test-suite
  ✓ e2e-tests
  ✓ integration-tests
  ✓ security-scan
  ✓ evidence-validate
  ✓ governance-check
  ✓ ... (100+ checks)
```

**Problem**: Every check blocks every PR → Fan-out failure

### Target State (After)
```
Required status checks:
  ✓ pr-gate  ← ONLY THIS
```

**Result**: Single fast gate → Predictable merge trains

## Step-by-Step Configuration

### 1. Navigate to Branch Protection

1. Go to: `https://github.com/BrianCLong/summit/settings/branches`
2. Find rule for `main` branch
3. Click **Edit** button

### 2. Update Required Status Checks

#### Option A: Clear All and Add One (Recommended)
1. Scroll to "Require status checks to pass before merging"
2. Click **X** on all existing required checks
3. Search for and add: `pr-gate`
4. Verify only `pr-gate` is listed

#### Option B: Via GitHub CLI
```bash
gh api repos/BrianCLong/summit/branches/main/protection \
  --method PUT \
  -H "Accept: application/vnd.github+json" \
  -f required_status_checks[strict]=true \
  -f required_status_checks[contexts][]=pr-gate
```

### 3. Configure Merge Queue Settings

#### Enable Merge Queue
```
☑ Require merge queue
```

#### Merge Queue Configuration
```
Merge method: Squash
Build concurrency: 5 (recommended)
Merge strategy: Allgreen
Minimum time in queue: 5 minutes
Maximum time in queue: 60 minutes
```

#### Why These Settings
- **Allgreen**: PRs must pass pr-gate before merging
- **5 concurrency**: Balances throughput with safety
- **Squash**: Keeps main history clean
- **5-60 min window**: Allows batching without excessive delay

### 4. Other Recommended Settings

#### Enable
```
☑ Require linear history
☑ Require deployments to succeed before merging (if applicable)
☑ Require conversation resolution before merging
☑ Lock branch (prevents force push)
```

#### Disable
```
☐ Require branches to be up to date before merging
```

**Why disable**: Merge queue handles rebasing internally; enabling causes infinite rebase loops

### 5. Status Checks Configuration

```
☑ Require status checks to pass before merging
☑ Require branches to be up to date before merging: DISABLED

Status checks that are required:
  - pr-gate
```

### 6. Additional Protection Rules

```
☑ Require pull request before merging
  - Required approvals: 1 (or your team preference)
  - Dismiss stale reviews: Enabled
  - Require review from Code Owners: Optional

☑ Require signed commits: Optional (recommended)

☐ Allow force pushes: DISABLED
☐ Allow deletions: DISABLED
```

## Verification

After updating settings:

### Test 1: Create Test PR
```bash
git checkout -b test/verify-new-ci-gate
echo "test" >> README.md
git add README.md
git commit -m "test: verify new CI gate"
git push -u origin test/verify-new-ci-gate
gh pr create --title "Test: Verify new CI gate" --body "Testing new pr-gate"
```

**Expected**: Only `pr-gate` runs and blocks merge

### Test 2: Check Merge Queue
1. Enable auto-merge on test PR
2. Verify PR enters merge queue
3. Verify only `pr-gate` is required
4. Delete test PR after verification

### Test 3: Path Filtering
```bash
# Test docs-only PR
git checkout -b test/docs-only
echo "# Test" >> docs/test.md
git add docs/test.md
git commit -m "docs: test path filtering"
git push -u origin test/docs-only
gh pr create --title "Test: Docs path filter" --body "Should only run docs-ci"
```

**Expected**: Only `docs-ci` workflow runs (not server/client/infra)

## Rollback Plan

If issues arise, revert to previous settings:

### Quick Rollback
1. Go to branch protection settings
2. Add back previous required checks
3. PRs will require old checks again

### Full Rollback
```bash
# Restore archived workflows
mv .github/workflows/archived/*.yml .github/workflows/

# Re-enable in branch protection
# (add all workflow names back to required checks)
```

**Time to rollback**: 5-10 minutes

## Troubleshooting

### Issue: pr-gate not appearing in status checks dropdown

**Cause**: Workflow hasn't run yet
**Solution**:
```bash
# Trigger pr-gate manually
gh workflow run pr-gate.yml
```

Wait 1-2 minutes, then it will appear in dropdown

### Issue: PRs stuck in queue

**Cause**: Merge queue misconfiguration
**Solution**:
```bash
# Check queue status
gh api repos/BrianCLong/summit/merge-queue

# If stuck, temporarily disable and re-enable merge queue
```

### Issue: Old workflows still running

**Cause**: Workflows still in `.github/workflows/` directory
**Solution**:
```bash
# Verify workflows are archived
ls -la .github/workflows/archived/ | wc -l  # Should show 200+
ls -la .github/workflows/*.yml | wc -l      # Should show <10
```

### Issue: Merge queue rejecting PRs

**Cause**: "Require branches to be up to date" is enabled
**Solution**: Disable this setting (see step 4)

## Migration Timeline

### Phase 1: Preparation (Before PRs merge)
- ✅ Review documentation
- ✅ Notify team of upcoming changes
- ✅ Schedule maintenance window (optional)

### Phase 2: PR Merges (During)
1. Merge [#19069](https://github.com/BrianCLong/summit/pull/19069) - pr-gate
2. Merge [#19070](https://github.com/BrianCLong/summit/pull/19070) - path filtering
3. Merge [#19071](https://github.com/BrianCLong/summit/pull/19071) - main validation + cleanup
4. Merge [#19072](https://github.com/BrianCLong/summit/pull/19072) - drift sentinel

### Phase 3: Activation (After PRs merge)
1. **Update branch protection** (this document)
2. Test with sample PR
3. Monitor for 24 hours
4. Declare success

### Phase 4: Monitoring (Ongoing)
- Track queue depth (target: <50)
- Monitor pr-gate pass rate (target: >95%)
- Watch for violations caught by sentinel
- Celebrate 94% CI cost reduction 🎉

## Success Criteria

Know the migration succeeded when:

- ✅ Only `pr-gate` is required status check
- ✅ PRs complete in <30 minutes (vs hours before)
- ✅ Queue depth stays <50 (vs 200+ before)
- ✅ Path-filtered workflows only run when relevant
- ✅ Main validation runs on main branch only
- ✅ Workflow count stays <25 (sentinel enforces)

## Contact & Support

**Questions?**
- Check: `docs/ci/` directory for detailed guides
- Review: Specific PR documentation
- Ask: In #engineering-ci channel (if exists)

**Emergency?**
- Rollback: Follow rollback plan above
- Contact: Engineering lead/oncall
- Time estimate: 5-10 minutes to revert

## References

### Architecture Documents
- PR gate: `docs/ci/pr-gate-architecture.md`
- Path filtering: `docs/ci/path-filtering-strategy.md`
- Main validation: `docs/ci/main-branch-validation.md`
- Drift sentinel: `docs/ci/workflow-drift-sentinel.md`

### GitHub Documentation
- Branch protection: https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-protected-branches/about-protected-branches
- Merge queues: https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/configuring-pull-request-merges/managing-a-merge-queue
- Required status checks: https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-protected-branches/about-protected-branches#require-status-checks-before-merging

### Related PRs
- [#19069](https://github.com/BrianCLong/summit/pull/19069) - Minimal PR gate
- [#19070](https://github.com/BrianCLong/summit/pull/19070) - Path-filtered workflows
- [#19071](https://github.com/BrianCLong/summit/pull/19071) - Main validation + cleanup
- [#19072](https://github.com/BrianCLong/summit/pull/19072) - CI drift sentinel

---

**Last Updated**: 2026-03-04
**Status**: Ready for implementation after PRs merge
**Owner**: Engineering team
