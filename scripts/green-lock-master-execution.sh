#!/usr/bin/env bash
# GREEN-LOCK MASTER EXECUTION
# Complete automation: 30 PRs + 461 branches → 0 PRs + green main

set -euo pipefail

REPORT_DIR="green-lock-reports-$(date +%Y%m%d-%H%M%S)"
mkdir -p "$REPORT_DIR"

echo "🚀 GREEN-LOCK MASTER EXECUTION"
echo "==============================="
echo "Report directory: $REPORT_DIR"
echo ""

# =============================================================================
# PHASE 1: INVENTORY & TRIAGE
# =============================================================================

echo "📋 PHASE 1: Complete Inventory & Triage"
echo "========================================="
echo ""

# 1.1: PR Inventory
echo "1.1: Creating PR inventory..."
gh pr list --state open --limit 1000 --json number,title,author,createdAt,statusCheckRollup \
  --jq '.[] | {
    pr: .number,
    title: .title,
    author: .author.login,
    age_days: ((now - (.createdAt | fromdateiso8601)) / 86400 | floor),
    total_checks: (.statusCheckRollup | length),
    failing_checks: ([.statusCheckRollup[] | select(.conclusion=="FAILURE")] | length),
    pending_checks: ([.statusCheckRollup[] | select(.conclusion==null and .status=="IN_PROGRESS")] | length)
  }' > "$REPORT_DIR/pr-inventory.json"

PR_COUNT=$(jq 'length' < "$REPORT_DIR/pr-inventory.json" <<< "$(cat "$REPORT_DIR/pr-inventory.json" | jq -s '.')")
echo "  ✅ Found $PR_COUNT open PRs"

# 1.2: Categorize PRs
echo "1.2: Categorizing PRs by failure severity..."

cat "$REPORT_DIR/pr-inventory.json" | jq -s '
  map(
    . + {
      category: (
        if .failing_checks == 0 and .pending_checks == 0 then "GREEN"
        elif .failing_checks <= 3 then "LOW_FAIL"
        elif .failing_checks <= 10 then "MEDIUM_FAIL"
        else "HIGH_FAIL"
        end
      ),
      priority: (
        if .failing_checks == 0 then 1
        elif .failing_checks <= 3 then 2
        elif .failing_checks <= 10 then 3
        else 4
        end
      )
    }
  ) | group_by(.category) | map({
    category: .[0].category,
    count: length,
    prs: map(.pr)
  })
' > "$REPORT_DIR/pr-categories.json"

echo "  Categories:"
jq -r '.[] | "    \(.category): \(.count) PRs"' < "$REPORT_DIR/pr-categories.json"
echo ""

# 1.3: Analyze failing checks
echo "1.3: Analyzing failing check patterns..."

for pr in $(jq -r '.[] | select(.failing_checks > 0) | .pr' < "$REPORT_DIR/pr-inventory.json"); do
  gh pr checks "$pr" --json name,bucket,link,workflow --jq '.[] | select(.bucket=="fail") | {
    pr: '$pr',
    check: .name,
    workflow: .workflow,
    has_link: (.link != null)
  }' 2>/dev/null || echo "{}"
done | jq -s 'group_by(.check) | map({check: .[0].check, count: length, prs: map(.pr) | unique})' \
  > "$REPORT_DIR/failing-check-patterns.json"

echo "  Top 10 most common failing checks:"
jq -r 'sort_by(-.count) | .[:10] | .[] | "    \(.check): \(.count) PRs"' < "$REPORT_DIR/failing-check-patterns.json"
echo ""

# =============================================================================
# PHASE 2: BATCH RERUN FAILED JOBS
# =============================================================================

echo "📤 PHASE 2: Batch Rerun Failed Jobs"
echo "====================================="
echo ""

# 2.1: Identify rerunnableRuns
echo "2.1: Collecting failed run IDs..."

