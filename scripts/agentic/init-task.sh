#!/usr/bin/env bash
# Initialize a new agentic task

set -euo pipefail

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}=== Agentic Task Initializer ===${NC}\n"

# Get task ID
read -p "Task ID (e.g., 456): " TASK_ID
if [ -z "$TASK_ID" ]; then
  echo -e "${RED}Error: Task ID required${NC}"
  exit 1
fi

# Get task name
read -p "Task name (e.g., auth-improvements): " TASK_NAME
if [ -z "$TASK_NAME" ]; then
  echo -e "${RED}Error: Task name required${NC}"
  exit 1
fi

# Select agent
echo -e "\n${YELLOW}Select agent:${NC}"
echo "1) Claude Code (complex architecture)"
echo "2) Codex (deterministic critical code)"
echo "3) Jules/Gemini (cross-file refactoring)"
echo "4) Cursor/Warp (devloop integration)"
echo "5) Summit/IntelGraph (multi-service)"
echo "6) CI/CD (pipeline changes)"
read -p "Choice [1-6]: " AGENT_CHOICE

case $AGENT_CHOICE in
  1) AGENT="claude-code" ;;
  2) AGENT="codex" ;;
  3) AGENT="jules-gemini" ;;
  4) AGENT="cursor-warp" ;;
  5) AGENT="summit-intelgraph" ;;
  6) AGENT="ci-cd" ;;
  *) echo -e "${RED}Invalid choice${NC}"; exit 1 ;;
esac

TASK_FILE=".agentic-prompts/task-${TASK_ID}-${TASK_NAME}.md"

if [ -f "$TASK_FILE" ]; then
  echo -e "${RED}Error: Task file already exists${NC}"
  exit 1
fi

# Copy template
cp "prompts/${AGENT}.md" "$TASK_FILE"

echo -e "\n${GREEN}✓ Created ${TASK_FILE}${NC}"
echo -e "${YELLOW}Next steps:${NC}"
echo "1. Edit task file with specific requirements"
echo "2. Load into AI coding assistant"
echo "3. Execute and create PR"
echo "4. Run: ./scripts/agentic/archive-task.sh ${TASK_ID}"

echo -e "\n${BLUE}Opening task file...${NC}"
${EDITOR:-vim} "$TASK_FILE"
