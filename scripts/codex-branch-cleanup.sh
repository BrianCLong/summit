#!/usr/bin/env bash
set -euo pipefail

# 🔥 CODEX BRANCH CLEANUP - Mass elimination of empty/stale codex branches
# Mission: Eliminate empty codex branches to achieve branch singularity

REPO=$(gh repo view --json nameWithOwner -q .nameWithOwner)
LOG_FILE="codex-cleanup-$(date +%Y%m%d-%H%M).log"

echo "🔥 CODEX BRANCH CLEANUP - MASS ELIMINATION" | tee "$LOG_FILE"
echo "Repository: $REPO" | tee -a "$LOG_FILE"
echo "Started: $(date)" | tee -a "$LOG_FILE"
echo "" | tee -a "$LOG_FILE"

# Get initial counts
INITIAL_BRANCHES=$(git branch -r | wc -l)
CODEX_BRANCHES=$(git branch -r | grep "codex/" | wc -l)

echo "📊 INITIAL STATE:" | tee -a "$LOG_FILE"
echo "   Total branches: $INITIAL_BRANCHES" | tee -a "$LOG_FILE"
echo "   Codex branches: $CODEX_BRANCHES" | tee -a "$LOG_FILE"
echo "" | tee -a "$LOG_FILE"

# Phase 1: Delete empty codex branches
echo "=== PHASE 1: DELETING EMPTY CODEX BRANCHES ===" | tee -a "$LOG_FILE"

DELETED_COUNT=0
PROCESSED_COUNT=0

git branch -r | grep "codex/" | sed 's/.*origin\///' | while read -r BRANCH_NAME; do
  PROCESSED_COUNT=$((PROCESSED_COUNT + 1))
  echo "[$PROCESSED_COUNT] Analyzing: $BRANCH_NAME" | tee -a "$LOG_FILE"
  
  # Check commits ahead of main
  COMMITS_AHEAD=$(git rev-list --count origin/main..origin/"$BRANCH_NAME" 2>/dev/null || echo "0")
  
  if [ "$COMMITS_AHEAD" -eq 0 ]; then
    echo "  💀 Empty branch - deleting" | tee -a "$LOG_FILE"
    
    if git push origin --delete "$BRANCH_NAME" 2>/dev/null; then
      echo "  ✅ Deleted: $BRANCH_NAME" | tee -a "$LOG_FILE"
      DELETED_COUNT=$((DELETED_COUNT + 1))
    else
      echo "  ❌ Failed to delete: $BRANCH_NAME" | tee -a "$LOG_FILE"
    fi
  elif [ "$COMMITS_AHEAD" -eq 1 ]; then
    # Check if single commit is just a merge or trivial
    COMMIT_MSG=$(git log -1 --format="%s" origin/"$BRANCH_NAME" 2>/dev/null || echo "")
    if echo "$COMMIT_MSG" | grep -qi "merge\|initial\|placeholder\|empty"; then
      echo "  💀 Trivial single commit - deleting" | tee -a "$LOG_FILE"
      
      if git push origin --delete "$BRANCH_NAME" 2>/dev/null; then
        echo "  ✅ Deleted trivial: $BRANCH_NAME" | tee -a "$LOG_FILE"
        DELETED_COUNT=$((DELETED_COUNT + 1))
      fi
    else
      echo "  🔄 Has 1 meaningful commit - preserving" | tee -a "$LOG_FILE"
    fi
  else
    echo "  🔄 Has $COMMITS_AHEAD commits - preserving" | tee -a "$LOG_FILE"
  fi
  
  # Rate limiting and batch processing
  if [ $((PROCESSED_COUNT % 10)) -eq 0 ]; then
    echo "  ⏸️ Processed $PROCESSED_COUNT branches, deleted $DELETED_COUNT" | tee -a "$LOG_FILE"
    sleep 2
  fi
  
  # Limit processing to avoid timeouts
  if [ "$PROCESSED_COUNT" -ge 50 ]; then
    echo "  🛑 Batch limit reached - stopping at 50 branches" | tee -a "$LOG_FILE"
    break
  fi
done

echo "" | tee -a "$LOG_FILE"
echo "=== PHASE 2: CONSOLIDATING SIMILAR CODEX BRANCHES ===" | tee -a "$LOG_FILE"

# Look for branches with similar names that might be duplicates
echo "Looking for potential duplicate patterns..." | tee -a "$LOG_FILE"

# Find branches with similar prefixes
git branch -r | grep "codex/" | sed 's/.*origin\/codex\///' | cut -d'-' -f1-2 | sort | uniq -c | sort -rn | head -10 | tee -a "$LOG_FILE"

# Phase 3: Prune and final cleanup
echo "" | tee -a "$LOG_FILE"
echo "=== PHASE 3: FINAL CLEANUP ===" | tee -a "$LOG_FILE"

# Prune deleted branches locally
git remote prune origin 2>/dev/null || true

# Get final counts
FINAL_BRANCHES=$(git branch -r | wc -l)
FINAL_CODEX=$(git branch -r | grep "codex/" | wc -l)

echo "📊 CLEANUP RESULTS:" | tee -a "$LOG_FILE"
echo "   Initial branches: $INITIAL_BRANCHES" | tee -a "$LOG_FILE"
echo "   Final branches: $FINAL_BRANCHES" | tee -a "$LOG_FILE"
echo "   Branch reduction: $((INITIAL_BRANCHES - FINAL_BRANCHES))" | tee -a "$LOG_FILE"
echo "   Initial codex branches: $CODEX_BRANCHES" | tee -a "$LOG_FILE"
echo "   Final codex branches: $FINAL_CODEX" | tee -a "$LOG_FILE"
echo "   Codex branches deleted: $((CODEX_BRANCHES - FINAL_CODEX))" | tee -a "$LOG_FILE"

if [ "$FINAL_BRANCHES" -lt 100 ]; then
  echo "" | tee -a "$LOG_FILE"
  echo "🎉 SIGNIFICANT BRANCH REDUCTION ACHIEVED!" | tee -a "$LOG_FILE"
  echo "✅ Approaching branch singularity: $FINAL_BRANCHES branches remaining" | tee -a "$LOG_FILE"
elif [ "$((INITIAL_BRANCHES - FINAL_BRANCHES))" -gt 20 ]; then
  echo "" | tee -a "$LOG_FILE"
  echo "🚀 GOOD PROGRESS: $((INITIAL_BRANCHES - FINAL_BRANCHES)) branches eliminated" | tee -a "$LOG_FILE"
  echo "🔄 Continue processing for complete singularity" | tee -a "$LOG_FILE"
fi

echo "" | tee -a "$LOG_FILE"
echo "✅ Codex branch cleanup complete" | tee -a "$LOG_FILE"