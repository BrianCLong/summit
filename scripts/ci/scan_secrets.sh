#!/bin/bash
set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RESET='\033[0m'
BOLD='\033[1m'

echo -e "${BOLD}🔍 Starting Secrets Scan...${RESET}"

# Check if gitleaks is installed
if ! command -v gitleaks &> /dev/null; then
    echo -e "${YELLOW}Warning: gitleaks not found. Skipping secrets scan.${RESET}"
    echo -e "To install: brew install gitleaks (macOS) or visit https://github.com/gitleaks/gitleaks"
    exit 0
fi

# Determine mode
MODE="staged"
if [ "$1" == "--full" ] || [ "$CI" == "true" ]; then
    MODE="full"
fi

if [ "$MODE" == "staged" ]; then
    echo -e "Mode: ${GREEN}Staged Files Only${RESET} (Local development)"
    # Scan staged changes
    gitleaks protect --staged --verbose
else
    echo -e "Mode: ${YELLOW}Full History / CI${RESET}"
    # Scan entire history or as configured for CI
    # In CI, we usually want to scan the commits in the PR
    if [ -n "$GITHUB_EVENT_PATH" ]; then
        echo -e "GitHub Action detected. Scanning PR changes..."
        gitleaks detect --verbose --redact
    else
        gitleaks detect --verbose
    fi
fi

RESULT=$?

if [ $RESULT -eq 0 ]; then
    echo -e "${GREEN}✅ No secrets detected.${RESET}"
    exit 0
else
    echo -e "${RED}❌ Secrets detected! Please remove them and try again.${RESET}"
    echo -e "Use 'git reset HEAD <file>' to unstage and clean up sensitive data."
    exit 1
fi
