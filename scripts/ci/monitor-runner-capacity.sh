#!/bin/bash
# Monitor GitHub Actions runner capacity
# Alerts when queue depth exceeds thresholds

set -euo pipefail

# Color codes
RED='\033[0;31m'
YELLOW='\033[1;33m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}=== GitHub Actions Runner Capacity Monitor ===${NC}"
echo ""

# Get current status
QUEUED=$(gh run list --status queued --limit 100 --json databaseId | jq '. | length')
IN_PROGRESS=$(gh run list --status in_progress --limit 100 --json databaseId | jq '. | length')
MERGE_SURGE=$(gh api repos/:owner/:repo/actions/variables/MERGE_SURGE | jq -r '.value')

# Calculate health score
HEALTH="HEALTHY"
COLOR=$GREEN

if [ "$QUEUED" -gt 100 ]; then
  HEALTH="CRITICAL"
  COLOR=$RED
elif [ "$QUEUED" -gt 50 ]; then
  HEALTH="WARNING"
  COLOR=$YELLOW
fi

# Check for gridlock (queued but nothing running)
if [ "$QUEUED" -gt 20 ] && [ "$IN_PROGRESS" -eq 0 ]; then
  HEALTH="GRIDLOCK"
  COLOR=$RED
fi

# Display status
echo -e "${COLOR}Status: $HEALTH${NC}"
echo ""
echo "Queued workflows:     $QUEUED"
echo "In-progress workflows: $IN_PROGRESS"
echo "MERGE_SURGE mode:     $MERGE_SURGE"
echo ""

# Show most queued workflows
echo -e "${BLUE}=== Top Queued Workflows ===${NC}"
gh run list --status queued --limit 50 --json workflowName | \
  jq -r '.[].workflowName' | \
  sort | uniq -c | sort -rn | head -10
echo ""

# Show currently running workflows
echo -e "${BLUE}=== Currently Running ===${NC}"
gh run list --status in_progress --limit 20 --json workflowName | \
  jq -r '.[].workflowName' | head -10
echo ""

# Recommendations
echo -e "${BLUE}=== Recommendations ===${NC}"
if [ "$HEALTH" = "GRIDLOCK" ]; then
  echo -e "${RED}⚠️  GRIDLOCK DETECTED${NC}"
  echo "Actions required:"
  echo "  1. gh api --method PATCH repos/:owner/:repo/actions/variables/MERGE_SURGE -f value=\"true\""
  echo "  2. bash scripts/ci/cancel-queued-runs.sh"
elif [ "$HEALTH" = "CRITICAL" ]; then
  echo -e "${RED}⚠️  CRITICAL QUEUE DEPTH${NC}"
  echo "Consider enabling MERGE_SURGE mode:"
  echo "  gh api --method PATCH repos/:owner/:repo/actions/variables/MERGE_SURGE -f value=\"true\""
elif [ "$HEALTH" = "WARNING" ]; then
  echo -e "${YELLOW}⚠️  ELEVATED QUEUE DEPTH${NC}"
  echo "Monitor closely. If queue continues growing, enable MERGE_SURGE mode."
elif [ "$MERGE_SURGE" = "true" ] && [ "$QUEUED" -lt 20 ]; then
  echo -e "${GREEN}✅ HEALTHY - Consider disabling MERGE_SURGE${NC}"
  echo "Queue is low. You can restore full CI coverage:"
  echo "  gh api --method PATCH repos/:owner/:repo/actions/variables/MERGE_SURGE -f value=\"false\""
else
  echo -e "${GREEN}✅ HEALTHY${NC}"
  echo "Runner capacity is within normal limits."
fi

echo ""
echo "Last updated: $(date)"
