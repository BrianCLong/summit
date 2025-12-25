#!/bin/bash
# demo-check.sh - Verify prerequisites for running Summit Platform demo
# Usage: ./scripts/demo-check.sh

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log_info() { echo -e "${BLUE}[INFO]${NC} $1"; }
log_success() { echo -e "${GREEN}[OK]${NC} $1"; }
log_warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }
log_error() { echo -e "${RED}[FAIL]${NC} $1"; }

ERRORS=0

echo ""
echo "Summit Platform Demo - Prerequisite Check"
echo "=========================================="
echo ""

# Check Docker
if command -v docker >/dev/null 2>&1; then
    DOCKER_VERSION=$(docker --version | cut -d' ' -f3 | tr -d ',')
    log_success "Docker installed: $DOCKER_VERSION"
else
    log_error "Docker is not installed"
    echo "  Install from: https://docs.docker.com/get-docker/"
    ERRORS=$((ERRORS + 1))
fi

# Check Docker daemon
if docker info >/dev/null 2>&1; then
    log_success "Docker daemon is running"
else
    log_error "Docker daemon is not running"
    echo "  Start Docker Desktop or run: sudo systemctl start docker"
    ERRORS=$((ERRORS + 1))
fi

# Check Docker memory
if docker info 2>/dev/null | grep -q "Total Memory"; then
    DOCKER_MEM=$(docker info 2>/dev/null | grep "Total Memory" | awk '{print $3}')
    log_info "Docker memory: $DOCKER_MEM"
fi

# Check Node.js
if command -v node >/dev/null 2>&1; then
    NODE_VERSION=$(node --version)
    NODE_MAJOR=$(echo "$NODE_VERSION" | cut -d'.' -f1 | tr -d 'v')
    if [ "$NODE_MAJOR" -ge 18 ]; then
        log_success "Node.js installed: $NODE_VERSION"
    else
        log_warn "Node.js $NODE_VERSION found, but 18+ recommended"
    fi
else
    log_error "Node.js is not installed"
    echo "  Install from: https://nodejs.org/"
    ERRORS=$((ERRORS + 1))
fi

# Check pnpm
if command -v pnpm >/dev/null 2>&1; then
    PNPM_VERSION=$(pnpm --version)
    log_success "pnpm installed: $PNPM_VERSION"
else
    log_error "pnpm is not installed"
    echo "  Install with: corepack enable && corepack prepare pnpm@latest --activate"
    ERRORS=$((ERRORS + 1))
fi

# Check Git
if command -v git >/dev/null 2>&1; then
    GIT_VERSION=$(git --version | cut -d' ' -f3)
    log_success "Git installed: $GIT_VERSION"
else
    log_warn "Git is not installed (optional but recommended)"
fi

# Check available ports
check_port() {
    local port=$1
    local name=$2
    if lsof -i ":$port" >/dev/null 2>&1 || nc -z localhost "$port" 2>/dev/null; then
        log_warn "Port $port ($name) is already in use"
        return 1
    else
        log_success "Port $port ($name) is available"
        return 0
    fi
}

echo ""
echo "Checking ports..."
check_port 3000 "Frontend" || true
check_port 4000 "API" || true
check_port 5432 "PostgreSQL" || true
check_port 6379 "Redis" || true
check_port 7474 "Neo4j HTTP" || true
check_port 7687 "Neo4j Bolt" || true

echo ""
echo "=========================================="

if [ $ERRORS -gt 0 ]; then
    log_error "$ERRORS prerequisite(s) failed"
    echo ""
    echo "Please install the missing prerequisites and try again."
    exit 1
else
    log_success "All prerequisites met!"
    echo ""
    echo "You can now run: make demo"
    exit 0
fi
