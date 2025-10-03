#!/usr/bin/env bash
# De-duplicate Project #8 by keeping first occurrence of each title
set -euo pipefail

OWNER="BrianCLong"
PROJECT="8"

echo "🔧 De-duplicating Project #8"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "⏳ This may take several minutes due to API rate limits..."
echo ""

# Export current state
echo "1. Exporting current project state..."
gh project item-list "$PROJECT" --owner "$OWNER" --limit 500 --format json > /tmp/project8_before_dedup.json

# Find duplicate titles
echo "2. Finding duplicates..."
jq -r '.items[]? | "\(.title)|\(.id)|\(.content.url)"' /tmp/project8_before_dedup.json | \
  awk -F'|' '{
    title=$1
    if (seen[title]++) {
      print $2"|"$3"|"title  # item_id|url|title for duplicates
    }
  }' > /tmp/duplicates_to_remove.txt

DUP_COUNT=$(wc -l < /tmp/duplicates_to_remove.txt | tr -d ' ')
echo "   Found $DUP_COUNT duplicate items"

if [ "$DUP_COUNT" -eq 0 ]; then
  echo "   ✅ No duplicates found - project is clean"
  exit 0
fi

# Remove duplicates from project (keep first occurrence)
echo "3. Removing duplicate items from project..."
removed=0
failed=0

while IFS='|' read -r item_id url title; do
  echo -n "   Removing: ${title:0:60}... "
  if gh project item-delete "$PROJECT" --owner "$OWNER" --id "$item_id" 2>&1 >/dev/null; then
    echo "✅"
    ((removed++))
  else
    echo "❌"
    ((failed++))
  fi
  sleep 0.5
done < /tmp/duplicates_to_remove.txt

# Final count
echo ""
echo "4. Verification..."
FINAL_COUNT=$(gh project item-list "$PROJECT" --owner "$OWNER" --limit 500 --format json | jq '.items | length')
echo "   Project #$PROJECT now has: $FINAL_COUNT items"

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Summary:"
echo "  Removed: $removed items"
echo "  Failed: $failed items"
echo "  Final count: $FINAL_COUNT items"
echo ""

if [ "$FINAL_COUNT" -eq 104 ]; then
  echo "✅ De-duplication complete - Project #8 is now at 104/104"
  exit 0
else
  echo "⚠️  Final count is $FINAL_COUNT (expected 104)"
  echo "   Run scripts/final-verification.sh for detailed analysis"
  exit 1
fi
