#!/usr/bin/env bash
#
# migration-supersedes.sh
#
# Detects "Supersedes #<PR>" patterns in newly opened PRs and links old/new PRs.
# Default: DRY RUN mode (no mutations)
# Use --apply to actually add labels and post comments.
#
# Usage:
#   ./scripts/maintainers/migration-supersedes.sh              # dry run
#   ./scripts/maintainers/migration-supersedes.sh --apply      # apply changes
#   ./scripts/maintainers/migration-supersedes.sh --help       # show help
#
# NEVER auto-closes PRs - that requires explicit user action.

set -euo pipefail

# Configuration
MIGRATION_LABEL="post-ga:migration"
SUPERSEDED_LABEL="superseded"
PLAYBOOK_URL="https://github.com/BrianCLong/summit/blob/main/docs/migration/PR_RECREATION_PLAYBOOK.md"

# Patterns to detect (case insensitive)
# Matches: "Supersedes #1234", "Recreates #1234", "Replaces #1234"
PATTERN='(supersedes|recreates|replaces)\s*#([0-9]+)'

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Parse arguments
DRY_RUN=true
VERBOSE=false
LIMIT=100

while [[ $# -gt 0 ]]; do
  case $1 in
    --apply)
      DRY_RUN=false
      shift
      ;;
    --verbose|-v)
      VERBOSE=true
      shift
      ;;
    --limit)
      LIMIT="$2"
      shift 2
      ;;
    --help|-h)
      echo "Usage: $0 [OPTIONS]"
      echo ""
      echo "Detects PRs that reference old PRs with 'Supersedes #<PR>' patterns"
      echo "and links them together with labels and comments."
      echo ""
      echo "Options:"
      echo "  --apply       Actually apply labels and post comments (default: dry run)"
      echo "  --verbose     Show detailed output"
      echo "  --limit N     Limit number of PRs to scan (default: 100)"
      echo "  --help        Show this help message"
      echo ""
      echo "Detected patterns (case insensitive):"
      echo "  - 'Supersedes #1234'"
      echo "  - 'Recreates #1234'"
      echo "  - 'Replaces #1234'"
      echo ""
      echo "This script NEVER closes PRs automatically."
      exit 0
      ;;
    *)
      echo "Unknown option: $1"
      echo "Use --help for usage information"
      exit 1
      ;;
  esac
done

# Check for gh CLI
if ! command -v gh &> /dev/null; then
  echo -e "${RED}Error: gh CLI is required but not installed.${NC}"
  exit 1
fi

# Check authentication
if ! gh auth status &> /dev/null; then
  echo -e "${RED}Error: Not authenticated with gh. Run 'gh auth login' first.${NC}"
  exit 1
fi

echo -e "${BLUE}=== Migration Supersedes Detector ===${NC}"
echo ""

if $DRY_RUN; then
  echo -e "${YELLOW}DRY RUN MODE - No changes will be made${NC}"
  echo -e "${YELLOW}Use --apply to actually apply labels and comments${NC}"
else
  echo -e "${RED}APPLY MODE - Labels and comments will be added${NC}"
fi
echo ""

# Ensure labels exist
ensure_labels() {
  echo -e "${BLUE}Checking labels exist...${NC}"

  for label in "$MIGRATION_LABEL" "$SUPERSEDED_LABEL"; do
    if gh label list --json name -q ".[].name" | grep -q "^${label}$"; then
      echo -e "  ${GREEN}✓${NC} Label exists: $label"
    else
      if $DRY_RUN; then
        echo -e "  ${YELLOW}○${NC} Would create label: $label"
      else
        echo -e "  ${BLUE}+${NC} Creating label: $label"
        case $label in
          "$MIGRATION_LABEL")
            gh label create "$label" --color "0E8A16" --description "Post-GA migration item" 2>/dev/null || true
            ;;
          "$SUPERSEDED_LABEL")
            gh label create "$label" --color "5319E7" --description "This PR has been superseded by a new PR" 2>/dev/null || true
            ;;
        esac
      fi
    fi
  done
  echo ""
}

# Check if PR already has superseded label
has_superseded_label() {
  local pr_number=$1
  local existing_labels
  existing_labels=$(gh pr view "$pr_number" --json labels -q '.labels[].name' 2>/dev/null || echo "")
  echo "$existing_labels" | grep -q "^${SUPERSEDED_LABEL}$"
}

# Check if new PR already has migration label
has_migration_label() {
  local pr_number=$1
  local existing_labels
  existing_labels=$(gh pr view "$pr_number" --json labels -q '.labels[].name' 2>/dev/null || echo "")
  echo "$existing_labels" | grep -q "^${MIGRATION_LABEL}$"
}

# Extract supersedes references from PR body
extract_supersedes_refs() {
  local body="$1"
  # Use grep with extended regex to find all matches
  echo "$body" | grep -ioE "$PATTERN" | grep -oE '[0-9]+' || true
}

