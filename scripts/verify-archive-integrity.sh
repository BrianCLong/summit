#!/usr/bin/env bash

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${YELLOW}Starting Archive Integrity Verification...${NC}"

EXIT_CODE=0

echo -e "\n${YELLOW}Checking for executable files in .archive/...${NC}"
EXECUTABLE_FILES=$(find .archive/ -type f -executable 2>/dev/null || true)
if [ -n "$EXECUTABLE_FILES" ]; then
    echo -e "${RED}ERROR: Found executable files in .archive/. Archived scripts must not have executable permissions.${NC}"
    echo "$EXECUTABLE_FILES"
    EXIT_CODE=1
else
    echo -e "${GREEN}SUCCESS: No executable files found in .archive/.${NC}"
fi

echo -e "\n${YELLOW}Checking for active code importing from .archive/...${NC}"
BAD_IMPORTS=$(grep -rnE "from ['.\"]\.archive/|import ['.\"]\.archive/|require\(['\"]\.archive/" . \
    --exclude-dir=".archive" \
    --exclude-dir=".git" \
    --exclude-dir="node_modules" \
    --exclude="verify-archive-integrity.sh" \
    --exclude="archive-playbook.md" || true)

if [ -n "$BAD_IMPORTS" ]; then
    echo -e "${RED}ERROR: Active code files are importing from .archive/.${NC}"
    echo "$BAD_IMPORTS"
    EXIT_CODE=1
else
    echo -e "${GREEN}SUCCESS: No active imports from .archive/ found.${NC}"
fi

echo -e "\n${YELLOW}Checking for active workflows symlinked to .archive/...${NC}"
SYMLINKED_WORKFLOWS=$(find .github/workflows -maxdepth 1 -type l -exec readlink {} \; | grep "\.archive" || true)
if [ -n "$SYMLINKED_WORKFLOWS" ]; then
    echo -e "${RED}ERROR: Found active workflows symlinked to .archive/.${NC}"
    echo "$SYMLINKED_WORKFLOWS"
    EXIT_CODE=1
else
    echo -e "${GREEN}SUCCESS: No active workflows symlinked to .archive/.${NC}"
fi

if [ $EXIT_CODE -eq 0 ]; then
    echo -e "\n${GREEN}Archive integrity verification passed!${NC}"
else
    echo -e "\n${RED}Archive integrity verification failed! Please fix the errors above.${NC}"
    exit 1
fi
