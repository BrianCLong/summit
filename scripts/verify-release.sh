#!/bin/bash
set -e

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}Starting Release Verification...${NC}"

# Check for jq
if ! command -v jq &> /dev/null; then
    echo -e "${RED}Error: jq is required but not installed.${NC}"
    exit 1
fi

# 1. Version Consistency Check
echo "Checking version consistency..."
SERVER_VERSION=$(jq -r .version server/package.json)
CLIENT_VERSION=$(jq -r .version client/package.json)
ROOT_VERSION=$(jq -r .version package.json)

if [ "$SERVER_VERSION" != "$CLIENT_VERSION" ]; then
    echo -e "${RED}Error: Version mismatch! Server: $SERVER_VERSION, Client: $CLIENT_VERSION${NC}"
    exit 1
else
    echo -e "${GREEN}✓ Server and Client versions match ($SERVER_VERSION)${NC}"
fi

if [ "$ROOT_VERSION" != "$SERVER_VERSION" ]; then
    echo -e "${YELLOW}Warning: Root version ($ROOT_VERSION) differs from packages ($SERVER_VERSION). Ensure this is intentional.${NC}"
else
    echo -e "${GREEN}✓ Root version matches packages${NC}"
fi

# 2. Artifacts Check
echo "Checking required artifacts..."

if [ -d "schemas" ]; then
    echo -e "${GREEN}✓ schemas/ directory exists${NC}"
else
    echo -e "${RED}Error: schemas/ directory missing${NC}"
    exit 1
fi

if [ -f "docs/README.md" ]; then
    echo -e "${GREEN}✓ docs/README.md exists${NC}"
else
    echo -e "${RED}Error: docs/README.md missing${NC}"
    exit 1
fi

if [ -f "CHANGELOG.md" ]; then
    echo -e "${GREEN}✓ CHANGELOG.md exists${NC}"
else
    echo -e "${RED}Error: CHANGELOG.md missing${NC}"
    exit 1
fi

# Check for SBOM (Warning only)
if ls sbom-*.json 1> /dev/null 2>&1; then
    echo -e "${GREEN}✓ SBOM found${NC}"
else
    echo -e "${YELLOW}Warning: No SBOM (sbom-*.json) found${NC}"
fi

# 3. Build/Test Check
if [[ "$*" == *"--dry-run"* ]]; then
    echo -e "${YELLOW}Skipping build/test checks (--dry-run specified)${NC}"
else
    echo "Running typecheck..."
    if npm run typecheck; then
        echo -e "${GREEN}✓ Typecheck passed${NC}"
    else
        echo -e "${RED}Error: Typecheck failed${NC}"
        exit 1
    fi
fi

echo -e "${GREEN}Release verification completed successfully.${NC}"
