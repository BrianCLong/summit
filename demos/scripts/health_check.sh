#!/bin/bash
#
# Demo Health Check Script
#
# Verifies that all demo components are properly configured and operational.
#
# Usage:
#   ./scripts/health_check.sh
#

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DEMOS_DIR="$(dirname "$SCRIPT_DIR")"
PROJECT_ROOT="$(dirname "$DEMOS_DIR")"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}============================================================${NC}"
echo -e "${BLUE}            Demo Infrastructure Health Check${NC}"
echo -e "${BLUE}============================================================${NC}"
echo ""

CHECKS_PASSED=0
CHECKS_FAILED=0

check() {
    local name=$1
    local condition=$2

    if eval "$condition" >/dev/null 2>&1; then
        echo -e "  ${GREEN}✓${NC} $name"
        CHECKS_PASSED=$((CHECKS_PASSED + 1))
        return 0
    else
        echo -e "  ${RED}✗${NC} $name"
        CHECKS_FAILED=$((CHECKS_FAILED + 1))
        return 1
    fi
}

# === Python Environment ===
echo -e "${YELLOW}Python Environment${NC}"
check "Python 3 available" "python3 --version"
check "JSON module" "python3 -c 'import json'"
check "Logging module" "python3 -c 'import logging'"
check "Dataclasses module" "python3 -c 'from dataclasses import dataclass'"
check "Enum module" "python3 -c 'from enum import Enum'"
echo ""

# === Demo Files ===
echo -e "${YELLOW}Demo Files${NC}"
check "CLI script exists" "[ -f '$DEMOS_DIR/cli.sh' ]"
check "CLI is executable" "[ -x '$DEMOS_DIR/cli.sh' ]"
check "Misinfo dataset exists" "[ -f '$DEMOS_DIR/misinfo-defense/datasets/demo-posts.jsonl' ]"
check "Deescalation dataset exists" "[ -f '$DEMOS_DIR/deescalation/datasets/demo-conversations.jsonl' ]"
check "Misinfo pipeline exists" "[ -f '$DEMOS_DIR/misinfo-defense/pipelines/load_demo_data.py' ]"
check "Deescalation pipeline exists" "[ -f '$DEMOS_DIR/deescalation/pipelines/load_demo_data.py' ]"
check "Safety harness exists" "[ -f '$DEMOS_DIR/copilot/safety_harness.py' ]"
echo ""

# === Test Files ===
echo -e "${YELLOW}Test Files${NC}"
check "Misinfo tests exist" "[ -f '$DEMOS_DIR/misinfo-defense/pipelines/test_load_demo_data.py' ]"
check "Deescalation tests exist" "[ -f '$DEMOS_DIR/deescalation/pipelines/test_load_demo_data.py' ]"
check "Safety harness tests exist" "[ -f '$DEMOS_DIR/copilot/test_safety_harness.py' ]"
echo ""

# === Documentation ===
echo -e "${YELLOW}Documentation${NC}"
check "Main README exists" "[ -f '$DEMOS_DIR/README.md' ]"
check "Safety docs exist" "[ -f '$DEMOS_DIR/copilot/SAFETY.md' ]"
check "Implementation summary exists" "[ -f '$DEMOS_DIR/IMPLEMENTATION_SUMMARY.md' ]"
check "Misinfo demo script exists" "[ -f '$DEMOS_DIR/scripts/misinfo-demo-script.md' ]"
check "Deescalation demo script exists" "[ -f '$DEMOS_DIR/scripts/deescalation-demo-script.md' ]"
echo ""

# === Dataset Validation ===
echo -e "${YELLOW}Dataset Validation${NC}"
check "Misinfo dataset valid JSON" "python3 -c \"
import json
with open('$DEMOS_DIR/misinfo-defense/datasets/demo-posts.jsonl') as f:
    for line in f:
        if line.strip():
            json.loads(line)
\""
check "Deescalation dataset valid JSON" "python3 -c \"
import json
with open('$DEMOS_DIR/deescalation/datasets/demo-conversations.jsonl') as f:
    for line in f:
        if line.strip():
            json.loads(line)
\""
echo ""

# === Pipeline Imports ===
echo -e "${YELLOW}Pipeline Imports${NC}"
check "Misinfo pipeline imports" "cd '$DEMOS_DIR/misinfo-defense/pipelines' && python3 -c 'from load_demo_data import DemoDataLoader'"
check "Deescalation pipeline imports" "cd '$DEMOS_DIR/deescalation/pipelines' && python3 -c 'from load_demo_data import DemoConversationLoader'"
check "Safety harness imports" "cd '$DEMOS_DIR/copilot' && python3 -c 'from safety_harness import SafetyHarness'"
echo ""

# === Output Directories ===
echo -e "${YELLOW}Output Directories${NC}"
check "Misinfo output dir exists" "[ -d '$DEMOS_DIR/misinfo-defense/output' ] || mkdir -p '$DEMOS_DIR/misinfo-defense/output'"
check "Deescalation output dir exists" "[ -d '$DEMOS_DIR/deescalation/output' ] || mkdir -p '$DEMOS_DIR/deescalation/output'"
echo ""

# === Summary ===
echo -e "${BLUE}============================================================${NC}"
echo -e "${BLUE}                    Health Check Summary${NC}"
echo -e "${BLUE}============================================================${NC}"
echo ""
echo -e "  ${GREEN}Passed:${NC} $CHECKS_PASSED"
echo -e "  ${RED}Failed:${NC} $CHECKS_FAILED"
echo ""

if [ $CHECKS_FAILED -eq 0 ]; then
    echo -e "${GREEN}✓ All health checks passed! Demos are ready to run.${NC}"
    echo ""
    echo "Run demos with:"
    echo "  npm run demo:misinfo"
    echo "  npm run demo:deescalation"
    exit 0
else
    echo -e "${RED}✗ Some health checks failed. Please fix issues above.${NC}"
    exit 1
fi
