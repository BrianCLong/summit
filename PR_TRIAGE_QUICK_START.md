# PR Triage Quick Start Guide

**Goal:** Reduce 428 open PRs to <100
**Timeline:** 5 weeks
**Start Date:** 2025-11-20

---

## Week 1 Actions - DO THESE FIRST

### Day 1: Close Duplicates (8 PRs)

```bash
# 1. Close broken lockfile PRs (critical build breakers)
gh pr close 1419 --comment "Closing: Critical pnpm-lock.yaml corruption. Lockfile truncated from 39k to 241 lines, breaking pnpm install. Neither #1419 nor #1435 should be merged without fixing the lockfile."
gh pr close 1435 --comment "Closing: Critical pnpm-lock.yaml corruption. Same issue as #1419. Lockfile truncated, breaking pnpm install."

# 2. Close security-vulnerable duplicates
gh pr close 1422 --comment "Closing: Gitleaks detected hardcoded credentials in secrets-rotation-guide.md. Both #1422 and #1423 have this security issue. Please rotate credentials and resubmit with proper secrets management."
gh pr close 1423 --comment "Closing: Gitleaks detected hardcoded credentials in secrets-rotation-guide.md. Same security issue as #1422. Please rotate credentials and resubmit."

# 3. Close other duplicates (keep better versions)
gh pr close 1697 --comment "Closing: Duplicate of #1698. Bot flagged P1 key collision risk (colon delimiter issue) in this PR. Keeping #1698 which has a more recent update and fixable rollback issue."
gh pr close 1436 --comment "Closing: Duplicate of #1425. Both implement AutoML pipeline, but #1425 caught a more critical issue (metrics evaluated on training data, not validation sets). Keeping #1425 to address overfitting risk."
gh pr close 1434 --comment "Closing: Duplicate of #1433. Both are identical documentation PRs. Keeping #1433 as the canonical 'codex' labeled version."
gh pr close 1418 --comment "Closing: Duplicate of #1432. Both have CodeQL security issues (log injection, path traversal), but #1432 has Copilot autofix suggestions available. Keeping #1432 for easier remediation."

# Expected result: 428 → 420 open PRs
```

**Time Required:** 30 minutes

---

### Day 2: Close Security Issues (2 additional PRs)

```bash
# Close PRs with unresolved security vulnerabilities (2+ months old)
gh pr close 1400 --comment "Closing: Multiple security and merge issues - hardcoded credentials, permission errors, and merge conflicts with main. This PR is 56 days old without updates. Please create a fresh PR from main with proper secrets management if this feature is still needed."

gh pr close 1500 --comment "Closing: Security issue - graph migration tooling logs passwords in cleartext (P1). This PR is 56 days old. Please reimplement with proper secrets handling (env vars, vault) and resubmit."

# Expected result: 420 → 418 open PRs
```

**Time Required:** 15 minutes

---

### Day 3: Identify and Close Stale PRs with Conflicts (20-30 PRs)

```bash
# 1. Generate list of candidates
gh pr list --label codex --limit 300 \
  --json number,title,updatedAt,mergeable,createdAt \
  --jq '.[] | select(.createdAt >= "2025-09-24" and .createdAt <= "2025-09-27") | select(.updatedAt < "2025-10-20" and .mergeable == false) | "\(.number)|\(.title)"' \
  > stale-conflicted-prs.txt

# 2. Review the list (manual step - verify these should be closed)
cat stale-conflicted-prs.txt

# 3. Close in batches
cat stale-conflicted-prs.txt | cut -d'|' -f1 | while read pr; do
  echo "Closing PR #$pr..."
  gh pr close "$pr" --comment "Closing due to merge conflicts and staleness (60+ days without updates). The feature work in this PR is valuable, but conflicts with main have accumulated. Please rebase or create a fresh PR from current main if this work is still relevant. Tag @BrianCLong if you need help."
  sleep 2
done

# Expected result: 418 → ~390 open PRs
```

**Time Required:** 1-2 hours (includes manual review)

---

### Days 4-5: Merge Quick Wins (10-15 PRs)

```bash
# 1. Identify quick win candidates
gh pr list --label "risk:low" --json number,title,additions,labels,mergeable \
  --jq '.[] | select(.additions < 500 and .mergeable) | "\(.number)|\(.title)|\(.additions)"' \
  > quick-wins.txt

# 2. Review each manually (goal: 2-3 per day)
# For each PR in quick-wins.txt:
#   - Open PR in browser
#   - Review changes (should take <15 min)
#   - Check CI status
#   - Approve if good, request changes if minor issues
#   - Merge when approved

# Specific known quick wins:
# - #1480: Image detection pipeline (only unused import - trivial fix)
# - #1670: SRPL macros and lint rule (no major issues)
# - Documentation PRs with no breaking changes
# - Test coverage additions (Group H from main plan)

# 3. Merge command (after approval):
gh pr merge {NUMBER} --squash --delete-branch

# Expected result: ~390 → ~378 open PRs
```

**Time Required:** 2-3 hours spread over 2 days

---

## Week 1 Summary

**Starting:** 428 open PRs
**Ending:** ~378 open PRs
**Reduction:** ~50 PRs (12%)
**Effort:** ~5-8 hours total

**Achievement unlocked:** 🎯 Quick wins completed, foundation set for systematic review

---

## Week 2-3 Prep: Categorize September Batch

Before starting Week 2, run the categorization script:

