#!/usr/bin/env bash

set -euo pipefail

# IntelGraph Platform - Teardown Script
# Implements clean shutdown of the environment.

# Colors
BLUE='\033[0;34m'
GREEN='\033[0;32m'
NC='\033[0m'

log_info() { echo -e "${BLUE}ℹ️  $1${NC}"; }
log_success() { echo -e "${GREEN}✅ $1${NC}"; }

# Configuration
COMPOSE_FILE="docker-compose.dev.yml"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(dirname "$SCRIPT_DIR")"

cd "$ROOT_DIR"

if [ -f "$COMPOSE_FILE" ]; then
    log_info "Stopping services..."

    # Determine Docker Compose command
    if command -v docker-compose >/dev/null 2>&1; then
        COMPOSE_CMD="docker-compose"
    else
        COMPOSE_CMD="docker compose"
    fi

    $COMPOSE_CMD -f "$COMPOSE_FILE" down --remove-orphans
    log_success "Environment stopped."
else
    log_info "No compose file found ($COMPOSE_FILE), nothing to stop."
fi
