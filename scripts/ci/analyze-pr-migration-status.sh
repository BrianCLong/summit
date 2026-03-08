#!/bin/bash
# Analyze which old PRs have migrated to new CI system
# "Migrated" = only has new workflows (pr-gate, docs-ci, server-ci, etc.)
# "Not Migrated" = still has archived workflows running

set -euo pipefail

GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${BLUE}=== PR Migration Status Analysis ===${NC}\n"

# New workflows (the 8 we want)
NEW_WORKFLOWS="pr-gate|docs-ci|server-ci|client-ci|infra-ci|main-validation|release-ga|Release GA Pipeline"

# Get old PRs (created before consolidation)
OLD_PRS=$(gh pr list --state open --limit 100 --json number,createdAt,title \
  --jq '.[] | select(.createdAt < "2026-03-04T00:00:00Z") | .number')

PR_COUNT=$(echo "$OLD_PRS" | wc -l | tr -d ' ')

if [ "$PR_COUNT" -eq 0 ]; then
  echo -e "${GREEN}No old PRs found!${NC}"
  exit 0
fi

echo -e "Analyzing $PR_COUNT old PRs...\n"

migrated=0
not_migrated=0
no_checks=0

echo -e "${BLUE}Migration Status:${NC}\n"

echo "$OLD_PRS" | while read -r pr_num; do
  if [ -z "$pr_num" ]; then
    continue
  fi

  pr_title=$(gh pr view "$pr_num" --json title --jq '.title' 2>/dev/null | head -c 50)

  # Get workflow names for this PR
  workflows=$(gh pr view "$pr_num" --json statusCheckRollup \
    --jq '.statusCheckRollup[]? | select(.__typename == "CheckRun") | .workflowName' 2>/dev/null || echo "")

  if [ -z "$workflows" ]; then
    echo -e "${YELLOW}⚠️  #$pr_num: $pr_title... (no checks)${NC}"
    ((no_checks++)) || true
    continue
  fi

  # Check if any archived workflows are present
  archived_count=$(echo "$workflows" | grep -v -E "$NEW_WORKFLOWS" | wc -l | tr -d ' ')
  new_count=$(echo "$workflows" | grep -E "$NEW_WORKFLOWS" | wc -l | tr -d ' ')

  if [ "$archived_count" -gt 0 ]; then
    echo -e "${RED}❌ #$pr_num: $pr_title... (${archived_count} archived, ${new_count} new)${NC}"
    ((not_migrated++)) || true
  else
    echo -e "${GREEN}✅ #$pr_num: $pr_title... (migrated: ${new_count} new workflows)${NC}"
    ((migrated++)) || true
  fi
done

echo -e "\n${BLUE}=== Summary ===${NC}\n"
echo -e "${GREEN}Migrated:     $migrated PRs${NC} (using new 8-workflow system)"
echo -e "${RED}Not Migrated: $not_migrated PRs${NC} (still using archived workflows)"
echo -e "${YELLOW}No Checks:    $no_checks PRs${NC} (no workflow runs yet)"
echo -e "\nTotal: $PR_COUNT old PRs"

migration_rate=0
if [ "$PR_COUNT" -gt 0 ]; then
  migration_rate=$(echo "scale=1; $migrated * 100 / $PR_COUNT" | bc)
fi

echo -e "\n${BLUE}Migration Rate: ${migration_rate}%${NC}"

if [ "$not_migrated" -gt 0 ]; then
  echo -e "\n${YELLOW}Next Steps:${NC}"
  echo -e "- $not_migrated PRs still need to rebase"
  echo -e "- Authors were notified with rebase instructions"
  echo -e "- PRs will fail archived workflow checks until rebased"
fi

echo ""
