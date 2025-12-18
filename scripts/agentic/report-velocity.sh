#!/usr/bin/env bash
# Generate velocity metrics report

set -euo pipefail

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}=== Agentic Task Velocity Report ===${NC}\n"

LOG_FILE=".agentic-prompts/velocity.log"

if [ ! -f "$LOG_FILE" ]; then
  echo -e "${YELLOW}No velocity log found${NC}"
  exit 0
fi

# Today's tasks
TODAY=$(date +%Y-%m-%d)
TODAY_COUNT=$(grep "$TODAY" "$LOG_FILE" | grep -c "completed" || true)

echo -e "${GREEN}Today ($TODAY):${NC}"
echo "  Tasks completed: $TODAY_COUNT"
echo ""

# This week's tasks
WEEK_START=$(date -v-Mon +%Y-%m-%d 2>/dev/null || date -d 'last monday' +%Y-%m-%d)
WEEK_COUNT=$(awk -v start="$WEEK_START" '$1 >= start' "$LOG_FILE" | grep -c "completed" || true)

echo -e "${GREEN}This week (since $WEEK_START):${NC}"
echo "  Tasks completed: $WEEK_COUNT"
echo ""

# Average time to PR
AVG_PR=$(grep "completed" "$LOG_FILE" | \
  awk -F' - ' '{sum+=$2; count++} END {if(count>0) printf "%.0f", sum/count; else print "N/A"}')

echo -e "${GREEN}Averages:${NC}"
echo "  Time to PR: ${AVG_PR} minutes"
echo ""

# Target comparison
echo -e "${BLUE}Targets:${NC}"
echo "  Daily: 3-5 tasks (current: $TODAY_COUNT)"
echo "  Weekly: 15-25 tasks (current: $WEEK_COUNT)"
echo "  Time to PR: <120 min (current: ${AVG_PR} min)"
echo ""

# Status
if [ "$TODAY_COUNT" -ge 3 ]; then
  echo -e "${GREEN}✅ On track for daily target!${NC}"
elif [ "$TODAY_COUNT" -gt 0 ]; then
  echo -e "${YELLOW}⚠️  $((3 - TODAY_COUNT)) more tasks needed for daily target${NC}"
else
  echo -e "${YELLOW}🚀 Let's get started!${NC}"
fi
