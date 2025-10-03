#!/usr/bin/env bash
# Project integrity audit - compares CSV tracker to GitHub Project items
set -euo pipefail

CSV="${1:-project_management/october2025_sprint_tracker.csv}"
OWNER="${2:-BrianCLong}"
PROJECT="${3:-8}"

echo "🔍 Project Integrity Audit"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "CSV: $CSV"
echo "Project: #$PROJECT"
echo "Owner: $OWNER"
echo ""

TMP=$(mktemp)

# Expected titles from CSV
echo "📋 Extracting expected titles from CSV..."
tail -n +2 "$CSV" | while IFS=, read -r tracker_id workstream start_date end_date source_path description; do
  echo "[${workstream}] ${description}"
done | sort > "$TMP.expected"
EXPECTED=$(wc -l < "$TMP.expected")
echo "  Expected: $EXPECTED items"

# Actual project items
echo "📊 Fetching actual project items..."
gh project item-list "$PROJECT" --owner "$OWNER" --format json | jq -r '.items[]?.title // .[]?.title // empty' | sed 's/\r$//' | sort > "$TMP.actual"
ACTUAL=$(wc -l < "$TMP.actual")
echo "  Actual: $ACTUAL items"

# Created issues (may not all be in project)
echo "📝 Checking created issues..."
gh issue list --limit 200 --search "Part of Oct-Nov 2025" --json title | jq -r '.[].title' | sort > "$TMP.issues"
ISSUES=$(wc -l < "$TMP.issues")
echo "  Issues created: $ISSUES"

# Gap analysis
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Gap Analysis:"
echo ""

# Items in CSV but not in project
MISSING=$(comm -23 "$TMP.expected" "$TMP.actual" | wc -l | tr -d ' ')
if [ "$MISSING" -gt 0 ]; then
  echo "⚠️  Missing from project ($MISSING items):"
  comm -23 "$TMP.expected" "$TMP.actual" | head -20
  if [ "$MISSING" -gt 20 ]; then
    echo "  ... and $((MISSING - 20)) more"
  fi
  echo ""
fi

# Items in project but not in CSV
EXTRA=$(comm -13 "$TMP.expected" "$TMP.actual" | wc -l | tr -d ' ')
if [ "$EXTRA" -gt 0 ]; then
  echo "⚠️  Extra items in project ($EXTRA items):"
  comm -13 "$TMP.expected" "$TMP.actual" | head -10
  echo ""
fi

# Issues created but not in project
ORPHANED=$(comm -23 "$TMP.issues" "$TMP.actual" | wc -l | tr -d ' ')
if [ "$ORPHANED" -gt 0 ]; then
  echo "⚠️  Issues created but not in project ($ORPHANED items):"
  comm -23 "$TMP.issues" "$TMP.actual" | head -20
  if [ "$ORPHANED" -gt 20 ]; then
    echo "  ... and $((ORPHANED - 20)) more"
  fi
  echo ""
fi

# Status distribution
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Status Distribution:"
gh project item-list "$PROJECT" --owner "$OWNER" --format json | \
  jq -r '.items[]?.fields[]? | select(.name=="Status") | .value.name' | \
  sort | uniq -c | awk '{printf "  %s: %d\n", $2, $1}' 2>/dev/null || echo "  (No status field configured)"

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Summary:"
echo "  Expected items: $EXPECTED"
echo "  Actual in project: $ACTUAL"
echo "  Issues created: $ISSUES"
echo "  Missing from project: $MISSING"
echo "  Extra in project: $EXTRA"
echo "  Orphaned issues: $ORPHANED"
echo ""

# Remediation commands
if [ "$MISSING" -gt 0 ] || [ "$ORPHANED" -gt 0 ]; then
  echo "🔧 Remediation:"
  echo ""

  if [ "$ORPHANED" -gt 0 ]; then
    echo "Add orphaned issues to project:"
    echo "  comm -23 $TMP.issues $TMP.actual | while read title; do"
    echo "    gh issue list --search \"\$title\" --json number,url -q '.[0].url' \\"
    echo "      | xargs -I {} gh project item-add $PROJECT --owner $OWNER --url {}"
    echo "  done"
    echo ""
  fi

  if [ "$MISSING" -gt 0 ] && [ "$ORPHANED" -eq 0 ]; then
    echo "Re-run seeding script:"
    echo "  ./.github/scripts/seed-project-resume.sh"
    echo ""
  fi
fi

# Cleanup
rm -f "$TMP" "$TMP.expected" "$TMP.actual" "$TMP.issues"

# Exit code
if [ "$MISSING" -eq 0 ] && [ "$EXTRA" -eq 0 ]; then
  echo "✅ Audit passed - project integrity verified"
  exit 0
else
  echo "❌ Audit failed - discrepancies found"
  exit 1
fi
