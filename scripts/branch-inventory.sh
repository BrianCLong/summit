#!/usr/bin/env bash
# Complete branch inventory - ensures zero data loss
# Maps every branch to PR or creates tracking

set -euo pipefail

OUTPUT_FILE="branch-inventory-$(date +%Y%m%d-%H%M%S).csv"

echo "🔍 BRANCH INVENTORY: Cataloging all 461 branches..."
echo ""

# Header
echo "branch,has_pr,pr_number,pr_state,last_commit,last_commit_date,author,behind_main,ahead_main" > "$OUTPUT_FILE"

# Get all remote branches
git fetch --all --prune 2>/dev/null || true

git branch -r | grep -v 'HEAD' | sed 's|origin/||' | while read branch; do
  # Skip main
  if [ "$branch" = "main" ]; then
    continue
  fi

  # Check for associated PR
  PR_DATA=$(gh pr list --state all --head "$branch" --json number,state --jq '.[0] // {}' 2>/dev/null || echo '{}')

  HAS_PR=$(echo "$PR_DATA" | jq -r 'if .number then "true" else "false" end')
  PR_NUMBER=$(echo "$PR_DATA" | jq -r '.number // "N/A"')
  PR_STATE=$(echo "$PR_DATA" | jq -r '.state // "N/A"')

  # Get last commit info
  LAST_COMMIT=$(git rev-parse "origin/$branch" 2>/dev/null || echo "ERROR")
  if [ "$LAST_COMMIT" != "ERROR" ]; then
    LAST_DATE=$(git log -1 --format=%ci "origin/$branch" 2>/dev/null || echo "unknown")
    AUTHOR=$(git log -1 --format=%an "origin/$branch" 2>/dev/null || echo "unknown")

    # Calculate divergence from main
    BEHIND=$(git rev-list --count "origin/$branch..origin/main" 2>/dev/null || echo "0")
    AHEAD=$(git rev-list --count "origin/main..origin/$branch" 2>/dev/null || echo "0")
  else
    LAST_DATE="unknown"
    AUTHOR="unknown"
    BEHIND="0"
    AHEAD="0"
  fi

  echo "$branch,$HAS_PR,$PR_NUMBER,$PR_STATE,$LAST_COMMIT,$LAST_DATE,$AUTHOR,$BEHIND,$AHEAD" >> "$OUTPUT_FILE"
done

echo ""
echo "✅ Inventory complete: $OUTPUT_FILE"
echo ""

# Summary stats
TOTAL=$(tail -n +2 "$OUTPUT_FILE" | wc -l)
WITH_PR=$(tail -n +2 "$OUTPUT_FILE" | awk -F',' '$2=="true"' | wc -l)
WITHOUT_PR=$(tail -n +2 "$OUTPUT_FILE" | awk -F',' '$2=="false"' | wc -l)
OPEN_PRS=$(tail -n +2 "$OUTPUT_FILE" | awk -F',' '$3!="N/A" && $4=="OPEN"' | wc -l)
MERGED_PRS=$(tail -n +2 "$OUTPUT_FILE" | awk -F',' '$3!="N/A" && $4=="MERGED"' | wc -l)
CLOSED_PRS=$(tail -n +2 "$OUTPUT_FILE" | awk -F',' '$3!="N/A" && $4=="CLOSED"' | wc -l)

echo "📊 SUMMARY:"
echo "  Total branches: $TOTAL"
echo "  With PR: $WITH_PR"
echo "  Without PR: $WITHOUT_PR"
echo "    - Open PRs: $OPEN_PRS"
echo "    - Merged PRs: $MERGED_PRS"
echo "    - Closed PRs: $CLOSED_PRS"
echo ""
echo "⚠️  BRANCHES WITHOUT PRS (need tracking):"
tail -n +2 "$OUTPUT_FILE" | awk -F',' '$2=="false" {print "  - " $1}' | head -20
echo ""
echo "💡 Next: Review $OUTPUT_FILE and create tracking PRs or archive branches"