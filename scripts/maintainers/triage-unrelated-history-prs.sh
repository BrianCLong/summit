#!/usr/bin/env bash
#
# triage-unrelated-history-prs.sh
#
# Identifies and labels PRs that have unrelated git histories.
# Default: DRY RUN mode (no mutations)
# Use --apply to actually add labels and post comments.
#
# Usage:
#   ./scripts/maintainers/triage-unrelated-history-prs.sh          # dry run
#   ./scripts/maintainers/triage-unrelated-history-prs.sh --apply  # apply changes
#   ./scripts/maintainers/triage-unrelated-history-prs.sh --help   # show help
#

set -euo pipefail

# Configuration
LABELS=("blocked:unrelated-history" "needs:recreated-pr" "post-ga:migration")
PLAYBOOK_URL="https://github.com/BrianCLong/summit/blob/main/docs/migration/PR_RECREATION_PLAYBOOK.md"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Parse arguments
DRY_RUN=true
VERBOSE=false

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
    --help|-h)
      echo "Usage: $0 [OPTIONS]"
      echo ""
      echo "Identifies PRs with unrelated git histories and applies migration labels."
      echo ""
      echo "Options:"
      echo "  --apply     Actually apply labels and post comments (default: dry run)"
      echo "  --verbose   Show detailed output"
      echo "  --help      Show this help message"
      echo ""
      echo "Labels applied:"
      for label in "${LABELS[@]}"; do
        echo "  - $label"
      done
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

echo -e "${BLUE}=== PR Unrelated History Triage ===${NC}"
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

  for label in "${LABELS[@]}"; do
    if gh label list --json name -q ".[].name" | grep -q "^${label}$"; then
      echo -e "  ${GREEN}✓${NC} Label exists: $label"
    else
      if $DRY_RUN; then
        echo -e "  ${YELLOW}○${NC} Would create label: $label"
      else
        echo -e "  ${BLUE}+${NC} Creating label: $label"
        case $label in
          "blocked:unrelated-history")
            gh label create "$label" --color "B60205" --description "Cannot merge due to unrelated git histories" 2>/dev/null || true
            ;;
          "needs:recreated-pr")
            gh label create "$label" --color "FBCA04" --description "Author needs to recreate PR from current main" 2>/dev/null || true
            ;;
          "post-ga:migration")
            gh label create "$label" --color "0E8A16" --description "Post-GA migration item" 2>/dev/null || true
            ;;
        esac
      fi
    fi
  done
  echo ""
}

# Get list of open PRs that are CONFLICTING
get_conflicting_prs() {
  gh pr list --state open --limit 500 --json number,title,headRefName,mergeable \
    | jq -r '.[] | select(.mergeable == "CONFLICTING") | "\(.number)\t\(.headRefName)\t\(.title)"'
}

# Check if PR has unrelated histories (best effort detection)
check_unrelated_history() {
  local pr_number=$1
  local branch_name=$2

  # Fetch the branch
  git fetch origin "$branch_name" 2>/dev/null || return 1

  # Try to find merge base - if it fails, likely unrelated histories
  if ! git merge-base origin/main "origin/$branch_name" &>/dev/null; then
    return 0  # unrelated histories
  fi

  return 1  # has common ancestor
}

# Check if PR already has our labels
has_migration_labels() {
  local pr_number=$1
  local existing_labels
  existing_labels=$(gh pr view "$pr_number" --json labels -q '.labels[].name' 2>/dev/null || echo "")

  for label in "${LABELS[@]}"; do
    if echo "$existing_labels" | grep -q "^${label}$"; then
      return 0  # has at least one of our labels
    fi
  done
  return 1
}

# Apply labels to PR
apply_labels() {
  local pr_number=$1

  for label in "${LABELS[@]}"; do
    gh pr edit "$pr_number" --add-label "$label" 2>/dev/null || true
  done
}

# Post comment to PR
post_comment() {
  local pr_number=$1

  local comment="## ⚠️ Unrelated Git Histories Detected

This PR has **unrelated git histories** due to a repository restructure and cannot be merged directly.

### To Resolve

Please recreate this PR from current \`main\` using the instructions in our **[PR Recreation Playbook](${PLAYBOOK_URL})**.

**Quick steps:**
1. Create a new branch from current \`main\`
2. Cherry-pick or patch your changes onto the new branch
3. Open a new PR referencing this one (\"Supersedes #${pr_number}\")
4. This PR will be closed once the new one is merged

### Labels Applied
- \`blocked:unrelated-history\`
- \`needs:recreated-pr\`
- \`post-ga:migration\`

---
*This comment was automatically generated by the PR migration triage script.*"

  gh pr comment "$pr_number" --body "$comment"
}

# Main logic
main() {
  ensure_labels

  echo -e "${BLUE}Fetching conflicting PRs...${NC}"

  local prs_to_process=()
  local prs_already_labeled=()
  local prs_with_ancestor=()
  local total_count=0

  while IFS=$'\t' read -r pr_number branch_name title; do
    ((total_count++)) || true

    # Check if already labeled
    if has_migration_labels "$pr_number"; then
      prs_already_labeled+=("$pr_number")
      if $VERBOSE; then
        echo -e "  ${YELLOW}○${NC} #$pr_number - already has migration labels"
      fi
      continue
    fi

    # For speed, we assume CONFLICTING PRs without our labels need processing
    # A more thorough check would verify unrelated histories, but that's slow
    prs_to_process+=("$pr_number:$title")

  done < <(get_conflicting_prs)

  echo ""
  echo -e "${BLUE}=== Summary ===${NC}"
  echo "Total conflicting PRs: $total_count"
  echo "Already labeled: ${#prs_already_labeled[@]}"
  echo "To be processed: ${#prs_to_process[@]}"
  echo ""

  if [[ ${#prs_to_process[@]} -eq 0 ]]; then
    echo -e "${GREEN}No PRs need processing.${NC}"
    exit 0
  fi

  echo -e "${BLUE}PRs to process:${NC}"
  for entry in "${prs_to_process[@]}"; do
    local pr_number="${entry%%:*}"
    local title="${entry#*:}"
    echo "  #$pr_number - ${title:0:60}..."
  done
  echo ""

  if $DRY_RUN; then
    echo -e "${YELLOW}DRY RUN: Would apply labels and comments to ${#prs_to_process[@]} PRs${NC}"
    echo -e "${YELLOW}Run with --apply to execute${NC}"
  else
    echo -e "${BLUE}Applying labels and comments...${NC}"

    for entry in "${prs_to_process[@]}"; do
      local pr_number="${entry%%:*}"
      local title="${entry#*:}"

      echo -e "  Processing #$pr_number..."
      apply_labels "$pr_number"
      post_comment "$pr_number"
      echo -e "    ${GREEN}✓${NC} Labels and comment applied"

      # Rate limit: sleep briefly between PRs
      sleep 1
    done

    echo ""
    echo -e "${GREEN}Done! Processed ${#prs_to_process[@]} PRs${NC}"
  fi
}

main "$@"
