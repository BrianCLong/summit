#!/usr/bin/env bash
# Add orphaned issues to Project #8 with rate-limit handling
set -euo pipefail

OWNER="${1:-BrianCLong}"
PROJECT="${2:-8}"
QUERY="repo:${OWNER}/summit is:issue state:open \"Part of Oct-Nov 2025\" in:body"

echo "🔧 Adding Orphaned Issues to Project #$PROJECT"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

TMP=$(mktemp)

# Get existing project items to avoid duplicates
echo "📋 Fetching existing project items..."
gh project item-list "$PROJECT" --owner "$OWNER" --format json | \
  jq -r '.items[]?.title // .[]?.title // empty' | \
  sed 's/\r$//' > "$TMP"

EXISTING=$(wc -l < "$TMP")
echo "  Existing in project: $EXISTING"

# Retry helper with exponential backoff
retry() {
  local n=0
  local max=6
  until "$@"; do
    s=$((2 ** n))
    n=$((n + 1))
    if [ $n -gt $max ]; then
      echo "    ❌ Max retries exceeded"
      return 1
    fi
    echo "    ⏳ Rate limit - retry in ${s}s (attempt $n/$max)"
    sleep $s
  done
}

# Process issues page by page
added=0
skipped=0
failed=0
PAGE=1

echo ""
echo "Processing issues..."

while :; do
  echo "  Page $PAGE..."

  JSON=$(gh issue list \
    --limit 100 \
    --state open \
    --search "$QUERY" \
    --page $PAGE \
    --json title,url 2>/dev/null || echo '[]')

  COUNT=$(jq length <<< "$JSON")

  if [ "$COUNT" -eq 0 ]; then
    echo "  No more issues found"
    break
  fi

  echo "  Found $COUNT issues on page $PAGE"

  jq -c '.[]' <<< "$JSON" | while read -r row; do
    title=$(jq -r .title <<< "$row")
    url=$(jq -r .url <<< "$row")

    # Skip if already in project
    if grep -Fxq "$title" "$TMP"; then
      echo "  SKIP: $title (already in project)"
      ((skipped++)) || true
      continue
    fi

    echo "  ADD:  $title"

    # Add to project with retry
    if retry gh project item-add "$PROJECT" --owner "$OWNER" --url "$url" 2>&1; then
      echo "    ✅ Added successfully"
      ((added++)) || true
      echo "$title" >> "$TMP"  # Track to avoid re-adding
    else
      echo "    ❌ Failed to add"
      ((failed++)) || true
    fi

    # Rate limit protection
    sleep 0.5
  done

  PAGE=$((PAGE + 1))
done

# Final verification
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Summary:"
echo "  Added: $added"
echo "  Skipped: $skipped"
echo "  Failed: $failed"
echo ""

FINAL_COUNT=$(gh project item-list "$PROJECT" --owner "$OWNER" --format json | jq '.items | length')
echo "Project #$PROJECT now has: $FINAL_COUNT items"

rm -f "$TMP"

if [ $failed -eq 0 ]; then
  echo "✅ All orphaned issues added to project"
  exit 0
else
  echo "⚠️  Some issues failed to add (see errors above)"
  exit 1
fi
