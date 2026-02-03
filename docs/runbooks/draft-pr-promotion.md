# Draft PR Promotion Runbook

**Owner:** Release Captain (rotating)
**Last Updated:** 2026-01-27
**Version:** 1.0

## Purpose

This runbook provides a standardized process for promoting Draft PRs to merge-ready state while maintaining audit-grade evidence and keeping the main branch stable.

---

## Prerequisites

- Git CLI
- Node.js 18+ with pnpm
- GitHub CLI (`gh`) - optional but recommended
- Write access to repository

## Bucket Definitions

| Bucket                    | Criteria                                              | Action                       |
| ------------------------- | ----------------------------------------------------- | ---------------------------- |
| **PROMOTE_NOW**           | Mergeable + checks green/neutral + small scope        | Promote immediately          |
| **FIX_TO_PROMOTE**        | Likely small fixes needed (conflicts, minor CI fails) | Fix and promote              |
| **NEEDS_OWNER**           | Unclear intent / large scope / missing context        | Assign to owner for decision |
| **STALE_CLOSE_CANDIDATE** | Very old + no activity + superseded                   | Close with label             |

---

## Phase 0: Establish Baseline

Before starting, create a session report to capture all actions.

```bash
# Create reports directory
mkdir -p reports/draft_promotion

# Capture baseline
SESSION_ID=$(date +"%Y-%m-%d_%H%M")
cat > reports/draft_promotion/SESSION_${SESSION_ID}.md << 'EOF'
# Draft PR Promotion Session
Date: $(date)
Release Captain: [Your Name]

## Baseline
- pwd: $(pwd)
- git branch: $(git rev-parse --abbrev-ref HEAD)
- latest commit: $(git log -1 --oneline)
EOF

# Ensure on latest main
git fetch --all --prune
git checkout main
git pull --ff-only
git status
```

---

## Phase 1: Inventory Draft PRs

### With gh CLI (preferred)

```bash
# Check auth status
gh auth status

# Generate draft inventory
gh pr list --draft --limit 200 \
  --json number,title,author,updatedAt,headRefName,baseRefName,mergeable,state,statusCheckRollup,labels,url \
  > reports/draft_promotion/drafts.json

# Generate human-readable summary
node scripts/gh/draft_promotion_report.mjs
```

### Without gh CLI (fallback)

```bash
# List remote branches with unmerged commits
for branch in $(git branch -r --sort=-committerdate | head -50 | grep -v HEAD | grep -v main); do
  ahead=$(git rev-list --count origin/main..$branch 2>/dev/null || echo "0")
  if [ "$ahead" -gt "0" ] && [ "$ahead" -lt "100" ]; then
    date=$(git log -1 --format='%cs' $branch 2>/dev/null)
    subject=$(git log -1 --format='%s' $branch 2>/dev/null | cut -c1-60)
    echo "| $branch | $ahead | $date | $subject |"
  fi
done
```

---

## Phase 2: Triage

For each PR, assign to exactly one bucket with rationale.

### Triage Checklist

- [ ] How many commits ahead of main?
- [ ] What files are changed? (`git diff --stat origin/main...$BRANCH`)
- [ ] Is it docs-only? (low risk)
- [ ] Are there merge conflicts?
- [ ] When was it last updated?
- [ ] Is there related work that supersedes it?

### Output Template

```markdown
## PROMOTE_NOW

1. branch-name - Rationale: small fix, 2 files changed

## FIX_TO_PROMOTE

1. branch-name - Rationale: needs rebase, otherwise ready

## NEEDS_OWNER

1. branch-name - Rationale: 50+ commits, unclear scope

## STALE_CLOSE_CANDIDATE

1. branch-name - Rationale: 6 months old, superseded by newer work
```

---

## Phase 3: Execute Promotion

Work branches one at a time. Never have parallel edits.

### Per-Branch Workflow

```bash
PR_NUMBER=123
BRANCH_NAME="feature/example"

# 1. Checkout
gh pr checkout $PR_NUMBER
# OR
git checkout origin/$BRANCH_NAME -b $BRANCH_NAME-local

# 2. Rebase onto main
git fetch origin
git rebase origin/main
# If conflicts: resolve minimally or bucket as NEEDS_OWNER

# 3. Run gates
pnpm -w install --frozen-lockfile
pnpm -w lint
pnpm -w typecheck
pnpm -w test

# 4. Fix issues (if any)
# Make smallest fix commits with clear messages

# 5. Push
git push origin $BRANCH_NAME --force-with-lease

# 6. Promote (if using gh CLI)
gh pr ready $PR_NUMBER
gh pr comment $PR_NUMBER --body "Promoted to ready. Verified: install, lint, typecheck pass."
```

### Stop Conditions

- Rebase conflicts that require domain knowledge
- Test failures that need investigation
- Disk/ENOSPC errors (environment issue)
- Missing dependencies (environment issue)

---

## Phase 4: Document Results

Update session report with:

1. Commands run per branch
2. Failures encountered
3. Final status for each PR:
   - `READY` - Promoted successfully
   - `READY_PENDING_CI` - Locally verified, awaiting CI
   - `DEFERRED` - Moved to different bucket with reason

---

## Quick Reference Commands

```bash
# Check branch diff against main
git diff --stat origin/main...origin/$BRANCH

# Count commits ahead of main
git rev-list --count origin/main...origin/$BRANCH

# List changed files in branch
git diff --name-only origin/main...origin/$BRANCH

# Promote PR to ready (gh CLI)
gh pr ready $PR_NUMBER

# Add label (gh CLI)
gh pr edit $PR_NUMBER --add-label "needs-owner"

# Close stale PR (gh CLI)
gh pr close $PR_NUMBER --comment "Closing as stale. Superseded by #XXX."
```

---

## Troubleshooting

### Pre-existing lint/typecheck failures on main

- Document baseline failures
- Branch is promotion-ready if it doesn't introduce NEW failures
- File issue to fix baseline

### gh CLI not available

- Use git-only fallback commands
- Document limitation in session report
- Promotion must be done via GitHub UI

### Disk space issues

- Document error
- Skip PR and move to next
- Do not attempt workarounds

---

## Related Documents

- [Release Captain Guide](./release-captain.md)
- [CI Core Workflow](../.github/workflows/ci-core.yml)
- [reports/draft_promotion/](../../reports/draft_promotion/)
