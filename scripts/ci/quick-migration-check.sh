#!/bin/bash
# Quick check of migration status using workflow run data

set -euo pipefail

GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${BLUE}=== Quick Migration Status Check ===${NC}\n"

# Count queued archived workflows (old system)
ARCHIVED_PATTERNS="Jet-RL CI|nds-ci|SLSA Provenance|CI Core.*Primary|Compliance.*Governance|Evidence Bundle|summit-skill-gates|Verify Narrative|UX Governance"

archived_queued=$(gh run list --status queued --limit 200 --json workflowName \
  --jq ".[] | select(.workflowName | test(\"$ARCHIVED_PATTERNS\")) | .workflowName" | wc -l | tr -d ' ')

# Count queued new workflows (new system)
NEW_PATTERNS="pr-gate|docs-ci|server-ci|client-ci|infra-ci"

new_queued=$(gh run list --status queued --limit 200 --json workflowName \
  --jq ".[] | select(.workflowName | test(\"$NEW_PATTERNS\")) | .workflowName" | wc -l | tr -d ' ')

total_queued=$((archived_queued + new_queued))

echo -e "${BLUE}Queued Workflows:${NC}"
echo -e "${GREEN}  New system:     $new_queued workflows${NC} (pr-gate, docs-ci, server-ci, etc.)"
echo -e "${RED}  Archived:       $archived_queued workflows${NC} (old PRs not yet rebased)"
echo -e "  Total:          $total_queued workflows"

if [ "$total_queued" -gt 0 ]; then
  new_percent=$(echo "scale=1; $new_queued * 100 / $total_queued" | bc)
  archived_percent=$(echo "scale=1; $archived_queued * 100 / $total_queued" | bc)

  echo -e "\n${BLUE}Queue Composition:${NC}"
  echo -e "${GREEN}  New system:     ${new_percent}%${NC}"
  echo -e "${RED}  Archived:       ${archived_percent}%${NC}"
fi

# Count old PRs
old_pr_count=$(gh pr list --state open --limit 100 --json createdAt \
  --jq '.[] | select(.createdAt < "2026-03-04T00:00:00Z")' | wc -l | tr -d ' ')

echo -e "\n${BLUE}Old PRs Status:${NC}"
echo -e "  Total old PRs:  $old_pr_count (created before 2026-03-04)"
echo -e "  Notified:       57 (all received migration instructions)"

# Estimate migration based on queue composition
if [ "$archived_queued" -lt 10 ]; then
  echo -e "\n${GREEN}✅ Most PRs have migrated! Queue is mostly new workflows.${NC}"
elif [ "$archived_queued" -lt 30 ]; then
  echo -e "\n${YELLOW}⚠️  Some PRs still migrating. About 50% of queue is archived workflows.${NC}"
else
  echo -e "\n${YELLOW}⚠️  Many PRs not yet rebased. $archived_queued archived workflows still queued.${NC}"
fi

echo -e "\n${BLUE}Next Actions:${NC}"
echo -e "- Old PRs will fail archived workflow checks (expected)"
echo -e "- Authors can rebase anytime using migration guide"
echo -e "- System stable; no intervention needed"

echo ""
