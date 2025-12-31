#!/usr/bin/env bash
#
# bootstrap.sh - Deterministic dependency installation and environment validation
#
# Purpose: Ensure consistent developer and CI environment setup
# - Validates Node.js version matches pinned version
# - Validates pnpm is installed and correct version
# - Installs dependencies with frozen lockfile
# - Prints actionable diagnostics on failure
#
# Usage:
#   ./scripts/bootstrap.sh
#   pnpm bootstrap  (via package.json script)
#

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
REQUIRED_NODE_VERSION="20.19.0"
REQUIRED_PNPM_VERSION="10.0.0"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"

echo "🚀 Bootstrap: Summit Repository"
echo "================================"
echo ""

# Function to print error and exit
error() {
    echo -e "${RED}❌ ERROR: $1${NC}" >&2
    echo ""
    echo "💡 Diagnostic Information:"
    echo "  - Current directory: $(pwd)"
    echo "  - Node version: $(node --version 2>/dev/null || echo 'not found')"
    echo "  - pnpm version: $(pnpm --version 2>/dev/null || echo 'not found')"
    echo "  - PATH: $PATH"
    echo ""
    exit 1
}

# Function to print success
success() {
    echo -e "${GREEN}✓ $1${NC}"
}

# Function to print warning
warn() {
    echo -e "${YELLOW}⚠ $1${NC}"
}

# Step 1: Validate Node.js version
echo "📋 Step 1/4: Validating Node.js version..."
if ! command -v node &> /dev/null; then
    error "Node.js is not installed. Please install Node.js ${REQUIRED_NODE_VERSION}"
fi

CURRENT_NODE_VERSION=$(node --version | sed 's/v//')
if [[ "${CURRENT_NODE_VERSION}" != "${REQUIRED_NODE_VERSION}" ]]; then
    warn "Node.js version mismatch!"
    echo "   Expected: ${REQUIRED_NODE_VERSION}"
    echo "   Found:    ${CURRENT_NODE_VERSION}"
    echo ""
    echo "   To fix:"
    echo "   - Using nvm: nvm install ${REQUIRED_NODE_VERSION} && nvm use ${REQUIRED_NODE_VERSION}"
    echo "   - Using asdf: asdf install nodejs ${REQUIRED_NODE_VERSION} && asdf local nodejs ${REQUIRED_NODE_VERSION}"
    echo "   - Or update .nvmrc to match your version"
    echo ""
    if [[ "${CI:-false}" != "true" ]]; then
        read -p "   Continue anyway? (y/N) " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            exit 1
        fi
    else
        error "Node.js version mismatch in CI - refusing to continue"
    fi
else
    success "Node.js version ${CURRENT_NODE_VERSION}"
fi

# Step 2: Validate pnpm
echo ""
echo "📦 Step 2/4: Validating pnpm..."
if ! command -v pnpm &> /dev/null; then
    error "pnpm is not installed. Install with: npm install -g pnpm@${REQUIRED_PNPM_VERSION}"
fi

CURRENT_PNPM_VERSION=$(pnpm --version)
if [[ "${CURRENT_PNPM_VERSION}" != "${REQUIRED_PNPM_VERSION}" ]]; then
    warn "pnpm version mismatch!"
    echo "   Expected: ${REQUIRED_PNPM_VERSION}"
    echo "   Found:    ${CURRENT_PNPM_VERSION}"
    echo ""
    echo "   To fix: npm install -g pnpm@${REQUIRED_PNPM_VERSION}"
    echo "   Or use: corepack enable && corepack prepare pnpm@${REQUIRED_PNPM_VERSION} --activate"
    echo ""
    if [[ "${CI:-false}" != "true" ]]; then
        read -p "   Continue anyway? (y/N) " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            exit 1
        fi
    else
        error "pnpm version mismatch in CI - refusing to continue"
    fi
else
    success "pnpm version ${CURRENT_PNPM_VERSION}"
fi

# Step 3: Install dependencies
echo ""
echo "📥 Step 3/4: Installing dependencies..."
cd "${ROOT_DIR}"

# Use --frozen-lockfile in CI, prefer-frozen-lockfile locally for flexibility
if [[ "${CI:-false}" == "true" ]]; then
    LOCKFILE_FLAG="--frozen-lockfile"
    echo "   Running in CI mode (frozen lockfile)"
else
    LOCKFILE_FLAG="--prefer-frozen-lockfile"
    echo "   Running in dev mode (prefer frozen lockfile)"
fi

if ! pnpm install ${LOCKFILE_FLAG}; then
    error "pnpm install failed. Check the error output above."
fi

success "Dependencies installed"

# Step 4: Verify critical tools
echo ""
echo "🔧 Step 4/4: Verifying critical tools..."

TOOLS_OK=true

# Check for tsx (needed for verification scripts)
if ! pnpm exec tsx --version &> /dev/null; then
    warn "tsx not found - verification scripts may fail"
    TOOLS_OK=false
else
    success "tsx available"
fi

# Check for jest (needed for unit tests)
if ! pnpm exec jest --version &> /dev/null; then
    warn "jest not found - unit tests may fail"
    TOOLS_OK=false
else
    success "jest available"
fi

# Check for eslint (needed for linting)
if ! pnpm exec eslint --version &> /dev/null; then
    warn "eslint not found - linting may fail"
    TOOLS_OK=false
else
    success "eslint available"
fi

# Check for TypeScript
if ! pnpm exec tsc --version &> /dev/null; then
    warn "tsc not found - type checking may fail"
    TOOLS_OK=false
else
    success "tsc available"
fi

echo ""
if [[ "${TOOLS_OK}" == "true" ]]; then
    echo -e "${GREEN}✅ Bootstrap complete!${NC}"
else
    echo -e "${YELLOW}⚠️  Bootstrap complete with warnings${NC}"
fi

echo ""
echo "Next steps:"
echo "  pnpm verify    - Run verification suite"
echo "  pnpm lint      - Run linters"
echo "  pnpm test      - Run tests"
echo "  pnpm build     - Build the project"
echo ""
