#!/bin/bash
# demo-up.sh - One-command demo environment launcher for Summit Platform
# Usage: DEMO_MODE=1 ./scripts/demo-up.sh
#
# This script:
# 1. Verifies prerequisites (Docker, Node.js, etc.)
# 2. Brings up all services via docker-compose
# 3. Waits for health checks to pass
# 4. Seeds demo data
# 5. Opens the browser to the demo

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

log_info() { echo -e "${BLUE}[INFO]${NC} $1"; }
log_success() { echo -e "${GREEN}[SUCCESS]${NC} $1"; }
log_warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }

# Safety check: refuse to run in production
if [ "$NODE_ENV" = "production" ]; then
    log_error "Refusing to run demo-up in production environment!"
    log_error "NODE_ENV is set to 'production'. This script is for demo/development only."
    exit 1
fi

# Safety check: require DEMO_MODE=1
if [ "$DEMO_MODE" != "1" ]; then
    log_error "DEMO_MODE is not set to 1."
    log_error "To run the demo environment, use: DEMO_MODE=1 ./scripts/demo-up.sh"
    log_error "Or use: make demo"
    exit 1
fi

log_info "Starting Summit Platform Demo Environment..."
log_info "DEMO_MODE is enabled - this is safe for demonstration purposes."

if [ -n "$SWITCHBOARD_TENANT_ID" ]; then
    log_info "Active Profile Tenant: $SWITCHBOARD_TENANT_ID"
fi

# Run prerequisite checks
log_info "Checking prerequisites..."
if [ -f "$SCRIPT_DIR/demo-check.sh" ]; then
    bash "$SCRIPT_DIR/demo-check.sh"
else
    # Inline prerequisite checks
    command -v docker >/dev/null 2>&1 || { log_error "Docker is required but not installed."; exit 1; }
    command -v node >/dev/null 2>&1 || { log_error "Node.js is required but not installed."; exit 1; }
    command -v pnpm >/dev/null 2>&1 || { log_error "pnpm is required but not installed."; exit 1; }

    # Check Docker is running
    docker info >/dev/null 2>&1 || { log_error "Docker daemon is not running."; exit 1; }

    log_success "All prerequisites met."
fi

# Navigate to project root
cd "$PROJECT_ROOT"

# Install dependencies if needed
if [ ! -d "node_modules" ]; then
    log_info "Installing dependencies..."
    pnpm install
fi

# Create .env if it doesn't exist
if [ ! -f ".env" ]; then
    log_info "Creating .env from .env.example..."
    if [ -f ".env.example" ]; then
        cp .env.example .env
        echo "DEMO_MODE=1" >> .env
    else
        echo "DEMO_MODE=1" > .env
    fi
fi

# Ensure DEMO_MODE is in .env
if ! grep -q "DEMO_MODE=1" .env 2>/dev/null; then
    echo "DEMO_MODE=1" >> .env
fi

# Bring up services
log_info "Starting Docker services..."
if [ -f "docker-compose.dev.yml" ]; then
    docker-compose -f docker-compose.dev.yml up -d
elif [ -f "docker-compose.yml" ]; then
    docker-compose up -d
else
    log_error "No docker-compose file found!"
    exit 1
fi

# Wait for services to be healthy
log_info "Waiting for services to be ready..."

wait_for_service() {
    local url=$1
    local name=$2
    local max_attempts=${3:-30}
    local attempt=1

    while [ $attempt -le $max_attempts ]; do
        if curl -s -f "$url" >/dev/null 2>&1; then
            log_success "$name is ready!"
            return 0
        fi
        echo -n "."
        sleep 2
        attempt=$((attempt + 1))
    done

    log_warn "$name did not become ready in time (tried $max_attempts times)"
    return 1
}

echo ""
wait_for_service "http://localhost:4000/health" "API Server" 60
wait_for_service "http://localhost:3000" "Frontend" 60
wait_for_service "http://localhost:7474" "Neo4j" 30

# Seed demo data
log_info "Seeding demo data..."
if [ -f "$SCRIPT_DIR/demo-seed.sh" ]; then
    DEMO_MODE=1 bash "$SCRIPT_DIR/demo-seed.sh"
else
    # Try to run seed script directly
    if [ -f "server/scripts/seed-golden-path.ts" ]; then
        cd server && npx tsx scripts/seed-golden-path.ts && cd ..
    elif [ -f "scripts/seed-data.sh" ]; then
        bash scripts/seed-data.sh
    else
        log_warn "No seed script found. Skipping data seeding."
    fi
fi

# Run smoke tests if available
if [ -f "$SCRIPT_DIR/demo-smoke-test.sh" ]; then
    log_info "Running smoke tests..."
    bash "$SCRIPT_DIR/demo-smoke-test.sh" || log_warn "Some smoke tests failed, but continuing..."
fi

echo ""
log_success "=========================================="
log_success "  Summit Platform Demo is Ready!"
log_success "=========================================="
echo ""
log_info "Available endpoints:"
echo "  - Frontend:     http://localhost:3000"
echo "  - GraphQL API:  http://localhost:4000/graphql"
echo "  - Neo4j:        http://localhost:7474"
echo "  - PostgreSQL:   http://localhost:8080 (Adminer)"
echo "  - Prometheus:   http://localhost:9090"
echo "  - Grafana:      http://localhost:3001"
echo ""
log_info "To stop the demo: make demo-down or ./scripts/demo-down.sh"
echo ""

# Try to open browser
if command -v open >/dev/null 2>&1; then
    log_info "Opening browser..."
    open "http://localhost:3000"
elif command -v xdg-open >/dev/null 2>&1; then
    log_info "Opening browser..."
    xdg-open "http://localhost:3000"
fi

log_success "Demo environment started successfully!"
