# Merge Train Runbook

**Purpose:** Maintain high throughput and low risk when merging many PRs concurrently.

**Owner:** DevEx Team
**Last Updated:** 2025-10-14

---

## Overview

The merge train is an automated system that processes and merges PRs based on CI status, conflict state, and size. It operates continuously but requires periodic maintenance and monitoring.

### Current Metrics (as of 2025-10-14)
- **95 PRs merged** via automated train
- **343 PRs open** (target: <150)
- **~57% conflict rate** on aged PRs (target: <20%)
- **Multiple CI failures** on lint/test guards

---

## Merge Lanes

PRs are automatically categorized into lanes based on size and risk:

### Express Lane
- **Criteria:** <100 LOC delta, green CI, no conflicts, `merge-train:express` label
- **Policy:** Auto-merge on green (no human approval required)
- **Use for:** Bug fixes, typos, config tweaks, dependency patches

### Standard Lane
- **Criteria:** <500 LOC delta, green CI, `merge-train:standard` label
- **Policy:** Requires 1 reviewer approval before merge
- **Use for:** Features, refactors, moderate changes

### Manual Lane
- **Criteria:** Everything else (>500 LOC, conflicts, CI failures, breaking changes)
- **Policy:** Requires 2+ approvals, manual merge
- **Use for:** Architecture changes, high-risk features, API breaking changes

---

## Daily Operations

### Morning Cycle (Run at ~8 AM)

```bash
# 1. Check merge train health
gh pr list --state open --limit 500 --json number | jq 'length'

# 2. Auto-label lanes
scripts/label-merge-lanes.sh

# 3. Merge express lane (automated)
# This happens via GitHub Actions - just monitor

# 4. Review standard lane approvals
gh pr list --state open --label "merge-train:standard" --json number,reviewDecision,title
```

### Afternoon Cycle (Run at ~2 PM)

```bash
# 1. Check for new conflicts after morning merges
gh pr list --state open --json number,mergeable | jq '.[] | select(.mergeable == "CONFLICTING") | .number'

# 2. Triage stale PRs
DRY_RUN=1 scripts/triage-conflicting-prs.sh  # Preview first
scripts/triage-conflicting-prs.sh             # Then execute

# 3. Spot-check CI failures
gh pr list --state open --limit 20 --json number,title,statusCheckRollup
```

---

## Weekly Sprint (Friday 10-11 AM)

60-minute focused session to clear the manual lane backlog:

### Preparation (Before Sprint)
```bash
# Generate hotspot report
scripts/conflict-hotspot-report.sh

# List manual lane candidates
gh pr list --state open --label "merge-train:manual" --limit 50 \
  --json number,title,author,createdAt,additions,deletions

# Identify aged PRs (>30 days)
gh pr list --state open --limit 500 --json number,createdAt \
  --jq '.[] | select((.createdAt | fromdateiso8601) < (now - 2592000)) | .number' | wc -l
```

### During Sprint
1. **10 min:** Review hotspot report, update CODEOWNERS if needed
2. **30 min:** Batch review manual lane PRs (assign, approve, or request changes)
3. **10 min:** Close stale PRs with no activity (>90 days + conflicts)
4. **10 min:** Merge approved manual lane PRs

### After Sprint
```bash
# Measure progress
echo "PRs merged this week:"
gh pr list --state merged --search "merged:>=$(date -d '7 days ago' +%Y-%m-%d)" --limit 500 | wc -l

# Update metrics dashboard (if available)
scripts/update-merge-metrics.sh
```

---

## Policies

### Developer Limits
- **Max 3 open PRs per developer** at any time
- Must close/merge 1 PR before opening a 4th
- Enforced via pre-submit hook (coming soon)

### Stale PR Policy
- **Drafts:** Auto-close after 30 days of inactivity
- **Conflicts:** Label `needs-rebase`, comment with instructions, 14-day grace period
- **Aged PRs:** >90 days old + inactive → close with salvage option

### CODEOWNERS & Edit Queues
- **Hot files** (top 10 from hotspot report) require owner approval
- **Edit queues:** For critical paths (e.g., `ci.yml`), serialize changes via labels
- **Feature flags:** Prefer flags over direct edits to high-traffic code

