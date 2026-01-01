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

# 4. Supply Chain Security Check
if [ -n "$1" ] && [[ "$1" == v* ]]; then
    echo -e "${GREEN}Starting Supply Chain Verification...${NC}"
    TAG=$1

    # Try to detect repo, fallback to prompt default
    DETECTED_REPO=$(git config --get remote.origin.url | sed 's/.*github.com[:\/]\(.*\).git/\1/' || echo "")
    if [ -z "$DETECTED_REPO" ]; then
        DETECTED_REPO="intelgraph-server/intelgraph-server"
    fi

    REPO=${2:-$DETECTED_REPO}
    IMAGE="ghcr.io/$REPO:$TAG"

    echo "Verifying signature for $IMAGE..."
    if command -v cosign &> /dev/null; then
        cosign verify \
          --certificate-identity-regexp "https://github.com/$REPO/.*" \
          --certificate-oidc-issuer "https://token.actions.githubusercontent.com" \
          "$IMAGE"
    else
        echo -e "${YELLOW}Warning: cosign not found, skipping signature verification.${NC}"
    fi

    echo "Verifying provenance for $IMAGE..."
    if command -v slsa-verifier &> /dev/null; then
        slsa-verifier verify-image \
          "$IMAGE" \
          --source-uri "github.com/$REPO" \
          --provenance-repository "$REPO"
    else
        echo -e "${YELLOW}Warning: slsa-verifier not found, skipping provenance verification.${NC}"
    fi

    echo -e "${GREEN}Supply Chain Verification completed.${NC}"
else
    echo -e "${YELLOW}Skipping Supply Chain Verification (no tag provided).${NC}"
    echo "Usage: $0 <tag> [repo] to verify signatures."
fi