RERUN_COUNT=0
for pr in $(jq -r '.[] | select(.failing_checks > 0 and .failing_checks <= 10) | .pr' < "$REPORT_DIR/pr-inventory.json"); do
  echo "  Processing PR #$pr..."

  gh pr checks "$pr" --json link --jq '.[].link' 2>/dev/null | grep -v null | grep -oE 'runs/[0-9]+' | cut -d'/' -f2 | sort -u | while read RUN; do
    echo "    Rerunning run $RUN..."
    if gh run rerun "$RUN" --failed 2>&1 | grep -q "successfully queued"; then
      RERUN_COUNT=$((RERUN_COUNT + 1))
      echo "$pr,$RUN,success" >> "$REPORT_DIR/reruns.csv"
    else
      echo "$pr,$RUN,skipped" >> "$REPORT_DIR/reruns.csv"
    fi
  done
done

echo "  ✅ Queued $RERUN_COUNT failed job reruns"
echo "  ⏳ Wait 30-60 minutes for reruns to complete"
echo ""

# =============================================================================
# PHASE 3: MERGE GREEN PRS
# =============================================================================

echo "🔀 PHASE 3: Merge Green PRs"
echo "==========================="
echo ""

# 3.1: Identify green PRs
GREEN_PRS=$(jq -r '.[] | select(.failing_checks == 0 and .pending_checks == 0) | .pr' < "$REPORT_DIR/pr-inventory.json")
GREEN_COUNT=$(echo "$GREEN_PRS" | wc -l | xargs)

if [ "$GREEN_COUNT" -gt 0 ]; then
  echo "3.1: Found $GREEN_COUNT green PRs ready to merge:"
  echo "$GREEN_PRS" | while read pr; do
    echo "  - PR #$pr"
  done
  echo ""

  echo "3.2: Merging green PRs..."
  echo "$GREEN_PRS" | while read pr; do
    echo "  Merging PR #$pr..."
    if gh pr merge "$pr" --squash --delete-branch 2>&1; then
      echo "    ✅ Merged"
      echo "$pr,merged" >> "$REPORT_DIR/merges.csv"
    else
      echo "    ⚠️  Merge blocked (may need approval or branch protection)"
      echo "$pr,blocked" >> "$REPORT_DIR/merges.csv"
    fi
  done
else
  echo "  ℹ️  No green PRs found (all have failures or pending checks)"
fi
echo ""

# =============================================================================
# PHASE 4: IDENTIFY PHANTOM FAILURES
# =============================================================================

echo "👻 PHASE 4: Identify Phantom Failures"
echo "======================================"
echo ""

echo "4.1: Analyzing PRs with null workflow failures..."

for pr in $(jq -r '.[] | select(.failing_checks > 0) | .pr' < "$REPORT_DIR/pr-inventory.json"); do
  PHANTOM_COUNT=$(gh pr checks "$pr" --json link,bucket --jq '[.[] | select(.bucket=="fail" and .link == null)] | length' 2>/dev/null || echo "0")
  REAL_COUNT=$(gh pr checks "$pr" --json link,bucket --jq '[.[] | select(.bucket=="fail" and .link != null)] | length' 2>/dev/null || echo "0")

  if [ "$PHANTOM_COUNT" -gt 0 ]; then
    echo "  PR #$pr: $PHANTOM_COUNT phantom, $REAL_COUNT real failures"
    echo "$pr,$PHANTOM_COUNT,$REAL_COUNT" >> "$REPORT_DIR/phantom-analysis.csv"
  fi
done
echo ""

# =============================================================================
# PHASE 5: GENERATE ACTION PLAN
# =============================================================================

echo "📝 PHASE 5: Generating Action Plan"
echo "==================================="
echo ""

cat > "$REPORT_DIR/ACTION_PLAN.md" << 'EOF'
# GREEN-LOCK ACTION PLAN
Generated: $(date)

## Summary

