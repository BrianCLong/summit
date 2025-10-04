#!/usr/bin/env bash
# Verify all 9 bonus projects are fully populated
set -euo pipefail

OWNER="${1:-BrianCLong}"

echo "🔍 Verifying all 9 bonus GitHub Projects..."
echo ""

# Project numbers for the 9 bonus projects
PROJECTS=(10 11 12 13 14 15 16 17 18)

for PROJ in "${PROJECTS[@]}"; do
  TITLE=$(gh project view "$PROJ" --owner "$OWNER" --format json | jq -r '.title')
  ITEM_COUNT=$(gh project item-list "$PROJ" --owner "$OWNER" --format json --limit 100 | jq '.items | length')
  FIELD_COUNT=$(gh project field-list "$PROJ" --owner "$OWNER" --format json | jq '.fields | length')

  echo "📋 Project #$PROJ: $TITLE"
  echo "   Fields: $FIELD_COUNT"
  echo "   Items: $ITEM_COUNT"

  # Show sample items
  gh project item-list "$PROJ" --owner "$OWNER" --limit 3 --format json | jq -r '.items[] | "   - \(.content.title)"' 2>/dev/null || true
  echo ""
done

echo "✅ Verification complete!"
