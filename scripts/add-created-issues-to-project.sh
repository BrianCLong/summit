#!/usr/bin/env bash
# Add all created sprint tracking issues to Project #8
set -euo pipefail

PROJECT="${1:-8}"
OWNER="${2:-BrianCLong}"

echo "📊 Adding all sprint tracking issues to Project #$PROJECT"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

added=0
skipped=0
failed=0

# Get all open issues with [workstream] prefix pattern
gh issue list --limit 100 --state open --json number,title,url | \
  jq -r '.[] | select(.title | startswith("[")) | @json' | \
  while read -r issue_json; do
    title=$(jq -r .title <<< "$issue_json")
    url=$(jq -r .url <<< "$issue_json")

    echo "Processing: $title"

    # Try to add to project
    if gh project item-add "$PROJECT" --owner "$OWNER" --url "$url" 2>&1 | grep -q "already exists\|Added"; then
      echo "  ✅ Added (or already exists)"
      ((added++)) || true
    else
      echo "  ⚠️  Failed"
      ((failed++)) || true
    fi

    # Rate limit protection
    sleep 0.5
  done

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Summary:"
echo "  Processed: $((added + failed))"
echo "  Failed: $failed"
echo ""

# Verify final count
FINAL=$(gh project item-list "$PROJECT" --owner "$OWNER" --format json | jq 'length')
echo "Project #$PROJECT now has: $FINAL items"