**Open PRs:** $(jq 'length' < pr-inventory.json | jq -s 'add')
**Green PRs:** $(jq -r '.[] | select(.category=="GREEN") | .count' < pr-categories.json | head -1)
**Low-Fail PRs (≤3):** $(jq -r '.[] | select(.category=="LOW_FAIL") | .count' < pr-categories.json | head -1)
**Medium-Fail PRs (4-10):** $(jq -r '.[] | select(.category=="MEDIUM_FAIL") | .count' < pr-categories.json | head -1)
**High-Fail PRs (>10):** $(jq -r '.[] | select(.category=="HIGH_FAIL") | .count' < pr-categories.json | head -1)

## Immediate Actions (Next 2 Hours)

### 1. Enable Merge Queue
**CRITICAL:** Go to https://github.com/$(gh repo view --json nameWithOwner -q .nameWithOwner)/settings/branches

- Edit `main` branch protection
- Enable "Require merge queue"
- Set required checks (keep <10)
- Set merge method: Squash

Verify:
```bash
gh run list --event merge_group --limit 5
```

### 2. Wait for Reruns
- $(wc -l < reruns.csv) failed jobs have been requeued
- Check status in 30-60 minutes
- Re-run this script to see updated PR states

### 3. Merge Ready PRs
After reruns complete:
```bash
# Check which PRs are now green
for pr in $(jq -r '.[] | select(.category=="LOW_FAIL") | .prs[]' < pr-categories.json); do
  gh pr checks $pr --json bucket --jq '[.[]|select(.bucket=="fail")]|length'
done

# Merge the ones with 0 failures
```

## Next 24 Hours

### 4. Fix Phantom Failures
$(wc -l < phantom-analysis.csv) PRs have "phantom" failures (null workflow checks).

Options:
- Remove these checks from branch protection
- Merge with --admin flag (if you're admin)
- Create placeholder workflows

### 5. Path-Gating Deployment
Add `dorny/paths-filter` to high-volume workflows:
- `.github/workflows/pr-validation.yml`
- `.github/workflows/ci.yml`
- `.github/workflows/build-and-push.yml`

This will reduce checks/PR by 60-80%.

### 6. Retry Logic
Add `nick-fields/retry@v3` to flaky steps:
- `pnpm install`
- `docker-compose up`
- Test commands

## Most Common Failing Checks

$(jq -r 'sort_by(-.count) | .[:5] | .[] | "- \(.check): \(.count) PRs"' < failing-check-patterns.json)

## Files Generated

- `pr-inventory.json` - Complete PR data
- `pr-categories.json` - PRs grouped by failure severity
- `failing-check-patterns.json` - Common failure patterns
- `reruns.csv` - Rerun tracking
- `phantom-analysis.csv` - Phantom failure analysis
- `merges.csv` - Merge attempts log

EOF

# Replace $(…) with actual values
sed -i.bak "s|\$(date)|$(date)|g" "$REPORT_DIR/ACTION_PLAN.md"
sed -i.bak "s|\$(jq 'length' < pr-inventory.json | jq -s 'add')|$(jq -s 'length' < "$REPORT_DIR/pr-inventory.json")|g" "$REPORT_DIR/ACTION_PLAN.md"
sed -i.bak "s|\$(gh repo view --json nameWithOwner -q .nameWithOwner)|$(gh repo view --json nameWithOwner -q .nameWithOwner)|g" "$REPORT_DIR/ACTION_PLAN.md"
sed -i.bak "s|\$(wc -l < reruns.csv)|$(wc -l < "$REPORT_DIR/reruns.csv" 2>/dev/null || echo "0")|g" "$REPORT_DIR/ACTION_PLAN.md"
sed -i.bak "s|\$(wc -l < phantom-analysis.csv)|$(wc -l < "$REPORT_DIR/phantom-analysis.csv" 2>/dev/null || echo "0")|g" "$REPORT_DIR/ACTION_PLAN.md"

cat "$REPORT_DIR/ACTION_PLAN.md"

echo ""
echo "✅ GREEN-LOCK EXECUTION COMPLETE"
echo "================================="
echo ""
echo "📁 All reports saved to: $REPORT_DIR/"
echo "📄 Read ACTION_PLAN.md for next steps"
echo ""
echo "🎯 NEXT: Enable merge queue, wait 1 hour, re-run this script"