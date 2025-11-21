# Summit PR Triage and Consolidation Plan

**Date:** November 20, 2025
**Repository:** https://github.com/BrianCLong/summit
**Current Status:** 428 Open PRs
**Target:** <100 Open PRs
**Estimated Reduction:** 328+ PRs (76% reduction)

---

## Executive Summary

The Summit repository has accumulated 428 open PRs, with **57-74% being AI/bot-generated**. The largest concentration is a September 2025 batch of 200-250 "codex" PRs that are now 2-3 months old. Analysis reveals:

- **8 duplicate PRs** that can be immediately closed
- **30-40% of September batch** (~60-100 PRs) have blocking issues or are stale
- **15-20% of September batch** (~30-50 PRs) are merge candidates with minor fixes
- **Recent bot PRs** need targeted fixes before merge
- **Significant review bottleneck** requiring process improvements

This plan provides a **phased approach** to reduce open PRs to <100 while maintaining code quality and not missing valuable contributions.

---

## Phase 1: Immediate Actions (Week 1) - Target: 50 PR Closures

### 1.1 Close Duplicate PRs (8 PRs)

**Rationale:** Exact duplicates with no unique value; keeping both wastes review capacity.

| Close PR | Keep PR | Reason |
|----------|---------|--------|
| #1419 | None | Broken pnpm-lock.yaml (critical) |
| #1435 | None | Broken pnpm-lock.yaml (critical) |
| #1697 | #1698 | Key collision vulnerability |
| #1436 | #1425 | Training data overfitting issue more critical |
| #1434 | #1433 | #1433 is canonical codex version |
| #1422 | None | Hardcoded credentials (security) |
| #1423 | None | Hardcoded credentials (security) |
| #1418 | #1432 | #1432 has Copilot autofix available |

