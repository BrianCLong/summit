#!/usr/bin/env bash
# Apply de-duplication removals from review CSV
set -euo pipefail
OWNER="${1:-BrianCLong}"
PROJ_NUM="${2:-8}"
CSV="${3:-artifacts/duplicates_review.csv}"
MODE="${4:-dry-run}"  # "dry-run" or "apply"

if [[ ! -f "$CSV" ]]; then
  echo "❌ Review CSV not found: $CSV"
  exit 1
fi

echo "🛡️  Mode: $MODE"
echo "📄 Review file: $CSV"
echo ""

# Validate CSV has decisions
if ! grep -q "KEEP" "$CSV" || ! grep -q "REMOVE" "$CSV"; then
  echo "⚠️  CSV must have at least one KEEP and one REMOVE action"
  echo "   Please edit $CSV and try again"
  exit 1
fi

# Resolve ProjectV2 ID
echo "🔍 Resolving Project #$PROJ_NUM node ID..."
proj_id=$(gh api graphql -f query='
  query($login:String!, $number:Int!) {
    user(login:$login) { projectV2(number:$number){ id title } }
  }' -F login="$OWNER" -F number="$PROJ_NUM" --jq '.data.user.projectV2.id' 2>/dev/null)

if [[ -z "$proj_id" || "$proj_id" == "null" ]]; then
  echo "❌ Could not resolve ProjectV2 id for @$OWNER / #$PROJ_NUM"
  exit 1
fi

echo "  Project ID: $proj_id"
echo ""

to_remove=0
to_keep=0
removed=0
failed=0

# Process removals
echo "Processing removals..."
tail -n +2 "$CSV" | while IFS=, read -r group_key pid issue_number issue_url title keep_action note; do
  if [[ "$keep_action" == "KEEP" ]]; then
    ((to_keep++)) || true
    continue
  fi

  if [[ "$keep_action" != "REMOVE" ]]; then
    continue
  fi

  ((to_remove++)) || true

  echo "  #$issue_number: ${title:0:60}..."

  if [[ "$MODE" == "dry-run" ]]; then
    echo "    [DRY-RUN] Would remove from project"
    continue
  fi

  # Remove from project via GraphQL
  if gh api graphql -f query='
    mutation($projectId:ID!, $itemId:ID!) {
      deleteProjectV2Item(input:{projectId:$projectId, itemId:$itemId}) { deletedItemId }
    }' -F projectId="$proj_id" -F itemId="$pid" >/dev/null 2>&1; then
    echo "    ✅ Removed from project"
    ((removed++)) || true
  else
    echo "    ❌ Failed to remove"
    ((failed++)) || true
  fi

  # Close the duplicate issue
  if gh issue close "$issue_number" --reason "not_planned" --comment "Duplicate issue - consolidated into primary tracker entry" >/dev/null 2>&1; then
    echo "    ✅ Issue closed"
  fi

  sleep 0.5
done

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Summary:"
echo "  To keep: $to_keep items"
echo "  To remove: $to_remove items"

if [[ "$MODE" == "apply" ]]; then
  echo "  Successfully removed: $removed items"
  echo "  Failed: $failed items"
  echo ""

  # Final verification
  FINAL_COUNT=$(gh project item-list "$PROJ_NUM" --owner "$OWNER" --limit 500 --format json 2>/dev/null | jq '.items | length' 2>/dev/null || echo "?")
  echo "  Final Project #$PROJ_NUM count: $FINAL_COUNT"

  if [[ "$FINAL_COUNT" == "104" ]]; then
    echo ""
    echo "✅ De-duplication complete! Project #$PROJ_NUM is now at 104/104"
  else
    echo ""
    echo "⚠️  Final count is $FINAL_COUNT (expected 104)"
  fi
else
  echo ""
  echo "  (Dry-run: no changes made)"
  echo ""
  echo "To apply these changes, run:"
  echo "  scripts/project8-dedupe-apply.sh BrianCLong 8 $CSV apply"
fi
