#!/usr/bin/env bash
# Idempotent project seeding with rate-limit handling and resume capability
set -euo pipefail

CSV="${1:-project_management/october2025_sprint_tracker.csv}"
PROJECT="${2:-8}"
OWNER="${3:-BrianCLong}"

echo "📊 Resumable Project Seeding"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "CSV: $CSV"
echo "Project: #$PROJECT"
echo "Owner: $OWNER"
echo ""

# Build set of existing issue titles (to skip duplicates)
TMP=$(mktemp)
echo "Fetching existing issues..."
gh issue list --limit 200 --search "Part of Oct-Nov 2025" --json title,number \
  | jq -r '.[] | .title' | sort > "$TMP.existing"

# Build set of existing project items (to verify coverage)
echo "Fetching existing project items..."
gh project item-list "$PROJECT" --owner "$OWNER" --format json \
  | jq -r '.[].title' | sort > "$TMP.project"

# Retry helper with exponential backoff
retry() {
  local n=0
  local max=6
  until "$@"; do
    s=$((2 ** n))
    n=$((n + 1))
    if [ $n -gt $max ]; then
      echo "  ❌ Max retries exceeded"
      return 1
    fi
    echo "  ⏳ Retry in ${s}s (attempt $n/$max)"
    sleep $s
  done
}

# Process CSV and create missing issues
created=0
skipped=0
failed=0

tail -n +2 "$CSV" | while IFS=, read -r tracker_id workstream start_date end_date source_path description; do
  title="[${workstream}] ${description}"

  # Skip if already exists
  if grep -Fxq "$title" "$TMP.existing"; then
    echo "SKIP: $title (already exists)"
    ((skipped++)) || true
    continue
  fi

  body="**Tracker ID:** \`${tracker_id}\`
**Workstream:** ${workstream}
**Start Date:** ${start_date:-TBD}
**End Date:** ${end_date:-TBD}
**Source:** \`${source_path}\`

Part of Oct-Nov 2025 delivery tracking.

---
*Auto-generated from sprint tracker CSV*"

  echo "CREATE: $title"

  # Create issue with retry
  if issue_url=$(retry gh issue create \
    --title "$title" \
    --body "$body" \
    2>&1 | grep -oE 'https://[^ ]+'); then

    echo "  ✅ Created: $issue_url"
    ((created++)) || true

    # Add to project with retry and error handling
    if retry gh project item-add "$PROJECT" --owner "$OWNER" --url "$issue_url" 2>&1; then
      echo "  ✅ Added to project"
    else
      echo "  ⚠️  Could not add to project (will retry in audit phase)"
    fi

    # Rate limit protection
    sleep 1
  else
    echo "  ❌ Failed to create issue"
    ((failed++)) || true
  fi
done

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Summary:"
echo "  Created: $created"
echo "  Skipped: $skipped"
echo "  Failed: $failed"
echo ""

# Final verification
EXPECTED=$(($(wc -l < "$CSV") - 1))
ACTUAL=$(gh project item-list "$PROJECT" --owner "$OWNER" --format json | jq 'length')
echo "Expected in project: $EXPECTED"
echo "Actual in project: $ACTUAL"
echo "Gap: $((EXPECTED - ACTUAL))"

rm -f "$TMP" "$TMP.existing" "$TMP.project"

if [ $((EXPECTED - ACTUAL)) -eq 0 ]; then
  echo "✅ Seeding complete - all items in project"
  exit 0
else
  echo "⚠️  Seeding incomplete - run project audit to identify missing items"
  exit 1
fi
