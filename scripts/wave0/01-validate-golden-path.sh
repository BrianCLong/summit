#!/bin/bash
# Wave 0: Validate Golden Path
# Ensures make bootstrap && make up && make smoke works on fresh clone

set -e

echo "========================================="
echo "Wave 0: Golden Path Validation"
echo "========================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Track failures
FAILURES=0

log_success() {
    echo -e "${GREEN}✓${NC} $1"
}

log_failure() {
    echo -e "${RED}✗${NC} $1"
    FAILURES=$((FAILURES + 1))
}

log_warning() {
    echo -e "${YELLOW}!${NC} $1"
}

log_info() {
    echo -e "  $1"
}

# Step 1: Check prerequisites
echo ""
echo "Step 1: Checking prerequisites..."
echo "-----------------------------------------"

# Check Docker
if command -v docker &> /dev/null; then
    DOCKER_VERSION=$(docker --version | cut -d' ' -f3 | cut -d',' -f1)
    log_success "Docker installed: $DOCKER_VERSION"
else
    log_failure "Docker not installed"
fi

# Check Docker Compose
if command -v docker-compose &> /dev/null || docker compose version &> /dev/null; then
    log_success "Docker Compose available"
else
    log_failure "Docker Compose not available"
fi

# Check Node.js
if command -v node &> /dev/null; then
    NODE_VERSION=$(node --version)
    log_success "Node.js installed: $NODE_VERSION"
else
    log_failure "Node.js not installed"
fi

# Check pnpm
if command -v pnpm &> /dev/null; then
    PNPM_VERSION=$(pnpm --version)
    log_success "pnpm installed: $PNPM_VERSION"
else
    log_failure "pnpm not installed"
fi

# Step 2: Clean state (optional)
echo ""
echo "Step 2: Preparing clean state..."
echo "-----------------------------------------"

if [ "$1" == "--clean" ]; then
    log_info "Cleaning previous state..."
    make down 2>/dev/null || true
    make clean 2>/dev/null || true
    log_success "Clean state prepared"
else
    log_warning "Skipping clean (use --clean flag to clean first)"
fi

# Step 3: Bootstrap
echo ""
echo "Step 3: Running bootstrap..."
echo "-----------------------------------------"

if make bootstrap; then
    log_success "make bootstrap completed"
else
    log_failure "make bootstrap failed"
fi

# Step 4: Start services
echo ""
echo "Step 4: Starting services..."
echo "-----------------------------------------"

if make up; then
    log_success "make up completed"
else
    log_failure "make up failed"
fi

# Step 5: Wait for services
echo ""
echo "Step 5: Waiting for services to be ready..."
echo "-----------------------------------------"

MAX_WAIT=120
WAITED=0
READY=false

while [ $WAITED -lt $MAX_WAIT ]; do
    if curl -sf http://localhost:4000/health > /dev/null 2>&1; then
        READY=true
        break
    fi
    sleep 2
    WAITED=$((WAITED + 2))
    echo -ne "\r  Waiting... ${WAITED}s"
done
echo ""

if [ "$READY" = true ]; then
    log_success "Services ready after ${WAITED}s"
else
    log_failure "Services did not become ready within ${MAX_WAIT}s"
fi

# Step 6: Run smoke tests
echo ""
echo "Step 6: Running smoke tests..."
echo "-----------------------------------------"

if make smoke; then
    log_success "make smoke completed"
else
    log_failure "make smoke failed"
fi

# Step 7: Health check endpoints
echo ""
echo "Step 7: Validating health endpoints..."
echo "-----------------------------------------"

# Basic health
if curl -sf http://localhost:4000/health > /dev/null; then
    log_success "GET /health returns 200"
else
    log_failure "GET /health failed"
fi

# Detailed health
HEALTH_DETAIL=$(curl -sf http://localhost:4000/health/detailed 2>/dev/null || echo '{}')
if echo "$HEALTH_DETAIL" | grep -q '"status"'; then
    log_success "GET /health/detailed returns status"
else
    log_failure "GET /health/detailed failed"
fi

# Metrics
if curl -sf http://localhost:4000/metrics > /dev/null; then
    log_success "GET /metrics returns 200"
else
    log_failure "GET /metrics failed"
fi

# Step 8: GraphQL introspection
echo ""
echo "Step 8: Validating GraphQL schema..."
echo "-----------------------------------------"

INTROSPECTION=$(curl -sf -X POST http://localhost:4000/graphql \
    -H "Content-Type: application/json" \
    -d '{"query":"{ __schema { types { name } } }"}' 2>/dev/null || echo '{}')

if echo "$INTROSPECTION" | grep -q '"__schema"'; then
    TYPE_COUNT=$(echo "$INTROSPECTION" | grep -o '"name"' | wc -l)
    log_success "GraphQL schema valid ($TYPE_COUNT types)"
else
    log_failure "GraphQL introspection failed"
fi

# Summary
echo ""
echo "========================================="
echo "Golden Path Validation Summary"
echo "========================================="

if [ $FAILURES -eq 0 ]; then
    echo -e "${GREEN}All checks passed!${NC}"
    echo ""
    echo "Golden path is GREEN. Ready for development."
    exit 0
else
    echo -e "${RED}$FAILURES check(s) failed${NC}"
    echo ""
    echo "Please fix the issues above before proceeding."
    exit 1
fi
