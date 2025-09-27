#!/usr/bin/env bash
set -euo pipefail

# 🔍 Phase 0: Comprehensive Repository State Validation
# Mission: Get accurate counts of all PRs and branches to confirm scope

REPO=$(gh repo view --json nameWithOwner -q .nameWithOwner)
LOG_FILE="phase0-validation-$(date +%Y%m%d-%H%M).log"

echo "🔍 PHASE 0: COMPREHENSIVE REPOSITORY STATE VALIDATION" | tee "$LOG_FILE"
echo "Repository: $REPO" | tee -a "$LOG_FILE"
echo "Started: $(date)" | tee -a "$LOG_FILE"
echo "" | tee -a "$LOG_FILE"

echo "== Repo: $REPO ==" | tee -a "$LOG_FILE"

echo "-- Open PRs Analysis --" | tee -a "$LOG_FILE"
gh pr list --state open --limit 1000 --json number,headRefName,headRepositoryOwner,maintainerCanModify,isDraft,mergeable,createdAt,updatedAt \
| jq '[.[] | {
    number,
    headRefName,
    owner:.headRepositoryOwner.login,
    maintainerCanModify,
    isDraft,
    mergeable,
    age_days:((now-(.updatedAt|fromdate))/86400|floor)
  }] | {
    total_count: length,
    mergeable_count: ([.[] | select(.mergeable == "MERGEABLE")] | length),
    draft_count: ([.[] | select(.isDraft)] | length),
    by_age: (group_by(.age_days|floor)|map({
      age_days:(.[0].age_days),
      count:length
    }|select(.count>0)) | sort_by(.age_days))
  }' | tee -a "$LOG_FILE"

echo "" | tee -a "$LOG_FILE"
echo "-- Total Branch Count --" | tee -a "$LOG_FILE"
TOTAL_BRANCHES=$(gh api -H "Accept: application/vnd.github+json" "repos/$REPO/branches?per_page=100" --paginate | jq -r '.[].name' | wc -l)
echo "Total branches: $TOTAL_BRANCHES" | tee -a "$LOG_FILE"

echo "" | tee -a "$LOG_FILE" 
echo "-- Orphan Branches Analysis (branches without PRs) --" | tee -a "$LOG_FILE"
ORPHANS=$(mktemp)

# Get all branches except protected ones, check for PR existence
gh api "repos/$REPO/branches?per_page=100" --paginate | jq -r '.[].name' \
| grep -Ev '^(main|master|develop|integrate/|gh-pages|release/.*|rc.*)$' \
| while read -r BR; do
  if ! gh pr list --search "head:$BR" --json number | jq -e 'length>0' >/dev/null 2>&1; then 
    echo "$BR" >> "$ORPHANS"
    echo "Found orphan: $BR" | tee -a "$LOG_FILE"
  fi
done

ORPHAN_COUNT=$(wc -l < "$ORPHANS" 2>/dev/null || echo 0)
echo "Total orphan branches: $ORPHAN_COUNT" | tee -a "$LOG_FILE"

echo "" | tee -a "$LOG_FILE"
echo "-- Branch Age Analysis --" | tee -a "$LOG_FILE"
# Sample branch ages (expensive operation, so limit to orphans)
if [ "$ORPHAN_COUNT" -gt 0 ]; then
  echo "Analyzing ages of first 20 orphan branches:" | tee -a "$LOG_FILE"
  head -20 "$ORPHANS" | while read -r BR; do
    LAST_COMMIT=$(git log -1 --format="%ad" --date=short "origin/$BR" 2>/dev/null || echo "unknown")
    DAYS_OLD=$(($(date +%s) - $(date -d "$LAST_COMMIT" +%s 2>/dev/null || echo $(date +%s))) / 86400))
    echo "  $BR: last commit $LAST_COMMIT (${DAYS_OLD} days old)" | tee -a "$LOG_FILE"
  done 2>/dev/null || echo "  (Some branches may be inaccessible)" | tee -a "$LOG_FILE"
fi

echo "" | tee -a "$LOG_FILE"
echo "-- Repository Health Metrics --" | tee -a "$LOG_FILE"

# Current health score
CURRENT_HEALTH=$(node scripts/merge-metrics-dashboard.js 2>/dev/null | grep -o 'Health Score: [0-9]\+' | cut -d' ' -f3 || echo "unknown")
echo "Current health score: $CURRENT_HEALTH/100" | tee -a "$LOG_FILE"

