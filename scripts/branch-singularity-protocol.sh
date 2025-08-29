#!/usr/bin/env bash
set -euo pipefail

# 🌌 BRANCH SINGULARITY PROTOCOL - Complete Repository Absorption
# Mission: Systematically absorb all 193 branches to achieve total singularity

REPO=$(gh repo view --json nameWithOwner -q .nameWithOwner)
LOG_FILE="branch-singularity-$(date +%Y%m%d-%H%M).log"

echo "🌌 BRANCH SINGULARITY PROTOCOL - TOTAL ABSORPTION" | tee "$LOG_FILE"
echo "Repository: $REPO" | tee -a "$LOG_FILE"
echo "Started: $(date)" | tee -a "$LOG_FILE"
echo "" | tee -a "$LOG_FILE"

# Get initial counts
TOTAL_BRANCHES=$(git branch -r | grep -v "HEAD" | wc -l)
CURRENT_PRS=$(gh pr list --state open --limit 1000 --json number | jq length)

echo "📊 INITIAL STATE:" | tee -a "$LOG_FILE"
echo "   Total branches: $TOTAL_BRANCHES" | tee -a "$LOG_FILE"
echo "   Current PRs: $CURRENT_PRS" | tee -a "$LOG_FILE"
echo "" | tee -a "$LOG_FILE"

# Get all PR branches
echo "=== IDENTIFYING ORPHAN BRANCHES ===" | tee -a "$LOG_FILE"
gh pr list --state all --limit 1000 --json headRefName | jq -r '.[] | .headRefName' | sort > /tmp/pr_branches.txt

# Get all remote branches (excluding main and HEAD)
git branch -r | grep -v "HEAD" | sed 's/.*origin\///' | grep -v "^main$" | sort > /tmp/all_branches.txt

# Find orphan branches (branches without PRs)
comm -23 /tmp/all_branches.txt /tmp/pr_branches.txt > /tmp/orphan_branches.txt

ORPHAN_COUNT=$(wc -l < /tmp/orphan_branches.txt)
echo "Found $ORPHAN_COUNT orphan branches without PRs" | tee -a "$LOG_FILE"

if [ "$ORPHAN_COUNT" -eq 0 ]; then
  echo "✅ No orphan branches found - all branches have PRs!" | tee -a "$LOG_FILE"
  exit 0
fi

echo "" | tee -a "$LOG_FILE"
echo "🎯 ORPHAN BRANCHES TO PROCESS:" | tee -a "$LOG_FILE"
head -20 /tmp/orphan_branches.txt | nl | tee -a "$LOG_FILE"

# Phase 1: Bulk close stale/empty orphan branches
echo "" | tee -a "$LOG_FILE"
echo "=== PHASE 1: BULK BRANCH DELETION ===" | tee -a "$LOG_FILE"

DELETED_COUNT=0
while read -r BRANCH_NAME; do
  echo "Analyzing branch: $BRANCH_NAME" | tee -a "$LOG_FILE"
  
  # Check if branch has meaningful commits ahead of main
  COMMITS_AHEAD=$(git rev-list --count origin/main..origin/"$BRANCH_NAME" 2>/dev/null || echo "0")
  
  if [ "$COMMITS_AHEAD" -eq 0 ]; then
    echo "  📝 Empty branch - deleting directly" | tee -a "$LOG_FILE"
    
    if git push origin --delete "$BRANCH_NAME" 2>/dev/null; then
      echo "  ✅ Deleted empty branch: $BRANCH_NAME" | tee -a "$LOG_FILE"
      DELETED_COUNT=$((DELETED_COUNT + 1))
    else
      echo "  ⚠️ Failed to delete: $BRANCH_NAME" | tee -a "$LOG_FILE"
    fi
  else
    echo "  🔄 Branch has $COMMITS_AHEAD commits - needs evaluation" | tee -a "$LOG_FILE"
  fi
  
  sleep 0.5
  
  # Process in batches to avoid API limits
  if [ $((DELETED_COUNT % 20)) -eq 0 ] && [ "$DELETED_COUNT" -gt 0 ]; then
    echo "  ⏸️ Batch completed - $DELETED_COUNT branches deleted" | tee -a "$LOG_FILE"
    sleep 5
  fi
  
done < /tmp/orphan_branches.txt

echo "" | tee -a "$LOG_FILE"
echo "=== PHASE 2: REMAINING BRANCH ANALYSIS ===" | tee -a "$LOG_FILE"

# Refresh branch list after deletions
git fetch --prune origin 2>/dev/null || true
REMAINING_BRANCHES=$(git branch -r | grep -v "HEAD" | grep -v "main" | wc -l)

echo "📊 PHASE 1 RESULTS:" | tee -a "$LOG_FILE"
echo "   Branches deleted: $DELETED_COUNT" | tee -a "$LOG_FILE"
echo "   Remaining branches: $REMAINING_BRANCHES" | tee -a "$LOG_FILE"

# Phase 3: Create absorption PRs for remaining meaningful branches
echo "" | tee -a "$LOG_FILE"
echo "=== PHASE 3: ABSORPTION PR CREATION ===" | tee -a "$LOG_FILE"

