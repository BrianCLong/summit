#!/usr/bin/env bash

set -euo pipefail

# IntelGraph Platform - Start Script
# Implements the "Golden Path" for starting the runtime.

# Colors
BLUE='\033[0;34m'
GREEN='\033[0;32m'
RED='\033[0;31m'
NC='\033[0m'

log_info() { echo -e "${BLUE}ℹ️  $1${NC}"; }
log_success() { echo -e "${GREEN}✅ $1${NC}"; }
log_error() { echo -e "${RED}❌ $1${NC}"; }

# Configuration
COMPOSE_FILE="docker-compose.dev.yml"
ENV_FILE=".env"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(dirname "$SCRIPT_DIR")"

cd "$ROOT_DIR"

# 1. Validation
if [ ! -f "$ENV_FILE" ]; then
    log_error "$ENV_FILE not found. Run './scripts/bootstrap.sh' first."
    exit 1
fi

if [ ! -f "$COMPOSE_FILE" ]; then
    log_error "$COMPOSE_FILE not found in project root."
    exit 1
fi

# 2. Start Services
log_info "Starting services via Docker Compose..."
log_info "Using compose file: $COMPOSE_FILE"

# Determine Docker Compose command
if command -v docker-compose >/dev/null 2>&1; then
    COMPOSE_CMD="docker-compose"
else
    COMPOSE_CMD="docker compose"
fi

$COMPOSE_CMD -f "$COMPOSE_FILE" --env-file "$ENV_FILE" up -d --build --remove-orphans || {
    log_error "Docker Compose failed to start services."
    echo "Troubleshooting:"
    echo "  1. Check memory (8GB+ recommended)."
    echo "  2. Check port conflicts: docker ps"
    echo "  3. View logs: $COMPOSE_CMD -f $COMPOSE_FILE logs"
    exit 1
}

# 3. Health Check
log_info "Waiting for services to be ready..."
./scripts/healthcheck.sh || {
    log_error "Health checks failed."
    log_info "Dumping logs for failed services..."
    $COMPOSE_CMD -f "$COMPOSE_FILE" logs --tail=50
    exit 1
}

# 4. Migrations
log_info "Running database migrations..."
if [ -f scripts/run-migrations.sh ]; then
    # Ensure env vars are loaded for migration script
    set -a
    source "$ENV_FILE"
    set +a
    ./scripts/run-migrations.sh || {
        log_error "Migrations failed."
        exit 1
    }
else
    log_info "No migration script found (scripts/run-migrations.sh), skipping."
fi

log_success "Deployment Complete!"
echo ""
echo "  - API:      http://localhost:4000/graphql"
echo "  - Client:   http://localhost:3000"
echo "  - Metrics:  http://localhost:4000/metrics"
echo "  - Grafana:  http://localhost:3001"
echo ""
