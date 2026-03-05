#!/bin/bash
# Batch-merge autopilot for draining 1,000 PR backlog
# Ensures high throughput by queueing PRs that meet governance and CI criteria

set -euo pipefail

BATCH_SIZE=${1:-20}
DRY_RUN=${DRY_RUN:-false}

# Color codes
BLUE='\033[0;34m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${BLUE}=== Merge-Train Autopilot: Backlog Drainage ===${NC}"
echo "Batch Size: $BATCH_SIZE"
echo "Dry Run:    $DRY_RUN"
echo ""

# Get PRs ready for merge (passing checks, not in draft, and mergeable)
# Added retry logic for 504 timeouts
get_ready_prs() {
  local retries=3
  local count=0
  local output=""
  
  while [ $count -lt $retries ]; do
    if output=$(gh pr list \
      --search "is:pr is:open draft:false status:success" \
      --json number,title,headRefName \
      --limit "$BATCH_SIZE" \
      --jq '.' 2> >(cat >&2)
      echo "$output"
      return 0
    fi
    count=$((count + 1))
    echo -e "${YELLOW}API Timeout (Attempt $count/$retries). Retrying in 5s...${NC}" >&2
    sleep 5
  done
  return 1
}

READY_PRS=$(get_ready_prs || echo "[]")
PR_COUNT=$(echo "$READY_PRS" | jq '. | length')

if [ "$PR_COUNT" -eq 0 ]; then
  echo -e "${YELLOW}No PRs currently ready for the merge train.${NC}"
  exit 0
fi

echo -e "${GREEN}Found $PR_COUNT PRs ready for processing.${NC}"

# Enable merge queue for each
echo "$READY_PRS" | jq -c '.[]' | while read -r PR; do
  PR_NUM=$(echo "$PR" | jq -r '.number')
  PR_TITLE=$(echo "$PR" | jq -r '.title')
  
  printf 'Queueing PR #%s: %s
' "$PR_NUM" "$PR_TITLE"
  
  if [ "$DRY_RUN" != "true" ]; then
    gh pr merge "$PR_NUM" --auto --squash || echo -e "${RED}Failed to queue PR #$PR_NUM${NC}"
  else
    echo "[DRY RUN] Would execute: gh pr merge $PR_NUM --auto --squash"
  fi
done

echo ""
echo -e "${GREEN}Autopilot run complete.${NC}"