**Action Items:**
- [ ] Add comment to each "Close" PR explaining why it's being closed
- [ ] Reference the "Keep" PR where applicable
- [ ] Close all 8 PRs (or 6 if keeping #1698, #1425, #1433, #1432)
- [ ] For #1698, #1425, #1432, #1433: create follow-up issues for the bot-flagged problems

**Commands:**
```bash
# Template command for closing duplicates
gh pr close 1419 --comment "Closing duplicate PR. This PR has critical pnpm-lock.yaml corruption that breaks pnpm install. The lockfile was truncated from 39k to 241 lines. Neither this nor #1435 should be merged."

# Repeat for all 8 PRs with appropriate messages
```

### 1.2 Close Security-Vulnerable PRs Without Fixes (4 PRs)

**Rationale:** PRs with hardcoded credentials or critical security issues that haven't been addressed in 2+ months.

| PR | Issue | Days Open |
|----|-------|-----------|
| #1400 | Hardcoded credentials + merge conflicts | ~56 days |
| #1500 | Logs passwords in cleartext | ~56 days |
| (Already in duplicates) | #1422, #1423 | ~56 days |

**Action Items:**
- [ ] Close #1400, #1500 with security advisory
- [ ] Create new issues to track the features (without the security vulnerabilities)
- [ ] Recommend submitters review the new issue and resubmit with fixes

### 1.3 Close Stale September PRs with Merge Conflicts (Estimated 20-30 PRs)

**Rationale:** PRs that have significant conflicts with main and no recent activity.

**Identification Criteria:**
- Created Sep 24-27, 2025
- No updates in last 30 days
- Has merge conflicts
- No review comments

**Action Items:**
- [ ] Use GitHub CLI to identify PRs matching criteria:
  ```bash
  gh pr list --label codex --json number,title,updatedAt,mergeable \
    --jq '.[] | select(.updatedAt < "2025-10-20" and .mergeable == false)'
  ```
- [ ] Batch close with message: "Closing due to merge conflicts and staleness (60+ days without updates). The feature work in this PR is valuable, but conflicts with main have accumulated. Please rebase or create a fresh PR if this work is still relevant."

### 1.4 Fix and Merge Quick Wins (Estimated 10-15 PRs)

**Rationale:** Low-risk PRs with minor issues that can be quickly fixed.

**Candidates from September Batch:**
- #1480: Image detection pipeline (only unused import)
- #1670: SRPL macros and lint rule (no major issues)

**Candidates from Recent PRs:**
- Documentation PRs with no security or breaking changes
- Test coverage additions
- Minor bug fixes with passing CI

**Action Items:**
- [ ] Identify quick wins using:
  ```bash
  gh pr list --label "risk:low" --label "needs-review" \
    --json number,title,additions,deletions | \
    jq '.[] | select(.additions < 500)'
  ```
- [ ] For each quick win:
  1. Review changes (should take <15 min each)
  2. Request minor fixes if needed
  3. Approve and merge
  4. Aim for 2-3 per day over 5 days = 10-15 PRs

**Phase 1 Total: ~50 PR reductions (428 → 378)**

---

## Phase 2: September Batch Systematic Review (Weeks 2-3) - Target: 150 PR Closures/Merges

### 2.1 Categorize Remaining September PRs (~180-200 PRs)

**Strategy:** Systematic review using automated categorization.

**Categories:**

1. **Merge Candidates** (Estimated 30-50 PRs)
   - risk:low label
   - No security issues
   - No merge conflicts
   - Passing or fixable CI
   - Review effort ≤3/5

2. **Needs Fixes** (Estimated 50-70 PRs)
   - Valuable features
   - Bot-flagged issues that can be addressed
   - Willing maintainer/submitter
   - Review effort 4-5/5 but worth it

3. **Superseded** (Estimated 30-50 PRs)
   - Feature implemented elsewhere
   - Duplicates we haven't found yet
   - Replaced by newer PRs

4. **Won't Merge** (Estimated 40-60 PRs)
   - Architectural mismatch
   - Too risky
   - Out of scope
   - Security issues too deep to fix

5. **Undecided** (Remaining ~20-30 PRs)
   - Need deeper investigation
   - Defer to Phase 3

### 2.2 Automation Script

Create a triage automation script:

```bash
# scripts/triage-september-batch.sh
#!/bin/bash

# Fetch all codex PRs from September
gh pr list --label codex --limit 300 \
  --json number,title,createdAt,labels,additions,mergeable,reviews \
  > september-batch.json

# Categorize based on criteria
jq '.[] | select(.createdAt >= "2025-09-24" and .createdAt <= "2025-09-27") |
  select(.additions < 500 and (.labels[] | select(.name == "risk:low"))) |
  {number, title, category: "merge-candidate"}' september-batch.json

# ... similar for other categories
```

### 2.3 Batch Processing

**Week 2 Focus: Close Won't Merge + Superseded (70-110 PRs)**
- [ ] Review each categorization
- [ ] Add explanatory comments
- [ ] Close in batches of 10-20 per day
- [ ] Track closed PRs in spreadsheet for audit trail

**Week 3 Focus: Review and Merge Candidates (30-50 PRs)**
- [ ] Assign to reviewers (2-3 PRs per reviewer per day)
- [ ] Use stacked PR reviews where related
- [ ] Merge as approved
- [ ] Create issues for "Needs Fixes" category with checklist

**Phase 2 Total: ~150 PR reductions (378 → 228)**

---

## Phase 3: Recent PRs and Bot Fixes (Week 4) - Target: 80 PR Reductions

### 3.1 Fix Critical Bot PRs (4 PRs)

**High-value infrastructure PRs that need targeted fixes:**

| PR | Issue | Fix Effort | Priority |
|----|-------|-----------|----------|
| #11985 | Elasticsearch API bug | 30 min | P0 |
| #11977 | Prometheus metrics registration | 1 hour | P1 |
| #11886 | Rate limiting + conflicts | 2 hours | P0 |
| #11887 | CI status unknown | Check first | P2 |

**Action Items:**
- [ ] Create fix branches for each
- [ ] Submit fix commits
- [ ] Re-review and merge
- [ ] Close original PRs or merge with fixes

### 3.2 Split Bloated #10079 (1 → 4 PRs)

**Current:** 1 PR with 7,000+ lines claiming to fix 3 CI issues
**Target:** 4 focused PRs

**Action Items:**
- [ ] Create PR #1: Fix Gitleaks false positives (docs env vars)
- [ ] Create PR #2: Fix contract test OPA download conflict
- [ ] Create PR #3: Add missing Python test packages
- [ ] Create PR #4: Documentation updates (separate)
- [ ] Close #10079 with reference to new PRs
- [ ] Merge new PRs 1-3 immediately (critical CI fixes)

**Net: +3 PRs created, -1 closed, +3 merged = -1 total**

### 3.3 Triage Intelligence Platform Series (~30 PRs)

**Related PRs from November 2025:**
- Knowledge Graph Platform (#11963)
- Emerging Threats Platform (#11970)
- Real-time Stream Processing (#11962)
- Cyber Threat Intelligence (#11938)
- ~10 more similar

**Strategy:** These are ambitious "platform" PRs that likely overlap.

**Action Items:**
- [ ] Map dependencies and overlaps
- [ ] Identify which platforms are actually needed for roadmap
- [ ] Close platforms not on roadmap (estimated 15-20 PRs)
- [ ] Keep 3-5 core platforms for review
- [ ] Create epic/project for platform work

### 3.4 Review Remaining October PRs (~40 PRs)

**Focus:** PRs from October that aren't part of September batch.

**Action Items:**
- [ ] Use similar categorization as Phase 2
- [ ] These are more recent (1-2 months), higher priority than September
- [ ] Target: Merge 15-20, Close 15-20, Defer 5-10

**Phase 3 Total: ~80 PR reductions (228 → 148)**

---

## Phase 4: Sustainable State (Week 5+) - Target: 48 PR Reductions to <100

### 4.1 Establish PR Aging Policy

**New Policy (to prevent future backlog):**
- PRs without activity for 60 days → auto-comment asking for update
- PRs without activity for 90 days → auto-close with "stale" label
- Draft PRs without activity for 30 days → auto-comment
- Draft PRs without activity for 60 days → auto-close

**Action Items:**
- [ ] Configure GitHub Actions for stale bot
- [ ] Add policy to CONTRIBUTING.md
- [ ] Announce policy to team

### 4.2 Improve Bot PR Process

**Current Problem:** Bots create PRs that aren't reviewed before submission.

**New Process:**
- [ ] Bot PRs must be marked as Draft initially
- [ ] Human review required before marking "Ready for Review"
- [ ] Add bot PR checklist:
  - [ ] Code compiles and passes tests locally
  - [ ] No security issues flagged
  - [ ] Architectural fit validated
  - [ ] Dependencies version-compatible
  - [ ] Observability/metrics configured correctly

### 4.3 Batch Remaining PRs by Theme

**Remaining ~148 PRs should be organized by theme for easier review:**

**Suggested Themes:**
1. **Security & Auth** (~20 PRs) → Assign to security team
2. **ML/AI Infrastructure** (~25 PRs) → Assign to ML team
3. **Platform & Services** (~20 PRs) → Assign to platform team
4. **Observability & SRE** (~15 PRs) → Assign to SRE team
5. **Data Engineering** (~15 PRs) → Assign to data team
6. **Documentation** (~10 PRs) → Quick review and merge
7. **Bug Fixes** (~15 PRs) → Triage by severity
8. **Testing & Quality** (~10 PRs) → Review and merge where valuable
9. **Misc/Other** (~18 PRs) → Case-by-case review

**Action Items:**
- [ ] Label all PRs by theme using script
- [ ] Assign to team DRIs (Directly Responsible Individuals)
- [ ] Set SLO: Each team reviews assigned PRs within 2 weeks
- [ ] Target: Merge 25, Close 20, Defer 3 = ~48 more PRs processed

**Phase 4 Total: ~48 PR reductions (148 → 100)**

---

## Phase 5: Maintenance Mode (<100 PRs Sustained)

### 5.1 Weekly PR Triage Meeting

**Format:**
- 30-minute weekly sync
- Review all PRs > 14 days old
- Decide: Merge, Close, or Request Changes
- Assign reviewers for week ahead

### 5.2 PR Health Dashboard

**Metrics to Track:**
- Open PR count (target: <100)
- Average time-to-review (target: <7 days)
- Average time-to-merge (target: <14 days)
- PR abandonment rate (target: <20%)
- Bot PR vs Human PR ratio
- PRs by age bucket (<7d, 7-30d, 30-60d, 60-90d, 90d+)

**Action Items:**
- [ ] Create Grafana dashboard or GitHub insights dashboard
- [ ] Review metrics monthly
- [ ] Adjust policy as needed

### 5.3 Code Review Capacity

**Current Bottleneck:** 428 PRs / limited reviewers = massive backlog

**Solutions:**
- [ ] Identify 3-5 additional code reviewers across teams
- [ ] Implement reviewer rotation schedule
- [ ] Use GitHub auto-assignment for PR reviews
- [ ] Consider automated approval for "risk:low" + passing CI + Dependabot PRs

---

## Related PR Groups for Batch Review

Based on analysis, these PR groups should be reviewed together as they're related:

### Group A: Authentication & Authorization
- #11887: Auth Hardening & Step-up Auth V3
- #11886: API Security Hardening
- #11860: Harden IntelGraph Domain and API
- #11831: Harden Multi-Tenant Isolation
- #11826: Zero Trust Policy Enforcement
- #11825: Threat Model

**Recommendation:** Review in order listed (foundational → specific)

### Group B: Observability & SRE
- #11915: SLO-driven alerting
- #11912: Structured logging with correlation IDs
- #11857: Product & Engineering Analytics
- #11856: SLO Policy and Error Budgets
- #9800: Error-budget monitoring

**Recommendation:** Merge #11856 first (policy), then others can reference it

### Group C: ML/AI Operations
- #11968: MLOps Platform
- #11941: ML Model Registry
- #10154: Copilot multi-LLM routing
- #10091: Immutable training capsules

**Recommendation:** Establish architectural direction first, then review in dependency order

### Group D: Search & Analytics
- #11985: Search Infrastructure V2
- #11885: Real-time Analytics and Alerting

**Recommendation:** Fix #11985 Elasticsearch bug, then review together

### Group E: Workflow & Orchestration
- #11869: Switchboard Control Plane
- #11866: Maestro Conductor Improvements
- #11927: Workflow orchestration and task scheduling

**Recommendation:** Review architectural overlap, potentially merge concepts

### Group F: Data Engineering
- #11946: Multi-source data fusion ETL
- #11960: ETL Pipelines and Endpoint Caching
- #11962: Real-time Stream Processing Platform

**Recommendation:** Define data platform strategy first, then review

### Group G: Documentation
- #11934: Align documentation with actual capabilities
- #11863: October 2025 Board Pack
- #11859: Refine config and restore reference docs
- #11906: Data catalog & governance spine

**Recommendation:** Quick review and merge batch (low risk)

### Group H: Testing & Quality
- #11971: Test Coverage Analysis (118 test cases)
- #11865: Property-based testing with fast-check
- #11864: Spec-to-code traceability
- #11824: Cognitive bias scenario tests

**Recommendation:** Merge all (tests are valuable, low merge risk)

### Group I: Governance & Compliance
- Multiple September batch PRs covering:
  - Consent management
  - Privacy controls
  - GDPR compliance
  - Audit logging
  - Policy simulation

**Recommendation:** Dedicate 1-week sprint to governance PRs specifically

---

## PRs Blocked by CI/CD Issues (Jules' Fixes Required)

**Context:** You mentioned Jules has CI/CD fixes landing soon.

### Deployment Failures Pattern

**Affected PRs:** ~50-100 PRs show "deployment failed" status

**Common Issues:**
1. Docker build failures
2. Kubernetes deployment timeouts
3. Test environment connectivity issues
4. Secret/config loading errors

**Action Items:**
- [ ] Wait for Jules' CI/CD fixes to land
- [ ] Re-trigger CI/CD for affected PRs (use GitHub API):
  ```bash
  # After Jules' fixes land
  gh pr list --json number --jq '.[].number' | \
    xargs -I {} gh pr checks {} --watch --interval 30
  ```
- [ ] Identify PRs that pass CI after fixes
- [ ] Fast-track review for newly-passing PRs

### Test Flakiness

**Affected PRs:** ~20-30 PRs show intermittent test failures

**Action Items:**
- [ ] Catalog flaky tests from PR failures
- [ ] Fix flaky tests in main branch
- [ ] Rebase affected PRs onto fixed main
- [ ] Re-run CI

### CI Performance

**Issue:** Some PRs show 150-170 checks taking hours to complete

**Recommendation:**
- [ ] Review CI pipeline efficiency
- [ ] Parallelize test suites where possible
- [ ] Use test result caching
- [ ] Split checks into critical (blocking merge) vs nice-to-have (post-merge)

---

## Risk Mitigation

### High-Risk Areas Requiring Extra Scrutiny

1. **Authorization/Security PRs** - Must have security team sign-off
2. **Database Migration PRs** - Must be tested in staging
3. **API Contract Changes** - Must not break existing clients
4. **ML Model Changes** - Must include evaluation metrics
5. **Infrastructure Changes** - Must have rollback plan

### Rollback Plan

If a merged PR causes issues:
1. Immediate revert available for all merges
2. Track all merges in release notes
3. Monitor error rates for 24h post-merge
4. Automated rollback if error budget exceeded

---

## Success Metrics

### Quantitative Goals

| Metric | Current | Week 1 | Week 3 | Week 5 | Target |
|--------|---------|--------|--------|--------|--------|
| Open PRs | 428 | 378 | 228 | 148 | <100 |
| PRs >60 days | ~250 | ~200 | ~50 | 0 | 0 |
| Duplicate PRs | 8 | 0 | 0 | 0 | 0 |
| Security-blocked PRs | ~15 | ~10 | ~5 | 0 | 0 |
| Draft PRs >30 days | ~10 | ~5 | 0 | 0 | 0 |

### Qualitative Goals

- [ ] All team members understand PR aging policy
- [ ] Bot PR process documented and enforced
- [ ] PR health dashboard operational
- [ ] Weekly triage meetings established
- [ ] Code review capacity increased
- [ ] CI/CD pipeline reliable and fast

---

## Timeline Summary

| Phase | Duration | Focus | Target Reduction | Cumulative Total |
|-------|----------|-------|-----------------|------------------|
| **Phase 1** | Week 1 | Duplicates, security, quick wins | -50 PRs | 378 open |
| **Phase 2** | Weeks 2-3 | September batch systematic review | -150 PRs | 228 open |
| **Phase 3** | Week 4 | Recent PRs, bot fixes, platform series | -80 PRs | 148 open |
| **Phase 4** | Week 5+ | Theme-based batching, policy establishment | -48 PRs | <100 open |
| **Phase 5** | Ongoing | Maintenance mode | Sustain <100 | <100 open |

---

## Appendix A: Scripts and Automation

### Script 1: Identify Duplicate PRs

```bash
#!/bin/bash
# scripts/find-duplicate-prs.sh

gh pr list --state open --limit 500 --json number,title | \
  jq -r '.[] | "\(.title)|\(.number)"' | \
  sort | uniq -c -f1 | awk '$1 > 1 {print}' | \
  while read count title_and_number; do
    title=$(echo "$title_and_number" | cut -d'|' -f1)
    echo "Duplicate title: $title"
    gh pr list --state open --search "\"$title\" in:title" --json number,createdAt,labels
  done
```

### Script 2: Categorize September Batch

```bash
#!/bin/bash
# scripts/categorize-codex-prs.sh

gh pr list --label codex --limit 300 \
  --json number,title,createdAt,additions,labels,reviews,mergeable \
  | jq -r '.[] |
    select(.createdAt >= "2025-09-24" and .createdAt <= "2025-09-27") |
    if (.additions < 500 and ([.labels[].name] | contains(["risk:low"])) and .mergeable) then
      "MERGE_CANDIDATE|\(.number)|\(.title)"
    elif (.mergeable == false) then
      "HAS_CONFLICTS|\(.number)|\(.title)"
    elif ([.labels[].name] | contains(["risk:high"])) then
      "HIGH_RISK|\(.number)|\(.title)"
    else
      "NEEDS_REVIEW|\(.number)|\(.title)"
    end' | \
  awk -F'|' '{print $1 "\t" $2 "\t" $3}' | \
  sort
```

### Script 3: Bulk Close with Comment

```bash
#!/bin/bash
# scripts/bulk-close-prs.sh
# Usage: ./scripts/bulk-close-prs.sh pr_numbers.txt "Closing reason"

PR_LIST=$1
CLOSE_REASON=$2

while IFS= read -r pr_number; do
  echo "Closing PR #$pr_number..."
  gh pr close "$pr_number" --comment "$CLOSE_REASON"
  sleep 2  # Rate limiting
done < "$PR_LIST"
```

### Script 4: PR Health Dashboard Data

```bash
#!/bin/bash
# scripts/pr-health-metrics.sh

echo "PR Health Metrics Report - $(date)"
echo "=================================="

total=$(gh pr list --state open --limit 1000 --json number | jq 'length')
echo "Total Open PRs: $total"

echo ""
echo "Age Distribution:"
gh pr list --state open --limit 1000 --json createdAt | \
  jq -r '.[] | .createdAt' | \
  awk -v now="$(date +%s)" '{
    cmd = "date -d "$1" +%s"
    cmd | getline created
    close(cmd)
    age_days = (now - created) / 86400
    if (age_days < 7) print "0-7_days"
    else if (age_days < 30) print "7-30_days"
    else if (age_days < 60) print "30-60_days"
    else if (age_days < 90) print "60-90_days"
    else print "90+_days"
  }' | sort | uniq -c

echo ""
echo "By Author:"
gh pr list --state open --limit 1000 --json author | \
  jq -r '.[] | .author.login' | sort | uniq -c | sort -rn | head -10

echo ""
echo "By Label:"
gh pr list --state open --limit 1000 --json labels | \
  jq -r '.[] | .labels[].name' | sort | uniq -c | sort -rn | head -10
```

---

## Appendix B: Communication Templates

### Template 1: Closing Duplicate PR

```markdown
Thank you for this contribution! This PR is being closed because it's a duplicate of #{other_pr_number}.

**Reason:** Both PRs implement the same feature with similar code. To avoid splitting review effort, we're consolidating discussion and review on #{other_pr_number}.

If you have specific improvements or changes that differ from the other PR, please comment there or on this PR and we can reopen.

**Related:** #{other_pr_number}
```

### Template 2: Closing Stale PR

```markdown
This PR is being closed due to inactivity and merge conflicts with the main branch.

**Why:**
- Created: {date} ({X} days ago)
- Last updated: {date} ({Y} days without activity)
- Current status: Has merge conflicts with main branch

**The work in this PR is valuable**, but the codebase has evolved significantly. If this feature is still relevant, please consider:
1. Creating a fresh branch from main
2. Reimplementing with current architecture
3. Opening a new PR

Thank you for your contribution! If you believe this closure is in error, please comment and we can reopen.
```

### Template 3: Requesting Fixes for Bot PR

```markdown
Thank you for this PR! Automated review has identified some issues that need to be addressed before merge:

**Blocking Issues:**
- [ ] {issue 1}
- [ ] {issue 2}

**Non-blocking Improvements:**
- [ ] {issue 3}

Please address the blocking issues, and then request re-review. We're happy to help if you have questions!

**CC:** @{reviewer}
```

### Template 4: Batch Review Request

```markdown
Hi @{team},

I've identified a batch of {N} related PRs in the {topic} area that would benefit from coordinated review:

{list of PR numbers and titles}

**Suggested Review Order:**
1. #{pr} - {reason}
2. #{pr} - {reason}
...

**Timeline:** Aiming to complete review by {date}

Please let me know if you can help review, and I'll assign specific PRs. Thanks!
```

---

## Appendix C: Decision Log

### Key Decisions Made During Triage

| Decision | Rationale | Date | Decided By |
|----------|-----------|------|------------|
| Close PRs with lockfile corruption | Breaks build for all developers | 2025-11-20 | Triage team |
| Keep "codex" labeled version of duplicates | Canonical version from batch generation | 2025-11-20 | Triage team |
| Split #10079 into focused PRs | Scope creep makes review impossible | 2025-11-20 | Triage team |
| 90-day stale policy | Balance between patience and backlog management | 2025-11-20 | Triage team |
| Bot PRs must start as Draft | Require human validation before review request | 2025-11-20 | Triage team |

---

## Appendix D: Contacts and Responsibilities

### Triage Team

- **Lead:** {TBD}
- **Security Review:** {TBD}
- **Platform Team Rep:** {TBD}
- **ML Team Rep:** {TBD}
- **SRE Team Rep:** {TBD}

### Escalation Path

1. **Questions about specific PRs:** Comment on PR, tag @{lead}
2. **Policy questions:** Post in #engineering-process Slack channel
3. **Urgent security issues:** Immediately notify security team
4. **Process feedback:** Add to `PR_TRIAGE_RETROSPECTIVE.md`

---

**Last Updated:** 2025-11-20
**Next Review:** End of Week 1 (2025-11-27)
**Owner:** Engineering Leadership

