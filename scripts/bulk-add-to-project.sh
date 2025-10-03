#!/usr/bin/env bash
# Bulk add sprint tracking issues to Project #8 with proper error handling
set -euo pipefail

PROJECT="${1:-8}"
OWNER="${2:-BrianCLong}"
START_ISSUE="${3:-9802}"
END_ISSUE="${4:-9882}"

echo "📊 Bulk Adding Issues #$START_ISSUE-#$END_ISSUE to Project #$PROJECT"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

added=0
skipped=0
failed=0

for issue_num in $(seq $START_ISSUE $END_ISSUE); do
  url="https://github.com/$OWNER/summit/issues/$issue_num"

  echo -n "Issue #$issue_num... "

  if output=$(gh project item-add "$PROJECT" --owner "$OWNER" --url "$url" 2>&1); then
    echo "✅"
    ((added++))
  else
    if echo "$output" | grep -qi "already exists"; then
      echo "⏭️  (already exists)"
      ((skipped++))
    elif echo "$output" | grep -qi "not found"; then
      echo "⏭️  (not found)"
      ((skipped++))
    else
      echo "❌ $output"
      ((failed++))
    fi
  fi

  # Rate limit: 2 seconds between requests
  sleep 2
done

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Summary:"
echo "  Added: $added"
echo "  Skipped: $skipped"
echo "  Failed: $failed"
echo ""

# Verify final count
FINAL=$(gh project item-list "$PROJECT" --owner "$OWNER" --format json | jq 'length')
echo "Project #$PROJECT now has: $FINAL items"

if [ $failed -eq 0 ]; then
  echo "✅ Bulk addition complete"
  exit 0
else
  echo "⚠️  Some additions failed (see above)"
  exit 1
fi