```bash
# Create the script
cat > scripts/categorize-codex-prs.sh << 'EOF'
#!/bin/bash
# Categorize September batch PRs

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
    elif (.reviews | length > 0) then
      "HAS_REVIEWS|\(.number)|\(.title)"
    else
      "NEEDS_REVIEW|\(.number)|\(.title)"
    end' | sort > september-batch-categorized.txt

# Summary statistics
echo "=== September Batch Summary ==="
awk -F'|' '{print $1}' september-batch-categorized.txt | sort | uniq -c
EOF

chmod +x scripts/categorize-codex-prs.sh
./scripts/categorize-codex-prs.sh
```

**Output will show:**
- How many merge candidates
- How many have conflicts
- How many are high risk
- How many need review

This data drives Week 2-3 systematic review.

---

## Critical PRs Needing Immediate Attention

### P0: Fix These Bot PRs (High Value)

| PR | Issue | How to Fix | Time |
|----|-------|-----------|------|
| #11985 | Elasticsearch API bug | Change `if (existsResponse)` to `if (existsResponse.body)` in createIndex method | 30 min |
| #11886 | Missing rate limiting + conflicts | 1) Rebase, 2) Add rate limiter to auth routes | 2 hrs |

```bash
# After fixing locally:
git checkout -b fix/elasticsearch-api-bug
# Make changes
git commit -m "fix: correct Elasticsearch v9 API usage in createIndex"
git push -u origin fix/elasticsearch-api-bug
gh pr create --title "fix: Elasticsearch v9 API compatibility" --body "Fixes the API bug in #11985"

# Then close or update original PR
gh pr comment 11985 --body "Fixed in #{NEW_PR_NUMBER}"
```

### P1: Split Bloated #10079

This PR claims to fix 3 CI issues but actually contains 7,000+ lines across 16 commits.

**Action:**
```bash
# Create focused CI fix PR
git checkout main
git checkout -b fix/ci-issues-gitleaks-opa-python

# Cherry-pick only the CI-related commits from #10079
# (You'll need to identify the specific commit SHAs)
git cherry-pick {GITLEAKS_FIX_SHA}
git cherry-pick {OPA_FIX_SHA}
git cherry-pick {PYTHON_DEPS_SHA}

git push -u origin fix/ci-issues-gitleaks-opa-python
gh pr create --title "fix: resolve Gitleaks, OPA, and Python dependency CI failures" \
  --body "Extracted from #10079. Focused PR containing only the 3 CI fixes without additional scope."

# Close #10079 with explanation
gh pr close 10079 --comment "Closing this PR due to scope creep (16 commits, 7000+ lines vs claimed 3 CI fixes). The valuable CI fixes have been extracted to #{NEW_PR_NUMBER}. Other changes (docs, observability, release artifacts) should be submitted as separate focused PRs."
```

---

## Testing & Group H Quick Merge

These are high-value, low-risk test additions that can be merged quickly:

```bash
# Test coverage PRs (from Group H in main plan)
gh pr view 11971  # Test Coverage Analysis - 118 test cases
gh pr view 11865  # Property-based testing with fast-check
gh pr view 11864  # Spec-to-code traceability
gh pr view 11824  # Cognitive bias scenario tests

# Review and merge these quickly (tests are valuable, low risk)
# For each:
gh pr review {NUMBER} --approve --body "LGTM - test coverage improvements are valuable and low risk."
gh pr merge {NUMBER} --squash --delete-branch
```

**Expected:** 4 quick merges = easy wins

---

## Scripts Reference

All scripts are in `/home/user/summit/PR_TRIAGE_PLAN.md` Appendix A.

**Most useful:**
1. `scripts/find-duplicate-prs.sh` - Find more duplicates
2. `scripts/categorize-codex-prs.sh` - Categorize September batch
3. `scripts/bulk-close-prs.sh` - Close PRs in bulk with same message
4. `scripts/pr-health-metrics.sh` - Generate health dashboard data

---

## Communication Tips

### When closing PRs:
✅ **DO:**
- Explain why clearly
- Thank contributor
- Offer path forward (rebase, resubmit, etc.)
- Reference related PRs or issues

❌ **DON'T:**
- Close without comment
- Be dismissive of the work
- Forget to check for valuable code that should be salvaged

### Template for September batch closures:

```markdown
Thank you for this PR! As part of our PR backlog triage, we're reviewing the September 2025 batch of ~250 PRs.

**This PR is being closed because:** {specific reason}

**If this feature is still relevant:**
- Please rebase on current main (2+ months of changes)
- Address any bot-flagged issues: {list issues}
- Resubmit as a fresh PR
- Tag @BrianCLong for prioritization

The work here is appreciated, and we want to make sure good contributions don't get lost in the backlog!
```

---

## Success Metrics for Week 1

Track daily progress:

```bash
# Run at end of each day
echo "$(date): $(gh pr list --state open --json number | jq 'length') open PRs"
```

**Target trajectory:**
- Day 1: 420 open PRs (closed 8 duplicates)
- Day 2: 418 open PRs (closed 2 security issues)
- Day 3: ~390 open PRs (closed 20-30 stale conflicted)
- Day 4: ~385 open PRs (merged 5 quick wins)
- Day 5: ~378 open PRs (merged 7 more quick wins)

**Week 1 Goal: 378 or fewer open PRs** ✅

---

## Need Help?

- **Questions:** Comment on relevant PR or Slack #engineering
- **Blockers:** Tag @BrianCLong
- **Security concerns:** Immediately notify security team
- **Process feedback:** Add notes to `PR_TRIAGE_RETROSPECTIVE.md`

---

## Related Documents

- **Full Plan:** `/home/user/summit/PR_TRIAGE_PLAN.md`
- **Analysis:** `/home/user/summit/PR_ANALYSIS.md`
- **Scripts:** `PR_TRIAGE_PLAN.md` Appendix A

---

**Last Updated:** 2025-11-20
**Owner:** Engineering Team

**Let's ship it! 🚀**
