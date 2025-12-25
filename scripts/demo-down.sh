#!/bin/bash

# Demo Down Script for Summit Platform
# Safely stops and cleans up the demo environment

set -euo pipefail

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
COMPOSE_FILE="$PROJECT_ROOT/docker-compose.yml"

# Print info message
info_msg() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

# Print success message
success_msg() {
    echo -e "${GREEN}✅ $1${NC}"
}

# Print warning message
warning_msg() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

# Print error message
error_msg() {
    echo -e "${RED}❌ $1${NC}"
}

# Check if running in demo mode
check_demo_mode() {
    if [[ -z "${DEMO_MODE:-}" ]]; then
        error_msg "DEMO_MODE environment variable must be set to 1 to run this script.
        
This is a safety measure to prevent accidental execution in production.
To run: DEMO_MODE=1 ./scripts/demo-down.sh"
        exit 1
    fi

    if [[ "$DEMO_MODE" != "1" ]]; then
        error_msg "DEMO_MODE must be set to 1 to run this script.
        
This is a safety measure to prevent accidental execution in production.
To run: DEMO_MODE=1 ./scripts/demo-down.sh"
        exit 1
    fi

    if [[ "${NODE_ENV:-}" == "production" ]]; then
        error_msg "NODE_ENV is set to 'production'. This script cannot run in production environment.
        
This is a safety measure to prevent accidental execution in production.
To run: NODE_ENV=development DEMO_MODE=1 ./scripts/demo-down.sh"
        exit 1
    fi

    success_msg "Demo mode enabled and safety checks passed"
}

# Stop services
stop_services() {
    info_msg "Stopping demo services..."

    if [[ -f "$COMPOSE_FILE" ]]; then
        cd "$PROJECT_ROOT"
        if docker compose -f "$COMPOSE_FILE" down; then
            success_msg "Demo services stopped successfully"
        else
            error_msg "Failed to stop demo services"
            exit 1
        fi
    else
        error_msg "Docker Compose file not found: $COMPOSE_FILE"
        exit 1
    fi
}

# Cleanup volumes (optional)
cleanup_volumes() {
    local cleanup_volumes=${CLEANUP_VOLUMES:-false}
    
    if [[ "$cleanup_volumes" == "true" ]] || [[ "$1" == "--cleanup-volumes" ]]; then
        info_msg "Removing demo volumes (data will be lost)..."
        
        if [[ -f "$COMPOSE_FILE" ]]; then
            cd "$PROJECT_ROOT"
            if docker compose -f "$COMPOSE_FILE" down -v; then
                success_msg "Demo volumes removed successfully"
            else
                error_msg "Failed to remove demo volumes"
                # Don't exit on volume cleanup failure as it's optional
            fi
        else
            error_msg "Docker Compose file not found: $COMPOSE_FILE"
        fi
    else
        info_msg "Preserving volumes (use --cleanup-volumes to remove data)"
    fi
}

# Cleanup function for Ctrl+C
cleanup_handler() {
    echo ""
    warning_msg "Interrupt received. Stopping services gracefully..."
    stop_services || true
    exit 130
}

# Print demo stop info
print_demo_stop_info() {
    echo ""
    echo -e "${GREEN}🎉 Demo environment stopped successfully!${NC}"
    echo ""
    echo "🔧 To restart the demo: make demo"
    echo "📊 To check status: docker compose -f $COMPOSE_FILE ps"
    echo ""
}

# Main execution function
main() {
    echo -e "${BLUE}🛑 Summit Platform Demo Down${NC}"
    echo -e "${BLUE}============================${NC}"
    echo ""

    # Check demo mode
    check_demo_mode

    # Set up cleanup handler for Ctrl+C
    trap cleanup_handler INT TERM

    # Stop services
    stop_services

    # Handle cleanup options
    for arg in "$@"; do
        case $arg in
            --cleanup-volumes)
                cleanup_volumes --cleanup-volumes
                ;;
            *)
                echo "Unknown option: $arg"
                echo "Usage: DEMO_MODE=1 ./scripts/demo-down.sh [--cleanup-volumes]"
                exit 1
                ;;
        esac
    done

    # Print stop info
    print_demo_stop_info
}

# Run main function with all arguments
main "$@"