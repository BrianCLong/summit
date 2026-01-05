#!/usr/bin/env bash
#
# migration-report.sh
#
# Generates a deterministic report of post-GA migration status.
# Shows PR counts by label, by author, and by age.
#
# Usage:
#   ./scripts/maintainers/migration-report.sh                    # print to stdout
#   ./scripts/maintainers/migration-report.sh --out FILE         # write to file
#   ./scripts/maintainers/migration-report.sh --json             # output as JSON
#   ./scripts/maintainers/migration-report.sh --help             # show help

set -euo pipefail

# Configuration
LABELS_BLOCKED="blocked:unrelated-history"
LABELS_NEEDS_RECREATED="needs:recreated-pr"
LABELS_SUPERSEDED="superseded"
LABELS_MIGRATION="post-ga:migration"

# Colors for terminal output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m' # No Color

# Parse arguments
OUTPUT_FILE=""
JSON_OUTPUT=false
NO_COLOR=false

while [[ $# -gt 0 ]]; do
  case $1 in
    --out|-o)
      OUTPUT_FILE="$2"
      NO_COLOR=true
      shift 2
      ;;
    --json)
      JSON_OUTPUT=true
      NO_COLOR=true
      shift
      ;;
    --no-color)
      NO_COLOR=true
      shift
      ;;
    --help|-h)
      echo "Usage: $0 [OPTIONS]"
      echo ""
      echo "Generates a report of post-GA migration status."
      echo ""
      echo "Options:"
      echo "  --out FILE    Write report to file (markdown format)"
      echo "  --json        Output as JSON instead of markdown"
      echo "  --no-color    Disable colored output"
      echo "  --help        Show this help message"
      echo ""
      echo "Examples:"
      echo "  $0                                      # Print to terminal"
      echo "  $0 --out docs/migration/STATUS.md      # Write to file"
      echo "  $0 --json > migration-status.json      # JSON output"
      exit 0
      ;;
    *)
      echo "Unknown option: $1"
      echo "Use --help for usage information"
      exit 1
      ;;
  esac
done

# Disable colors if requested
if $NO_COLOR; then
  RED=''
  GREEN=''
  YELLOW=''
  BLUE=''
  CYAN=''
  BOLD=''
  NC=''
fi

# Check for gh CLI
if ! command -v gh &> /dev/null; then
  echo "Error: gh CLI is required but not installed." >&2
  exit 1
fi

# Check authentication
if ! gh auth status &> /dev/null; then
  echo "Error: Not authenticated with gh. Run 'gh auth login' first." >&2
  exit 1
fi

# Get counts
get_pr_count() {
  local query="$1"
  gh pr list --state open --limit 500 --search "$query" --json number -q 'length'
}

# Get PRs with details
get_prs_with_details() {
  local query="$1"
  gh pr list --state open --limit 500 --search "$query" \
    --json number,title,author,createdAt,labels \
    | jq -r 'sort_by(.createdAt) | .[]'
}

# Calculate age in days
days_ago() {
  local created_at="$1"
  local created_epoch
  local now_epoch

  # Handle both BSD and GNU date
  if date -j &>/dev/null 2>&1; then
    # BSD date (macOS)
    created_epoch=$(date -j -f "%Y-%m-%dT%H:%M:%SZ" "$created_at" "+%s" 2>/dev/null || echo 0)
    now_epoch=$(date "+%s")
  else
    # GNU date (Linux)
    created_epoch=$(date -d "$created_at" "+%s" 2>/dev/null || echo 0)
    now_epoch=$(date "+%s")
  fi

  if [[ "$created_epoch" -eq 0 ]]; then
    echo "?"
  else
    echo $(( (now_epoch - created_epoch) / 86400 ))
  fi
}