# Auto-merge status
AUTO_MERGE_ENABLED=$(gh pr list --state open --limit 1000 --json number,autoMergeRequest | jq '[.[] | select(.autoMergeRequest != null)] | length')
TOTAL_OPEN=$(gh pr list --state open --limit 1000 --json number | jq length)
echo "Auto-merge enabled: $AUTO_MERGE_ENABLED/$TOTAL_OPEN PRs" | tee -a "$LOG_FILE"

# CI health
RECENT_RUNS=$(gh run list --limit 50 --json conclusion 2>/dev/null | jq length || echo 0)
if [ "$RECENT_RUNS" -gt 0 ]; then
  SUCCESS_RUNS=$(gh run list --limit 50 --json conclusion | jq '[.[] | select(.conclusion == "success")] | length')
  CI_HEALTH=$((SUCCESS_RUNS * 100 / RECENT_RUNS))
  echo "CI health: $CI_HEALTH% ($SUCCESS_RUNS/$RECENT_RUNS recent runs successful)" | tee -a "$LOG_FILE"
else
  echo "CI health: No recent runs found" | tee -a "$LOG_FILE"
fi

echo "" | tee -a "$LOG_FILE"
echo "-- Summary Statistics --" | tee -a "$LOG_FILE"
echo "📊 VALIDATION COMPLETE:" | tee -a "$LOG_FILE"
echo "   Total Open PRs: $TOTAL_OPEN" | tee -a "$LOG_FILE"
echo "   Total Branches: $TOTAL_BRANCHES" | tee -a "$LOG_FILE"
echo "   Orphan Branches: $ORPHAN_COUNT" | tee -a "$LOG_FILE"
echo "   Auto-merge Coverage: $AUTO_MERGE_ENABLED/$TOTAL_OPEN ($(echo "$AUTO_MERGE_ENABLED * 100 / $TOTAL_OPEN" | bc 2>/dev/null || echo 0)%)" | tee -a "$LOG_FILE"
echo "   Current Health: $CURRENT_HEALTH/100" | tee -a "$LOG_FILE"

# Determine scope for processing
TOTAL_WORK_ITEMS=$((TOTAL_OPEN + ORPHAN_COUNT))
echo "" | tee -a "$LOG_FILE"
echo "🎯 SCOPE ASSESSMENT:" | tee -a "$LOG_FILE"
echo "   Total work items to process: $TOTAL_WORK_ITEMS" | tee -a "$LOG_FILE"
echo "   Estimated tranches (N=40): $(echo "($TOTAL_WORK_ITEMS + 39) / 40" | bc)" | tee -a "$LOG_FILE"
echo "   Estimated time (6 workers): $(echo "($TOTAL_WORK_ITEMS + 5) / 6 * 2" | bc) minutes" | tee -a "$LOG_FILE"

# Export results for next phases
cat > "validation-results.json" << EOF
{
  "validation_timestamp": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "repository": "$REPO",
  "total_open_prs": $TOTAL_OPEN,
  "total_branches": $TOTAL_BRANCHES,
  "orphan_branches": $ORPHAN_COUNT,
  "auto_merge_enabled": $AUTO_MERGE_ENABLED,
  "health_score": ${CURRENT_HEALTH:-0},
  "total_work_items": $TOTAL_WORK_ITEMS,
  "estimated_tranches": $(echo "($TOTAL_WORK_ITEMS + 39) / 40" | bc),
  "orphan_branches_file": "$ORPHANS",
  "log_file": "$LOG_FILE"
}
EOF

echo "" | tee -a "$LOG_FILE"
if [ "$TOTAL_OPEN" -gt 200 ] || [ "$TOTAL_BRANCHES" -gt 400 ]; then
  echo "⚠️  LARGE SCALE OPERATION CONFIRMED" | tee -a "$LOG_FILE"
  echo "   This repository requires comprehensive absorption" | tee -a "$LOG_FILE"  
  echo "   Proceeding to Phase 1: Orphan PR creation" | tee -a "$LOG_FILE"
else
  echo "✅ MODERATE SCALE OPERATION" | tee -a "$LOG_FILE"
  echo "   Standard processing will suffice" | tee -a "$LOG_FILE"
fi

# Cleanup
rm -f "$ORPHANS"

echo "✅ Phase 0 Complete - Repository state validated" | tee -a "$LOG_FILE"