---

## Automation Scripts

### `/scripts/triage-conflicting-prs.sh`
Labels and comments on PRs with conflicts >90 days old.

**Usage:**
```bash
# Dry run to preview
DRY_RUN=1 scripts/triage-conflicting-prs.sh

# Execute
scripts/triage-conflicting-prs.sh
```

### `/scripts/conflict-hotspot-report.sh`
Generates report of files with most change contention.

**Usage:**
```bash
# Last 90 days, top 20 files
scripts/conflict-hotspot-report.sh

# Custom: 30 days, top 10
scripts/conflict-hotspot-report.sh 30 10
```

### `/scripts/label-merge-lanes.sh`
Auto-labels PRs into express/standard/manual lanes (to be created).

### `.github/workflows/auto-resolve-conflicts.yml`
Automatically regenerates lockfiles when conflicts are detected.

---

## Monitoring & Alerts

### Key Metrics (Weekly Review)

```bash
# Open PR count
gh pr list --state open --limit 500 | jq 'length'

# Average PR age (days)
gh pr list --state open --limit 500 --json createdAt | \
  jq 'map((now - (.createdAt | fromdateiso8601)) / 86400) | add / length'

# Conflict rate
TOTAL=$(gh pr list --state open --limit 500 | jq 'length')
CONFLICTS=$(gh pr list --state open --limit 500 --json mergeable | jq '[.[] | select(.mergeable == "CONFLICTING")] | length')
echo "scale=2; $CONFLICTS / $TOTAL * 100" | bc

# Merges per day (7-day avg)
gh pr list --state merged --search "merged:>=$(date -d '7 days ago' +%Y-%m-%d)" \
  --limit 500 | jq 'length / 7'
```

### Alert Thresholds
- 🔴 **Critical:** >400 open PRs, >60% conflict rate, <10 merges/day
- 🟡 **Warning:** >250 open PRs, >40% conflict rate, <25 merges/day
- 🟢 **Healthy:** <150 open PRs, <20% conflict rate, >40 merges/day

---

## Troubleshooting

### Problem: CI queue is backed up (many PRs stuck in QUEUED)
**Solution:**
- Check GitHub Actions concurrency limits in repo settings
- Consider splitting fast lane into parallel jobs
- Prioritize express lane PRs with `workflow_dispatch` triggers

### Problem: High conflict rate persists (>50%)
**Solution:**
- Run hotspot report, add CODEOWNERS
- Implement edit queues for top 5 hot files
- Encourage smaller, more frequent PRs
- Use feature flags to reduce direct edits

### Problem: Many CI failures on lint/test guards
**Solution:**
- Enable pre-merge lint autofix bot
- Add `.only` detector to pre-commit hooks
- Document common failures in PR template
- Run `npm run lint:tests` before `git push`

### Problem: Merge train stops processing
**Solution:**
- Check GitHub Actions workflow status
- Verify permissions (contents: write, pull-requests: write)
- Review recent failed workflow runs
- Manually trigger via `workflow_dispatch` if needed

---

## Success Criteria

### Short-term (2 weeks)
- [ ] Open PRs: 343 → ~200
- [ ] Conflict rate: 57% → 40%
- [ ] Merges/day: ~95/wk → 150/wk possible

### Medium-term (1 month)
- [ ] Open PRs: <150 steady state
- [ ] Conflict rate: <30%
- [ ] Autonomous merge rate: 30-50 PRs/day

### Long-term (3 months)
- [ ] Open PRs: <100 steady state
- [ ] Conflict rate: <20%
- [ ] Time-to-merge: <3 days average
- [ ] Automated merges: >80% of total

---

## Resources

- **Merge Train Dashboard:** (TODO: link when available)
- **CI Workflow:** `.github/workflows/_reusable-ci-fast.yml`
- **Hotspot Report:** `/tmp/hotspot-report.csv` (regenerate weekly)
- **Engineering Handbook:** (link to broader process docs)

---

## Changelog

- **2025-10-14:** Initial runbook created, 95 PRs merged in first train run
- *(future updates will be tracked here)*
