#!/bin/bash
set -e

# ga:verify:merge - Bounded Verification Gate
# Designed to complete within strict time budget (default 10m).
# Usage: ./scripts/ga/ga-verify-merge.sh

# Enforce deterministic environment
export ZERO_FOOTPRINT=true
export NO_NETWORK_LISTEN=true
export CI=${CI:-1}

START_TIME=$(date +%s)
TIMEOUT=${GA_VERIFY_TIMEOUT:-600} # 10 minutes default

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

log_step() {
    echo -e "${YELLOW}▶️  $1...${NC}"
}

log_time() {
    END_TIME=$(date +%s)
    DURATION=$((END_TIME - LAST_TIME))
    echo -e "${GREEN}⏱️  Step '$1' took ${DURATION}s${NC}"
    LAST_TIME=$END_TIME

    TOTAL_DURATION=$((END_TIME - START_TIME))
    if [ $TOTAL_DURATION -gt $TIMEOUT ]; then
        echo -e "${RED}❌ TOTAL TIMEOUT EXCEEDED! ($TOTAL_DURATION > $TIMEOUT)${NC}"
        echo "The gate failed because it took too long. Optimize the step or use ga:verify:full."
        exit 1
    fi
}

LAST_TIME=$START_TIME

echo "🚀 Starting ga:verify:merge (Budget: ${TIMEOUT}s)"
echo "   Environment: ZERO_FOOTPRINT=true, NO_NETWORK_LISTEN=true, CI=$CI"

# 1. Typecheck
log_step "Typecheck"
# Running in parallel if possible, but sequential for clear timing
pnpm typecheck
log_time "Typecheck"

# 2. Lint
log_step "Lint"
pnpm lint
log_time "Lint"

# 3. Build
log_step "Build"
pnpm build
log_time "Build"

# 4. Unit Tests (Server) - The critical path
log_step "Unit Tests (Server)"
# We explicitly run unit tests. We exclude integration/e2e/slow tests if they are separated.
# Currently test:unit in server/package.json excludes 'integration'.
# We assume this is fast enough. If not, we would shard here.
pnpm --filter intelgraph-server test:unit
log_time "Unit Tests"

# 5. Smoke (Lightweight)
log_step "Smoke"
pnpm ga:smoke
log_time "Smoke"

TOTAL_TIME=$(( $(date +%s) - START_TIME ))
echo -e "${GREEN}✅ ga:verify:merge PASSED in ${TOTAL_TIME}s${NC}"
