#!/usr/bin/env bash
# Setup GitHub roadmap: create milestones and import issues
set -euo pipefail

OWNER="BrianCLong"
REPO="summit"
CSV_FILE="project_management/import/github-roadmap-issues.csv"

log() { printf "[%s] %s\n" "$(date -Iseconds)" "$*"; }

# Create milestones using GitHub API
create_milestones() {
  log "Creating milestones..."

  local milestones=(
    "M1: Graph Core & API"
    "M2: Ingest & ER v1"
    "M3: Copilot v1"
    "M4: Governance & Security"
    "M5: Prov-Ledger (beta)"
    "MVP"
    "GA"
    "Q0"
    "Q1"
    "Q2"
    "30-Day"
    "60-Day"
    "90-Day"
  )

  for milestone in "${milestones[@]}"; do
    log "  Creating: $milestone"
    gh api "repos/$OWNER/$REPO/milestones" \
      -X POST \
      -f title="$milestone" \
      -f state="open" 2>/dev/null && log "    ✅ Created" || log "    ℹ️  Already exists or failed"
  done
}

# Import issues from CSV
import_issues() {
  log "Importing issues from CSV..."

  # Read CSV and create issues (skip header)
  tail -n +2 "$CSV_FILE" | while IFS= read -r line; do
    # Parse CSV fields (quoted, comma-separated)
    title=$(echo "$line" | awk -F'","' '{print $1}' | sed 's/^"//')
    body=$(echo "$line" | awk -F'","' '{print $2}')
    labels=$(echo "$line" | awk -F'","' '{print $3}' | sed 's/;/,/g')  # Convert ; to ,
    milestone=$(echo "$line" | awk -F'","' '{print $4}' | sed 's/"$//')

    log "Creating: $title"

    # Create issue with all fields
    if gh issue create \
      --title "$title" \
      --body "$body" \
      --label "$labels" \
      --milestone "$milestone" 2>/dev/null; then
      log "  ✅ Created successfully"
    else
      # Try without milestone if it fails
      if gh issue create \
        --title "$title" \
        --body "$body" \
        --label "$labels" 2>/dev/null; then
        log "  ⚠️  Created without milestone (milestone may not exist)"
      else
        log "  ❌ Failed"
      fi
    fi

    # Rate limit: wait 0.5 seconds between requests
    sleep 0.5
  done
}

# Main execution
main() {
  log "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  log "GitHub Roadmap Setup"
  log "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

  create_milestones
  log ""
  import_issues

  log "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  log "✅ Roadmap setup complete"
  log "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
}

main "$@"
