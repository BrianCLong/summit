#!/bin/bash
# demo-seed.sh - Seed demo data into Summit Platform
# Usage: DEMO_MODE=1 ./scripts/demo-seed.sh

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log_info() { echo -e "${BLUE}[INFO]${NC} $1"; }
log_success() { echo -e "${GREEN}[SUCCESS]${NC} $1"; }
log_warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }

# Safety check: refuse to run in production
if [ "$NODE_ENV" = "production" ]; then
    log_error "Refusing to seed demo data in production environment!"
    exit 1
fi

# Safety check: require DEMO_MODE=1
if [ "$DEMO_MODE" != "1" ]; then
    log_error "DEMO_MODE is not set. Demo seeding requires DEMO_MODE=1"
    log_error "Usage: DEMO_MODE=1 ./scripts/demo-seed.sh"
    exit 1
fi

cd "$PROJECT_ROOT"

log_info "Seeding demo data..."

# Wait for API to be ready
wait_for_api() {
    local max_attempts=30
    local attempt=1
    while [ $attempt -le $max_attempts ]; do
        if curl -s -f "http://localhost:4000/health" >/dev/null 2>&1; then
            return 0
        fi
        sleep 2
        attempt=$((attempt + 1))
    done
    return 1
}

if ! wait_for_api; then
    log_error "API is not available. Please ensure services are running."
    exit 1
fi

# Run seed scripts
if [ -f "server/scripts/seed-golden-path.ts" ]; then
    log_info "Running golden path seed..."
    cd server
    npx tsx scripts/seed-golden-path.ts
    cd ..
elif [ -f "scripts/devkit/seed-fixtures.js" ]; then
    log_info "Running fixture seed..."
    node scripts/devkit/seed-fixtures.js
else
    log_warn "No seed script found. Creating basic demo data via GraphQL..."

    # Create a demo investigation via GraphQL
    curl -s -X POST http://localhost:4000/graphql \
        -H "Content-Type: application/json" \
        -d '{
            "query": "mutation { createInvestigation(input: { name: \"Demo Investigation\", description: \"Sample investigation for demo purposes\" }) { id name } }"
        }' > /dev/null 2>&1 || log_warn "Could not create demo investigation"
fi

log_success "Demo data seeded successfully!"