# Generate report
generate_report() {
  local timestamp
  timestamp=$(date -u +"%Y-%m-%dT%H:%M:%SZ")

  # Fetch counts
  local total_conflicting
  local count_blocked
  local count_needs_recreated
  local count_superseded
  local count_migration

  total_conflicting=$(gh pr list --state open --limit 500 --json number,mergeable \
    | jq '[.[] | select(.mergeable == "CONFLICTING")] | length')

  count_blocked=$(get_pr_count "label:$LABELS_BLOCKED" || echo 0)
  count_needs_recreated=$(get_pr_count "label:$LABELS_NEEDS_RECREATED" || echo 0)
  count_superseded=$(get_pr_count "label:$LABELS_SUPERSEDED" || echo 0)
  count_migration=$(get_pr_count "label:$LABELS_MIGRATION" || echo 0)

  # Calculate progress
  local processed=$((count_blocked > 0 ? count_blocked : 0))
  local remaining=$((total_conflicting - count_superseded))

  if $JSON_OUTPUT; then
    # JSON output
    cat <<EOF
{
  "generated_at": "$timestamp",
  "summary": {
    "total_conflicting": $total_conflicting,
    "blocked_unrelated_history": $count_blocked,
    "needs_recreated": $count_needs_recreated,
    "superseded": $count_superseded,
    "migration_labeled": $count_migration,
    "remaining": $remaining
  },
  "by_author": $(gh pr list --state open --limit 500 --json number,author,mergeable \
    | jq '[.[] | select(.mergeable == "CONFLICTING")] | group_by(.author.login) | map({author: .[0].author.login, count: length}) | sort_by(-.count)'),
  "by_age": $(gh pr list --state open --limit 500 --json number,title,createdAt,mergeable \
    | jq '[.[] | select(.mergeable == "CONFLICTING")] | sort_by(.createdAt) | map({number, title: .title[0:60], created: .createdAt})')
}
EOF
    return
  fi

  # Markdown output
  cat <<EOF
# Post-GA Migration Status

Generated: $timestamp

## Summary

| Metric | Count |
|--------|-------|
| Total Conflicting PRs | $total_conflicting |
| Labeled \`blocked:unrelated-history\` | $count_blocked |
| Labeled \`needs:recreated-pr\` | $count_needs_recreated |
| Labeled \`superseded\` | $count_superseded |
| Labeled \`post-ga:migration\` | $count_migration |
| **Remaining to Process** | **$remaining** |

## Progress

EOF

  # Progress bar
  if [[ $total_conflicting -gt 0 ]]; then
    local pct_done=$((count_superseded * 100 / total_conflicting))
    local bar_done=$((pct_done / 5))
    local bar_remaining=$((20 - bar_done))
    printf '`['
    printf '█%.0s' $(seq 1 $bar_done 2>/dev/null) || true
    printf '░%.0s' $(seq 1 $bar_remaining 2>/dev/null) || true
    printf ']` %d%% superseded\n\n' "$pct_done"
  fi

  cat <<EOF

## By Author (Top 10)

| Author | Conflicting PRs |
|--------|-----------------|
EOF

  gh pr list --state open --limit 500 --json number,author,mergeable \
    | jq -r '[.[] | select(.mergeable == "CONFLICTING")] | group_by(.author.login) | map({author: .[0].author.login, count: length}) | sort_by(-.count) | .[0:10] | .[] | "| \(.author) | \(.count) |"'

  cat <<EOF

## By Age (Oldest First)

| PR | Age | Title |
|----|-----|-------|
EOF

  gh pr list --state open --limit 500 --json number,title,createdAt,mergeable \
    | jq -r '[.[] | select(.mergeable == "CONFLICTING")] | sort_by(.createdAt) | .[0:20] | .[] | "#\(.number)\t\(.createdAt)\t\(.title[0:50])"' \
    | while IFS=$'\t' read -r pr_num created title; do
        local age
        age=$(days_ago "$created")
        echo "| $pr_num | ${age}d | ${title}... |"
      done

  cat <<EOF

## Next Steps

1. Run triage script to label remaining PRs:
   \`\`\`bash
   ./scripts/maintainers/triage-unrelated-history-prs.sh --apply
   \`\`\`

2. Authors should recreate PRs following the [PR Recreation Playbook](./PR_RECREATION_PLAYBOOK.md)

3. When a recreated PR includes "Supersedes #<old>", run:
   \`\`\`bash
   ./scripts/maintainers/migration-supersedes.sh --apply
   \`\`\`

---
*This report was generated by \`scripts/maintainers/migration-report.sh\`*
EOF
}

# Main
if [[ -n "$OUTPUT_FILE" ]]; then
  # Ensure directory exists
  mkdir -p "$(dirname "$OUTPUT_FILE")"
  generate_report > "$OUTPUT_FILE"
  echo "Report written to: $OUTPUT_FILE"
else
  generate_report
fi
