#!/bin/bash
# demo-down.sh - Graceful shutdown of Summit Platform demo environment
# Usage: ./scripts/demo-down.sh

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

cd "$PROJECT_ROOT"

log_info "Stopping Summit Platform Demo Environment..."

# Stop docker-compose services
if [ -f "docker-compose.dev.yml" ]; then
    docker-compose -f docker-compose.dev.yml down
elif [ -f "docker-compose.yml" ]; then
    docker-compose down
else
    log_warn "No docker-compose file found. Attempting to stop any running containers..."
    docker ps -q --filter "name=summit" | xargs -r docker stop
fi

# Optionally remove volumes (ask user)
if [ "$1" = "--clean" ] || [ "$1" = "-c" ]; then
    log_warn "Removing volumes and cleaning up..."
    if [ -f "docker-compose.dev.yml" ]; then
        docker-compose -f docker-compose.dev.yml down -v --remove-orphans
    elif [ -f "docker-compose.yml" ]; then
        docker-compose down -v --remove-orphans
    fi
    log_success "Volumes removed."
fi

log_success "Demo environment stopped successfully!"
echo ""
log_info "To restart: make demo or DEMO_MODE=1 ./scripts/demo-up.sh"