# Get PR state (open, closed, merged)
get_pr_state() {
  local pr_number=$1
  gh pr view "$pr_number" --json state -q '.state' 2>/dev/null || echo "UNKNOWN"
}

# Add label to PR
add_label() {
  local pr_number=$1
  local label=$2
  gh pr edit "$pr_number" --add-label "$label" 2>/dev/null || true
}

# Post comment on old PR
post_old_pr_comment() {
  local old_pr=$1
  local new_pr=$2

  local comment="## \xF0\x9F\x94\x84 Superseded by #${new_pr}

This PR's work is being recreated in **#${new_pr}**.

### What This Means
- A new PR has been opened that supersedes this one
- The new PR was created from current \`main\` to resolve unrelated history issues
- This PR will remain open until the new PR is merged

### For Maintainers
- Review the new PR: #${new_pr}
- This PR can be closed once #${new_pr} is merged
- Do NOT merge this PR directly

---
*This comment was automatically generated by the supersedes detector.*"

  gh pr comment "$old_pr" --body "$comment"
}

# Post comment on new PR
post_new_pr_comment() {
  local new_pr=$1
  local old_pr=$2

  local comment="## \xE2\x9C\x85 Migration PR Detected

This PR supersedes **#${old_pr}** as part of the post-GA migration.

See the **[PR Recreation Playbook](${PLAYBOOK_URL})** for migration details.

---
*This comment was automatically generated by the supersedes detector.*"

  gh pr comment "$new_pr" --body "$comment"
}

# Main logic
main() {
  ensure_labels

  echo -e "${BLUE}Scanning open PRs for supersedes patterns...${NC}"
  echo ""

  local found_links=()
  local already_linked=()
  local invalid_refs=()

  # Get open PRs with their bodies
  while IFS=$'\t' read -r pr_number pr_body; do
    # Extract supersedes references
    local refs
    refs=$(extract_supersedes_refs "$pr_body")

    if [[ -z "$refs" ]]; then
      continue
    fi

    for old_pr in $refs; do
      # Skip if same PR number
      if [[ "$pr_number" == "$old_pr" ]]; then
        continue
      fi

      # Check if old PR exists
      local old_pr_state
      old_pr_state=$(get_pr_state "$old_pr")

      if [[ "$old_pr_state" == "UNKNOWN" ]]; then
        invalid_refs+=("$pr_number -> #$old_pr (PR not found)")
        continue
      fi

      # Check if already processed
      if has_superseded_label "$old_pr"; then
        already_linked+=("$pr_number -> #$old_pr (already marked)")
        if $VERBOSE; then
          echo -e "  ${YELLOW}○${NC} #$pr_number -> #$old_pr (already linked)"
        fi
        continue
      fi

      # Found a new link!
      found_links+=("$pr_number:$old_pr")
      echo -e "  ${GREEN}✓${NC} Found: #$pr_number supersedes #$old_pr"

    done
  done < <(gh pr list --state open --limit "$LIMIT" --json number,body \
    | jq -r '.[] | "\(.number)\t\(.body // "")"')

  echo ""
  echo -e "${BLUE}=== Summary ===${NC}"
  echo "New links found: ${#found_links[@]}"
  echo "Already linked: ${#already_linked[@]}"
  echo "Invalid references: ${#invalid_refs[@]}"
  echo ""

  if [[ ${#invalid_refs[@]} -gt 0 ]] && $VERBOSE; then
    echo -e "${YELLOW}Invalid references (PR not found):${NC}"
    for ref in "${invalid_refs[@]}"; do
      echo "  $ref"
    done
    echo ""
  fi

  if [[ ${#found_links[@]} -eq 0 ]]; then
    echo -e "${GREEN}No new supersedes links to process.${NC}"
    exit 0
  fi

  echo -e "${BLUE}Links to process:${NC}"
  for link in "${found_links[@]}"; do
    local new_pr="${link%%:*}"
    local old_pr="${link#*:}"
    echo "  #$new_pr supersedes #$old_pr"
  done
  echo ""

  if $DRY_RUN; then
    echo -e "${YELLOW}DRY RUN: Would process ${#found_links[@]} links${NC}"
    echo -e "${YELLOW}Run with --apply to execute${NC}"
  else
    echo -e "${BLUE}Processing links...${NC}"

    for link in "${found_links[@]}"; do
      local new_pr="${link%%:*}"
      local old_pr="${link#*:}"

      echo -e "  Processing #$new_pr -> #$old_pr..."

      # Add labels
      add_label "$new_pr" "$MIGRATION_LABEL"
      add_label "$old_pr" "$SUPERSEDED_LABEL"

      # Post comments
      post_old_pr_comment "$old_pr" "$new_pr"
      post_new_pr_comment "$new_pr" "$old_pr"

      echo -e "    ${GREEN}✓${NC} Labels and comments applied"

      # Rate limit
      sleep 2
    done

    echo ""
    echo -e "${GREEN}Done! Processed ${#found_links[@]} links${NC}"
  fi
}

main "$@"
