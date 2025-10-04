#!/usr/bin/env bash
# Import roadmap issues from CSV using gh issue create
set -euo pipefail

CSV_FILE="${1:-project_management/import/github-roadmap-issues.csv}"

if [[ ! -f "$CSV_FILE" ]]; then
  echo "❌ CSV file not found: $CSV_FILE"
  exit 1
fi

log() { printf "[%s] %s\n" "$(date -Iseconds)" "$*"; }

# Read CSV and create issues
# CSV format: Title,Body,Labels,Milestone
{
  read -r header  # Skip header
  while IFS=, read -r title body labels milestone; do
    # Remove quotes from fields
    title=$(echo "$title" | sed 's/^"//; s/"$//')
    body=$(echo "$body" | sed 's/^"//; s/"$//')
    labels=$(echo "$labels" | sed 's/^"//; s/"$//; s/;/,/g')  # Convert semicolon to comma
    milestone=$(echo "$milestone" | sed 's/^"//; s/"$//')

    log "Creating: $title"

    # Create issue with labels and milestone
    if gh issue create \
      --title "$title" \
      --body "$body" \
      --label "$labels" \
      --milestone "$milestone" 2>/dev/null; then
      log "  ✅ Created"
    else
      log "  ❌ Failed (milestone may not exist: '$milestone')"
      # Try without milestone
      if gh issue create \
        --title "$title" \
        --body "$body" \
        --label "$labels" 2>/dev/null; then
        log "  ✅ Created (without milestone)"
      else
        log "  ❌ Failed completely"
      fi
    fi

    # Rate limit: wait 1 second between requests
    sleep 1
  done
} < "$CSV_FILE"

log "✅ Import complete"
