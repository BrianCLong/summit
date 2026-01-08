#!/bin/bash
# scripts/validate-env.sh

set -e

# --- Color Codes ---
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# --- Version Checks ---
echo "--- Validating Environment ---"

# 1. Node.js Version
NODE_REQUIRED=$(grep -oP '(?<="node": ")[^"]*' package.json)
NODE_VERSION=$(node -v)
if ! [[ $NODE_VERSION =~ ${NODE_REQUIRED} ]]; then
  echo -e "${RED}Error: Incorrect Node.js version.${NC}"
  echo "Required: ${NODE_REQUIRED}"
  echo "Found:    ${NODE_VERSION}"
  exit 1
fi
echo -e "${GREEN}Node.js version... OK (${NODE_VERSION})${NC}"

# 2. pnpm Version
PNPM_REQUIRED=$(grep -oP '(?<="packageManager": "pnpm@)[^"]*' package.json)
PNPM_VERSION=$(pnpm -v)
if ! [[ $PNPM_VERSION =~ ${PNPM_REQUIRED} ]]; then
  echo -e "${RED}Error: Incorrect pnpm version.${NC}"
  echo "Required: ${PNPM_REQUIRED}"
  echo "Found:    ${PNPM_VERSION}"
  exit 1
fi
echo -e "${GREEN}pnpm version... OK (${PNPM_VERSION})${NC}"

# 3. Docker (optional but recommended)
if ! command -v docker &> /dev/null; then
  echo -e "${YELLOW}Warning: Docker is not installed. Some features like 'make up' may not work.${NC}"
else
  echo -e "${GREEN}Docker... OK ($(docker --version))${NC}"
fi

echo -e "\n${GREEN}--- Environment validation successful! ---${NC}"
