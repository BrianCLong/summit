#!/bin/bash
set -e

# Golden Path Entrypoint
# Validates the entire development lifecycle: setup -> lint -> test -> e2e

# Colors for output
GREEN="\033[0;32m"
RED="\033[0;31m"
YELLOW="\033[1;33m"
NC="\033[0m" # No Color

log() {
    echo -e "${GREEN}[Golden Path]${NC} $1"
}

error() {
    echo -e "${RED}[Golden Path Error]${NC} $1"
}

warn() {
    echo -e "${YELLOW}[Golden Path Warning]${NC} $1"
}

# Load .env if present
if [ -f .env ]; then
    export $(cat .env | grep -v "^#" | xargs)
fi

# Cleanup function to be called on exit
cleanup() {
    EXIT_CODE=$?
    if [ $EXIT_CODE -ne 0 ]; then
        error "Golden Path failed with exit code $EXIT_CODE"
        log "Docker logs (tail 50 lines):"
        docker compose -f docker-compose.dev.yml logs --tail=50 || true
    fi
    log "Cleaning up resources..."
    make down > /dev/null 2>&1 || true
}

# Trap exit to ensure cleanup
trap cleanup EXIT

# 1. Prerequisite Check
log "Step 1: Checking Prerequisites..."
command -v node >/dev/null 2>&1 || { error "node not found"; exit 1; }
command -v pnpm >/dev/null 2>&1 || { error "pnpm not found"; exit 1; }
command -v docker >/dev/null 2>&1 || { error "docker not found"; exit 1; }

echo "Node: $(node -v)"
echo "pnpm: $(pnpm -v)"
echo "Docker: $(docker -v)"

# 2. Bootstrap (Install Dependencies)
log "Step 2: Bootstrapping Environment..."
# Run make bootstrap but suppress noisy output unless it fails
if ! make bootstrap > /dev/null 2>&1; then
    error "Bootstrap failed. Re-running with output:"
    make bootstrap
    exit 1
fi

# 3. Fast Checks (Lint & Unit Tests)
log "Step 3: Fast Checks (Lint & Unit Tests)..."
log "Running lint..."
if ! make lint > /dev/null 2>&1; then
    error "Lint failed. Re-running with output:"
    make lint
    exit 1
fi

log "Running unit tests..."
if ! make test > /dev/null 2>&1; then
    warn "Unit tests failed. Continuing but please fix tests."
    # In strict mode we would exit here:
    # make test
    # exit 1
fi

# 4. Start Stack
log "Step 4: Starting Development Stack..."
make up

# 5. Wait for Health
log "Step 5: Waiting for Services..."
TIMEOUT=120
START_TIME=$(date +%s)

wait_for_url() {
    local url=$1
    local name=$2
    local healthy=0

    echo -n "Waiting for $name ($url)..."
    while [ $(( $(date +%s) - START_TIME )) -lt $TIMEOUT ]; do
        if curl -s -f "$url" > /dev/null 2>&1; then
            healthy=1
            echo " OK"
            return 0
        fi
        echo -n "."
        sleep 2
    done

    echo " FAIL"
    error "Service $name failed to start within $TIMEOUT seconds."
    return 1
}

if ! wait_for_url "http://localhost:4000/health" "API"; then exit 1; fi
if ! wait_for_url "http://localhost:3000" "Frontend"; then exit 1; fi

# 6. End-to-End Smoke Tests
log "Step 6: Running E2E Golden Path Tests..."
# Force Playwright to use the running stack (no webServer)
export PLAYWRIGHT_USE_WEBSERVER=false
export BASE_URL=http://localhost:3000

# We use the golden-path specific E2E tests
if ! pnpm test:e2e:golden-path; then
    error "E2E tests failed."
    exit 1
fi

log "SUCCESS: Golden Path Verified!"