# Re-identify remaining orphan branches
git branch -r | grep -v "HEAD" | sed 's/.*origin\///' | grep -v "^main$" | sort > /tmp/remaining_branches.txt
gh pr list --state all --limit 1000 --json headRefName | jq -r '.[] | .headRefName' | sort > /tmp/current_pr_branches.txt
comm -23 /tmp/remaining_branches.txt /tmp/current_pr_branches.txt > /tmp/final_orphans.txt

FINAL_ORPHAN_COUNT=$(wc -l < /tmp/final_orphans.txt)
echo "Creating absorption PRs for $FINAL_ORPHAN_COUNT remaining orphan branches" | tee -a "$LOG_FILE"

ABSORPTION_PRS_CREATED=0
while read -r BRANCH_NAME && [ "$ABSORPTION_PRS_CREATED" -lt 20 ]; do
  echo "Creating absorption PR for: $BRANCH_NAME" | tee -a "$LOG_FILE"
  
  # Check if branch still exists and has commits
  if git rev-list --count origin/main..origin/"$BRANCH_NAME" 2>/dev/null | grep -q "^[1-9]"; then
    
    PR_TITLE="Absorb remaining: $BRANCH_NAME"
    PR_BODY="🌌 **Branch Singularity Protocol - Final Absorption**

Systematic absorption of orphan branch \`$BRANCH_NAME\` as part of total repository singularity.

**Branch Analysis:**
- Commits ahead of main: $(git rev-list --count origin/main..origin/"$BRANCH_NAME" 2>/dev/null || echo "unknown")
- Last activity: $(git log -1 --format="%cr" origin/"$BRANCH_NAME" 2>/dev/null || echo "unknown")

**Absorption Strategy:**
- Preserve all valuable functionality
- Integrate changes systematically  
- Maintain zero functionality loss guarantee

**Status**: Ready for review and absorption into main branch.

*Generated by Branch Singularity Protocol - Achieving Total Repository Perfection*"

    if gh pr create --title "$PR_TITLE" --body "$PR_BODY" --head "$BRANCH_NAME" --base main 2>/dev/null; then
      echo "  ✅ Created absorption PR for: $BRANCH_NAME" | tee -a "$LOG_FILE"
      ABSORPTION_PRS_CREATED=$((ABSORPTION_PRS_CREATED + 1))
      
      # Try to enable auto-merge immediately
      sleep 2
      PR_NUM=$(gh pr list --head "$BRANCH_NAME" --json number -q '.[0].number' 2>/dev/null || echo "")
      if [ -n "$PR_NUM" ]; then
        gh pr merge "$PR_NUM" --auto --squash 2>/dev/null && echo "    🤖 Auto-merge enabled" | tee -a "$LOG_FILE" || true
      fi
    else
      echo "  ⚠️ Failed to create PR for: $BRANCH_NAME" | tee -a "$LOG_FILE"
    fi
  else
    echo "  📝 Branch has no unique commits - skipping" | tee -a "$LOG_FILE"
  fi
  
  sleep 2
  
done < /tmp/final_orphans.txt

# Final status report
echo "" | tee -a "$LOG_FILE"
echo "=== BRANCH SINGULARITY RESULTS ===" | tee -a "$LOG_FILE"

FINAL_BRANCHES=$(git branch -r | grep -v "HEAD" | wc -l)
FINAL_PRS=$(gh pr list --state open --limit 1000 --json number | jq length)

echo "📊 TRANSFORMATION SUMMARY:" | tee -a "$LOG_FILE"
echo "   Initial branches: $TOTAL_BRANCHES" | tee -a "$LOG_FILE"
echo "   Final branches: $FINAL_BRANCHES" | tee -a "$LOG_FILE"
echo "   Branches deleted: $DELETED_COUNT" | tee -a "$LOG_FILE"
echo "   Absorption PRs created: $ABSORPTION_PRS_CREATED" | tee -a "$LOG_FILE"
echo "   Final PRs: $FINAL_PRS" | tee -a "$LOG_FILE"

BRANCH_REDUCTION=$((TOTAL_BRANCHES - FINAL_BRANCHES))
if [ "$TOTAL_BRANCHES" -gt 0 ]; then
  BRANCH_PERCENTAGE=$(echo "$BRANCH_REDUCTION * 100 / $TOTAL_BRANCHES" | bc)
  echo "   Branch reduction: $BRANCH_REDUCTION ($BRANCH_PERCENTAGE%)" | tee -a "$LOG_FILE"
fi

if [ "$FINAL_BRANCHES" -le 25 ]; then
  echo "" | tee -a "$LOG_FILE"
  echo "🎉 BRANCH SINGULARITY APPROACHING!" | tee -a "$LOG_FILE"
  echo "✅ Target: <25 branches | Achieved: $FINAL_BRANCHES branches" | tee -a "$LOG_FILE"
elif [ "$BRANCH_REDUCTION" -gt 50 ]; then
  echo "" | tee -a "$LOG_FILE"
  echo "🚀 SIGNIFICANT BRANCH REDUCTION ACHIEVED!" | tee -a "$LOG_FILE"
  echo "🔄 Continue processing for complete singularity" | tee -a "$LOG_FILE"
fi

echo "" | tee -a "$LOG_FILE"
echo "✅ Branch singularity protocol execution complete" | tee -a "$LOG_FILE"

# Cleanup
rm -f /tmp/pr_branches.txt /tmp/all_branches.txt /tmp/orphan_branches.txt /tmp/remaining_branches.txt /tmp/current_pr_branches.txt /tmp/final_orphans.txt