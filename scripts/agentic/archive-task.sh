#!/usr/bin/env bash
# Archive a completed agentic task

set -euo pipefail

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

TASK_ID="$1"

if [ -z "$TASK_ID" ]; then
  echo -e "${RED}Usage: $0 <task-id>${NC}"
  exit 1
fi

echo -e "${BLUE}=== Archiving Task ${TASK_ID} ===${NC}\n"

# Find task file
TASK_FILE=$(find .agentic-prompts -maxdepth 1 -name "task-${TASK_ID}-*.md" | head -n1)

if [ -z "$TASK_FILE" ]; then
  echo -e "${RED}Error: Task file not found for ID ${TASK_ID}${NC}"
  exit 1
fi

echo -e "Found: ${YELLOW}${TASK_FILE}${NC}"

# Get timing info
read -p "Time to PR (minutes): " TIME_TO_PR
read -p "Time to merge (minutes): " TIME_TO_MERGE

# Create archive directory
ARCHIVE_DIR=".agentic-prompts/archived/$(date +%Y-%m)"
mkdir -p "$ARCHIVE_DIR"

# Move file
BASENAME=$(basename "$TASK_FILE")
mv "$TASK_FILE" "${ARCHIVE_DIR}/${BASENAME}"

echo -e "${GREEN}✓ Moved to ${ARCHIVE_DIR}/${BASENAME}${NC}"

# Log velocity
LOG_ENTRY="$(date +%Y-%m-%d %H:%M): Task ${TASK_ID} - ${TIME_TO_PR}min - ${TIME_TO_MERGE}min - completed"
echo "$LOG_ENTRY" >> .agentic-prompts/velocity.log

echo -e "${GREEN}✓ Logged to velocity.log${NC}"

# Commit archive
git add .agentic-prompts/
git commit -m "chore: Archive completed task ${TASK_ID}

- Time to PR: ${TIME_TO_PR} minutes
- Time to merge: ${TIME_TO_MERGE} minutes
- Archived to: ${ARCHIVE_DIR}"

echo -e "${GREEN}✓ Committed archive${NC}"

echo -e "\n${BLUE}=== Task ${TASK_ID} Archived Successfully ===${NC}"
echo -e "${YELLOW}Push to remote:${NC} git push"
