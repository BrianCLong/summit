#!/bin/bash

##
# Test Coverage Runner for Newly Added Modules
# Runs comprehensive tests with coverage reporting
##

set -e

echo "========================================"
echo "Running Comprehensive Test Coverage"
echo "========================================"
echo ""

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Clean previous coverage
echo -e "${YELLOW}Cleaning previous coverage data...${NC}"
rm -rf coverage/
rm -rf .nyc_output/
echo ""

# Install dependencies if needed
if [ ! -d "node_modules" ]; then
  echo -e "${YELLOW}Installing dependencies...${NC}"
  pnpm install
  echo ""
fi

# Run tests with coverage
echo -e "${GREEN}Running unit tests with coverage...${NC}"
echo ""

# Use the coverage configuration
jest --config jest.coverage.config.js --coverage --verbose

# Check if tests passed
if [ $? -eq 0 ]; then
  echo ""
  echo -e "${GREEN}✓ All tests passed!${NC}"
  echo ""
else
  echo ""
  echo -e "${RED}✗ Some tests failed${NC}"
  echo ""
  exit 1
fi

# Display coverage summary
echo ""
echo "========================================"
echo "Coverage Summary"
echo "========================================"
echo ""

if [ -f "coverage/lcov-report/index.html" ]; then
  echo -e "${GREEN}Coverage report generated at:${NC}"
  echo "  HTML Report: coverage/lcov-report/index.html"
  echo "  LCOV Report: coverage/lcov.info"
  echo "  JSON Report: coverage/coverage-final.json"
  echo ""
fi

# Display coverage thresholds status
if [ -f "coverage/coverage-summary.json" ]; then
  echo -e "${YELLOW}Coverage thresholds:${NC}"
  echo "  Global: 75% (lines, functions, branches, statements)"
  echo "  Security modules: 85% (lines, functions, branches, statements)"
  echo ""
fi

echo "========================================"
echo "To view detailed coverage report:"
echo "  open coverage/lcov-report/index.html"
echo "========================================"
echo ""
