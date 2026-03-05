# CI Emergency Runbook

**Purpose**: Step-by-step procedures for CI incidents and emergencies

**Audience**: On-call engineers, DevOps, Platform team

**Last Updated**: 2026-03-04

---

## Quick Reference

| Symptom | Severity | Action | Page |
|---------|----------|--------|------|
| Queue depth >200 | 🚨 CRITICAL | [Queue Saturation](#queue-saturation) | Below |
| All workflows failing | 🚨 CRITICAL | [Workflow Failure](#workflow-failure) | Below |
| Slow PR merge times | ⚠️ WARNING | [Capacity Issues](#capacity-issues) | Below |
| New workflow added | ℹ️ INFO | [Budget Check](#workflow-budget) | Below |
| Old PR won't merge | ℹ️ INFO | [Migration Guide](#old-pr-migration) | Below |

---

## Emergency Contacts

**Primary**: Platform Team (#platform-eng)
**Secondary**: DevOps On-Call (#devops-oncall)
**Escalation**: Engineering Leadership

---

## Incident Response: Queue Saturation

### Symptoms
- Queue depth >200 queued workflows
- PRs stuck "Waiting to run"
- Merge train stalled
- No runners available

### Diagnosis

```bash
# Check current status
bash scripts/ci/monitor-runner-capacity.sh

# Expected output shows:
# - Queued workflows count
# - In-progress workflows count
# - MERGE_SURGE mode status
# - Top queued workflows
```

### Thresholds

| Queue Depth | Severity | Status |
|-------------|----------|--------|
| 0-99 | ✅ HEALTHY | Normal operations |
| 100-199 | ⚠️ ELEVATED | Monitor closely |
| 200-299 | 🚨 CRITICAL | Immediate action |
| 300+ | ❌ GRIDLOCK | Emergency response |

### Response: ELEVATED (100-199)

**No immediate action required** - Monitor for 30 minutes

```bash
# Monitor every 5 minutes
watch -n 300 'bash scripts/ci/monitor-runner-capacity.sh'
```

**If trending up**: Proceed to CRITICAL response

### Response: CRITICAL (200-299)

**Immediate Actions**:

1. **Enable MERGE_SURGE mode** (if not already)
   ```bash
   gh variable set MERGE_SURGE --body "true" --repo BrianCLong/summit
   ```

2. **Cancel archived workflow runs**
   ```bash
   bash scripts/ci/cancel-archived-workflow-runs.sh
   ```

3. **Verify queue reduction**
   ```bash
   bash scripts/ci/monitor-runner-capacity.sh
   ```

4. **Post incident update**
   - Update #platform-eng channel
   - Note: "CRITICAL: CI queue at [count], MERGE_SURGE enabled, archived runs cancelled"

**Expected Result**: Queue reduces by 50-80% within 10 minutes

**If queue continues growing**: Proceed to GRIDLOCK response

### Response: GRIDLOCK (300+)

**EMERGENCY - All hands required**

1. **Enable MERGE_SURGE mode**
   ```bash
   gh variable set MERGE_SURGE --body "true" --repo BrianCLong/summit
   ```

2. **Emergency: Cancel ALL queued runs**
   ```bash
   bash scripts/ci/cancel-queued-runs.sh
   ```

3. **Block new PR creation** (temporary)
   - Post in #engineering: "⛔ CI GRIDLOCK - Hold all new PRs for 30 minutes"
   - Pin message

4. **Run saturation policy**
   ```bash
   bash scripts/ci/runner-saturation-policy.sh
   ```

5. **Escalate to leadership**
   - Ping @platform-lead in #platform-eng
   - Start incident bridge: [Zoom link]

6. **Monitor recovery**
   ```bash
   watch -n 60 'bash scripts/ci/monitor-runner-capacity.sh'
   ```

**Expected Result**: Queue clears to <100 within 15 minutes

**If queue doesn't clear**: Check for infrastructure issues (GitHub Actions outage, runner fleet offline)

### Post-Incident

**Required Actions**:

1. **Verify system stable**
   ```bash
   bash scripts/ci/monitor-runner-capacity.sh
   # Should show: HEALTHY or ELEVATED
   ```

2. **Review queue composition**
   ```bash
   gh run list --status queued --limit 50 --json workflowName,headBranch
   ```

3. **Identify root cause**
   - Large PR merge?
   - New workflow added?
   - Bot PR storm?
   - GitHub Actions outage?

4. **Write incident report** (use template below)

5. **Unblock new PRs**
   - Unpin hold message in #engineering
   - Post "✅ CI recovered - PRs unblocked"

---

## Incident Response: Workflow Failure

### Symptoms
- All PRs show "gate" check failing
- Workflows fail immediately
- Error: "workflow file not found"

### Diagnosis

```bash
# Check workflow files exist
ls .github/workflows/*.yml | wc -l
# Expected: 7-12 active workflows

# Check pr-gate specifically
cat .github/workflows/pr-gate.yml | head -20

# Check recent workflow runs
gh run list --limit 10
```

### Common Causes

#### 1. Workflow file accidentally deleted

**Symptoms**: "workflow file not found" error

**Solution**:
```bash
# Restore from git history
git checkout origin/main -- .github/workflows/pr-gate.yml

# Commit and push
git add .github/workflows/pr-gate.yml
git commit -m "fix: restore pr-gate workflow"
git push origin main
```

#### 2. Syntax error in workflow YAML

**Symptoms**: "Invalid workflow file" error

**Solution**:
```bash
# Validate workflow syntax
node scripts/ci/workflow-budget-sentinel.mjs

# Check specific workflow
gh workflow view pr-gate
```

#### 3. Branch protection misconfigured

**Symptoms**: PRs blocked even though checks pass

**Solution**:
```bash
# Check required checks
gh api repos/BrianCLong/summit/branches/main/protection --jq '.required_status_checks.contexts'

# Should show: ["gate"]
# If not, update branch protection
```

#### 4. GitHub Actions quota exceeded

**Symptoms**: Workflows queue but never start

**Solution**:
- Check GitHub Actions usage: Settings → Billing → Actions
- If quota exceeded: Contact finance or pause non-critical workflows

---

## Incident Response: Capacity Issues

### Symptoms
- PRs take >30 minutes to merge
- Workflows queue for extended periods
- Developer complaints about slow CI

### Diagnosis

```bash
# Check workflow count
node scripts/ci/workflow-budget-sentinel.mjs

# Check path filtering
grep -r "paths:" .github/workflows/*.yml | wc -l

# Check workflow run distribution
gh run list --limit 100 --json workflowName,status | \
  jq -r '.[] | .workflowName' | sort | uniq -c | sort -rn
```

### Response

#### Short-term: Enable MERGE_SURGE

```bash
gh variable set MERGE_SURGE --body "true" --repo BrianCLong/summit
```

This skips 60-75% of heavy jobs (e2e, integration tests, perf tests)

#### Medium-term: Add path filtering

Identify workflows without path filtering:

```bash
node scripts/ci/workflow-budget-sentinel.mjs
# Lists violations
```

Add `paths:` or `paths-ignore:` to each workflow:

```yaml
on:
  pull_request:
    paths:
      - "server/**"
      - "packages/**"
```

#### Long-term: Consolidate workflows

If >12 active workflows, consolidate related workflows:

1. Identify workflow overlap
2. Merge related checks into single workflow
3. Use matrix strategies for variations
4. Archive old workflow
5. Update branch protection

---

## Workflow Budget Enforcement

### Current Budget

**Max workflows**: 12
**Current active**: 7
**Available**: 5

### Adding a New Workflow

**Before adding**:

1. **Check budget**
   ```bash
   node scripts/ci/workflow-budget-sentinel.mjs
   ```

2. **Justify need**
   - Why can't this be added to existing workflow?
   - Will it run on every PR?
   - Can it use path filtering?

3. **Add path filtering** (required)
   ```yaml
   on:
     pull_request:
       paths:
         - "relevant/path/**"
   ```

4. **Validate**
   ```bash
   node scripts/ci/workflow-budget-sentinel.mjs
   # Must pass before merge
   ```

### If Budget Exceeded

**Options**:

1. **Consolidate existing workflows**
   - Merge related checks
   - Use workflow matrices

2. **Archive unused workflows**
   ```bash
   mv .github/workflows/unused.yml .github/workflows/.archive/
   ```

3. **Request budget increase**
   - Update `WORKFLOW_BUDGET` in `workflow-budget-sentinel.mjs`
   - Requires approval from Platform Lead
   - Must justify with metrics

---

## Old PR Migration

### Problem

Old PRs (created before consolidation) trigger archived workflows that fail.

### Symptoms
- PR shows 50+ failing checks
- Check names like "CI Core (Primary Gate)" show "workflow not found"
- Required check "gate" missing

### Solution for PR Authors

**Option 1: Rebase (recommended)**

```bash
git fetch origin
git checkout <branch>
git rebase origin/main
git push --force-with-lease
```

**Option 2: Merge main**

```bash
git fetch origin
git checkout <branch>
git merge origin/main
git push
```

**Option 3: Close and reopen**

Close the PR, then immediately reopen it. This re-triggers workflows.

### Solution for Maintainers

**Batch guidance**:

```bash
# List old PRs (created before consolidation date)
gh pr list --created "<2026-03-04" --json number,title,author

# Comment on each
for pr in $(gh pr list --created "<2026-03-04" --json number --jq '.[].number'); do
  gh pr comment $pr --body "Please rebase to adopt new CI: \`git rebase origin/main && git push --force-with-lease\`"
done
```

---

## Monitoring & Alerts

### Manual Monitoring

**Every 5 minutes during incident**:
```bash
bash scripts/ci/monitor-runner-capacity.sh
```

**Queue depth**:
```bash
gh run list --status queued --limit 500 --json databaseId | jq 'length'
```

**Top queued workflows**:
```bash
gh run list --status queued --limit 100 --json workflowName | \
  jq -r '.[] | .workflowName' | sort | uniq -c | sort -rn | head -10
```

### Automated Monitoring (Cron)

**Setup saturation policy** (runs every 5 minutes):

```bash
# Add to crontab
crontab -e

# Add line:
*/5 * * * * cd /path/to/repo && bash scripts/ci/runner-saturation-policy.sh >> /tmp/saturation-policy.log 2>&1
```

**Status reports**: Auto-generated in `docs/ci/recovery-status-update.md`

### Alert Thresholds

| Metric | Warning | Critical |
|--------|---------|----------|
| Queue depth | >100 | >200 |
| Queue age | >30 min | >60 min |
| Failed runs | >10% | >25% |
| Runner utilization | <50% | <25% |

---

## Rollback Procedures

### Rollback: Workflow Consolidation

**If new system causes issues**:

1. **Restore archived workflows**
   ```bash
   mv .github/workflows/.archive/*.yml .github/workflows/
   ```

2. **Update branch protection**
   ```bash
   # Restore old required checks
   gh api -X PUT repos/BrianCLong/summit/branches/main/protection \
     --input /path/to/old-protection.json
   ```

3. **Remove path filtering**
   ```bash
   # Edit each workflow, remove paths: sections
   # Or restore from git history before consolidation
   git checkout <pre-consolidation-sha> -- .github/workflows/
   ```

4. **Deploy via PR**
   - Create PR with restored workflows
   - Merge with admin override if needed

**Estimated rollback time**: 15-30 minutes

### Rollback: Branch Protection

**If required checks cause issues**:

```bash
# Disable required checks temporarily
gh api -X PUT repos/BrianCLong/summit/branches/main/protection \
  -f required_status_checks='null'
```

**Re-enable after fixing**:

```bash
# Restore required checks
gh api -X PUT repos/BrianCLong/summit/branches/main/protection \
  --input /tmp/branch-protection-fixed.json
```

---

## Incident Report Template

```markdown
# CI Incident Report

**Date**: YYYY-MM-DD
**Duration**: HH:MM - HH:MM (X hours)
**Severity**: CRITICAL / WARNING / INFO
**Incident Commander**: Name

## Summary

Brief description of what happened.

## Timeline

| Time | Event |
|------|-------|
| HH:MM | Incident detected |
| HH:MM | Response initiated |
| HH:MM | Mitigation applied |
| HH:MM | Incident resolved |

## Impact

- Number of affected PRs:
- Number of affected developers:
- Time to merge increase:
- Developer productivity impact:

## Root Cause

Detailed explanation of what caused the incident.

## Resolution

What actions were taken to resolve the incident.

## Lessons Learned

1. What went well?
2. What could be improved?
3. What actions should we take?

## Action Items

- [ ] Item 1 (Owner: Name, Due: Date)
- [ ] Item 2 (Owner: Name, Due: Date)

## Metrics

- Queue depth at peak:
- Time to detect:
- Time to mitigate:
- Time to resolve:
```

---

## Prevention

### Daily Health Checks

```bash
# Run daily at 9am
bash scripts/ci/monitor-runner-capacity.sh

# Expected: HEALTHY or ELEVATED
# If WARNING or CRITICAL: Investigate
```

### Weekly Review

**Every Monday**:

1. Check workflow budget:
   ```bash
   node scripts/ci/workflow-budget-sentinel.mjs
   ```

2. Review queue metrics:
   ```bash
   # Average queue depth last week
   # Peak queue depth last week
   # Merge time trends
   ```

3. Identify slow workflows:
   ```bash
   gh run list --limit 100 --json workflowName,conclusion,createdAt,completedAt
   # Analyze duration trends
   ```

### Monthly Review

**First Monday of month**:

1. **Workflow audit**
   - Are all active workflows still needed?
   - Can any be consolidated?
   - Are path filters optimized?

2. **Cost analysis**
   - GitHub Actions minutes used
   - Cost per PR
   - Optimization opportunities

3. **Capacity planning**
   - Is budget sufficient?
   - Should we increase runner fleet?
   - Are we growing too fast?

---

## Escalation

### Level 1: Platform Engineer (You)

**Response time**: Immediate
**Actions**: Follow runbook, apply standard procedures
**Escalate if**: Can't resolve in 30 minutes

### Level 2: Platform Lead

**Contact**: @platform-lead in #platform-eng
**Response time**: 15 minutes
**Actions**: Override procedures, emergency changes
**Escalate if**: Requires architectural changes or budget approval

### Level 3: Engineering Leadership

**Contact**: @eng-leadership in #engineering
**Response time**: 30 minutes
**Actions**: Approve budget increases, resource allocation, org-wide holds
**Escalate if**: Impacts company-wide productivity or requires executive decision

---

## Appendix: Command Reference

### Queue Management

```bash
# Check queue depth
gh run list --status queued --limit 500 --json databaseId | jq 'length'

# Cancel all queued
bash scripts/ci/cancel-queued-runs.sh

# Cancel archived only
bash scripts/ci/cancel-archived-workflow-runs.sh

# Top queued workflows
gh run list --status queued --limit 100 --json workflowName | \
  jq -r '.[] | .workflowName' | sort | uniq -c | sort -rn
```

### Workflow Management

```bash
# List active workflows
ls .github/workflows/*.yml

# Check workflow budget
node scripts/ci/workflow-budget-sentinel.mjs

# Validate workflow syntax
gh workflow view <workflow-name>

# Trigger workflow manually
gh workflow run <workflow-name>
```

### Branch Protection

```bash
# Get current protection
gh api repos/BrianCLong/summit/branches/main/protection

# Get required checks
gh api repos/BrianCLong/summit/branches/main/protection --jq '.required_status_checks.contexts'

# Update required checks
gh api -X PUT repos/BrianCLong/summit/branches/main/protection \
  --input protection-config.json
```

### Monitoring

```bash
# Health check
bash scripts/ci/monitor-runner-capacity.sh

# Saturation policy
bash scripts/ci/runner-saturation-policy.sh

# Status report
cat docs/ci/recovery-status-update.md
```

---

**Last Updated**: 2026-03-04
**Maintained By**: Platform Team
**Review Cadence**: Monthly
