#!/usr/bin/env bash
# Seed GitHub Project from sprint tracker CSV
set -euo pipefail

CSV_FILE="${1:-project_management/october2025_sprint_tracker.csv}"
PROJECT_NUMBER="${2:-8}"
OWNER="${3:-BrianCLong}"

echo "📊 Seeding GitHub Project #${PROJECT_NUMBER} from ${CSV_FILE}"

# Skip header and process each row
tail -n +2 "$CSV_FILE" | while IFS=, read -r tracker_id workstream start_date end_date source_path description; do
  # Build issue title and body
  title="[${workstream}] ${description}"
  body="**Tracker ID:** \`${tracker_id}\`
**Workstream:** ${workstream}
**Start Date:** ${start_date:-TBD}
**End Date:** ${end_date:-TBD}
**Source:** \`${source_path}\`

Part of Oct-Nov 2025 delivery tracking.

---
*Auto-generated from sprint tracker CSV*"

  echo "Creating: $title"

  # Create issue and add to project (skip labels if they don't exist)
  issue_url=$(gh issue create \
    --title "$title" \
    --body "$body" 2>&1 | grep "https://" || echo "")

  if [ -n "$issue_url" ]; then
    echo "  ✅ Created: $issue_url"

    # Extract issue number from URL
    issue_number=$(echo "$issue_url" | grep -oE '[0-9]+$')

    # Add to project
    gh project item-add "$PROJECT_NUMBER" --owner "$OWNER" --url "$issue_url" || echo "  ⚠️ Could not add to project"
  else
    echo "  ❌ Failed to create issue"
  fi

  sleep 0.5  # Rate limit protection
done

echo "✅ Seed complete"
