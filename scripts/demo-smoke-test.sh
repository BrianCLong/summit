#!/bin/bash

# Demo Smoke Test
# Quick verification that the demo environment can be started and basic functionality works
# This is a fast test that doesn't start all services, just verifies the scripts work properly

set -euo pipefail

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🧪 Demo Smoke Test${NC}"
echo -e "${BLUE}=================${NC}"
echo ""

# Test 1: Verify demo-up.sh script exists and is executable
echo -n "Checking demo-up.sh script... "
if [[ -x "/home/blong/Developer/summit/scripts/demo-up.sh" ]]; then
    echo -e "${GREEN}✓${NC}"
else
    echo -e "${RED}❌${NC}"
    exit 1
fi

# Test 2: Verify demo-seed.sh script exists and is executable
echo -n "Checking demo-seed.sh script... "
if [[ -x "/home/blong/Developer/summit/scripts/demo-seed.sh" ]]; then
    echo -e "${GREEN}✓${NC}"
else
    echo -e "${RED}❌${NC}"
    exit 1
fi

# Test 3: Verify demo scripts have proper help
echo -n "Checking demo-up.sh help option... "
if /home/blong/Developer/summit/scripts/demo-up.sh --help >/dev/null 2>&1; then
    echo -e "${GREEN}✓${NC}"
else
    echo -e "${RED}❌${NC}"
    exit 1
fi

# Test 4: Verify safety checks work (should fail without DEMO_MODE)
echo -n "Checking safety checks (should fail without DEMO_MODE)... "
if env -u DEMO_MODE /home/blong/Developer/summit/scripts/demo-up.sh --check 2>/dev/null; then
    echo -e "${RED}❌ (should have failed)${NC}"
    exit 1
else
    echo -e "${GREEN}✓${NC}"
fi

# Test 5: Verify safety checks work (should fail with NODE_ENV=production)
echo -n "Checking safety checks (should fail with NODE_ENV=production)... "
if env NODE_ENV=production DEMO_MODE=1 /home/blong/Developer/summit/scripts/demo-up.sh --check 2>/dev/null; then
    echo -e "${RED}❌ (should have failed)${NC}"
    exit 1
else
    echo -e "${GREEN}✓${NC}"
fi

# Test 6: Verify --check works with proper environment
echo -n "Checking --check with proper environment... "
if DEMO_MODE=1 /home/blong/Developer/summit/scripts/demo-up.sh --check >/dev/null 2>&1; then
    echo -e "${GREEN}✓${NC}"
else
    echo -e "${RED}❌${NC}"
    exit 1
fi

# Test 7: Verify demo-seed.sh safety checks
echo -n "Checking demo-seed.sh safety checks... "
if env -u DEMO_MODE /home/blong/Developer/summit/scripts/demo-seed.sh 2>/dev/null; then
    echo -e "${RED}❌ (should have failed)${NC}"
    exit 1
else
    echo -e "${GREEN}✓${NC}"
fi

# Test 8: Check that Makefile has demo target
echo -n "Checking Makefile demo target... "
if grep -q "demo:" /home/blong/Developer/summit/Makefile; then
    echo -e "${GREEN}✓${NC}"
else
    echo -e "${RED}❌${NC}"
    exit 1
fi

echo ""
echo -e "${GREEN}🎉 All smoke tests passed! Demo environment is ready for full deployment.${NC}"
echo ""
echo "To run the full demo environment:"
echo "  make demo"
echo "Or:"
echo "  DEMO_MODE=1 ./scripts/demo-up.sh"