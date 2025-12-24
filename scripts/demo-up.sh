#!/bin/bash

# Demo Up Script for Summit Platform
# One-command demo setup with health checks and seeded data
# 
# Usage:
#   DEMO_MODE=1 ./scripts/demo-up.sh
#   DEMO_MODE=1 ./scripts/demo-up.sh --check
#   DEMO_MODE=1 ./scripts/demo-up.sh --help
#
# Constraints:
# - Refuses to run if NODE_ENV=production
# - Only runs when DEMO_MODE=1 is set
# - Requires Docker and other prerequisites

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
NODE_VERSION=">=18.0.0"
REQUIRED_PORTS=("3000" "4000" "5432" "6379" "7474" "7687" "8080" "9090")

# Print help message
print_help() {
    cat << EOF
Demo Up Script for Summit Platform

This script brings up the complete demo environment with seeded data.
It verifies prerequisites, starts services, waits for health, and seeds demo data.

Usage:
  DEMO_MODE=1 ./scripts/demo-up.sh [OPTIONS]

Options:
  --check    Check prerequisites without starting services
  --help     Show this help message

Environment Variables:
  DEMO_MODE=1    Required to enable demo mode (prevents accidental production use)
  NODE_ENV       Must not be 'production' (automatically checked)

Examples:
  DEMO_MODE=1 ./scripts/demo-up.sh                    # Start demo environment
  DEMO_MODE=1 ./scripts/demo-up.sh --check            # Check prerequisites only
  NODE_ENV=development DEMO_MODE=1 ./scripts/demo-up.sh  # Explicit environment

EOF
}

# Print error message and exit
error_exit() {
    echo -e "${RED}❌ Error: $1${NC}" >&2
    exit 1
}

# Print warning message
warning_msg() {
    echo -e "${YELLOW}⚠️  Warning: $1${NC}"
}

# Print info message
info_msg() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

# Print success message
success_msg() {
    echo -e "${GREEN}✅ $1${NC}"
}

# Check if running in demo mode
check_demo_mode() {
    if [[ -z "${DEMO_MODE:-}" ]]; then
        error_exit "DEMO_MODE environment variable must be set to 1 to run this script.
        
This is a safety measure to prevent accidental execution in production.
To run: DEMO_MODE=1 ./scripts/demo-up.sh"
    fi

    if [[ "$DEMO_MODE" != "1" ]]; then
        error_exit "DEMO_MODE must be set to 1 to run this script.
        
This is a safety measure to prevent accidental execution in production.
To run: DEMO_MODE=1 ./scripts/demo-up.sh"
    fi

    if [[ "${NODE_ENV:-}" == "production" ]]; then
        error_exit "NODE_ENV is set to 'production'. This script cannot run in production environment.
        
This is a safety measure to prevent accidental execution in production.
To run: NODE_ENV=development DEMO_MODE=1 ./scripts/demo-up.sh"
    fi

    success_msg "Demo mode enabled and safety checks passed"
}

# Check prerequisites
check_prerequisites() {
    info_msg "Checking prerequisites..."

    # Check Node.js
    if ! command -v node &> /dev/null; then
        error_exit "Node.js is not installed. Please install Node.js $NODE_VERSION"
    fi

    node_version=$(node -v | sed 's/v//')
    if [[ $(printf '%s\n' "18.0.0" "$node_version" | sort -V | head -n1) != "18.0.0" ]]; then
        error_exit "Node.js version must be $NODE_VERSION. Current version: $node_version"
    fi

    # Check npm
    if ! command -v npm &> /dev/null; then
        error_exit "npm is not installed"
    fi

    # Check pnpm
    if ! command -v pnpm &> /dev/null; then
        error_exit "pnpm is not installed. Please install pnpm"
    fi

    # Check Docker
    if ! command -v docker &> /dev/null; then
        error_exit "Docker is not installed. Please install Docker Desktop or Docker Engine"
    fi

    # Check Docker Compose
    if ! docker compose version &> /dev/null; then
        error_exit "Docker Compose is not available. Please ensure Docker Desktop is running with BuildKit enabled"
    fi

    # Check if Docker daemon is running
    if ! docker info &> /dev/null; then
        error_exit "Docker daemon is not running. Please start Docker Desktop or Docker Engine"
    fi

    # Check if required ports are available
    for port in "${REQUIRED_PORTS[@]}"; do
        if command -v lsof &> /dev/null; then
            if lsof -i :"$port" &> /dev/null; then
                warning_msg "Port $port is already in use. This may cause conflicts."
            fi
        fi
    done

    # Check if compose file exists
    if [[ ! -f "$COMPOSE_FILE" ]]; then
        error_exit "Docker Compose file not found: $COMPOSE_FILE"
    fi

    success_msg "All prerequisites verified"
}

# Check if services are already running
check_existing_services() {
    info_msg "Checking for existing services..."

    running_containers=$(docker compose -f "$COMPOSE_FILE" ps -q 2>/dev/null || echo "")
    
    if [[ -n "$running_containers" ]]; then
        container_count=$(echo "$running_containers" | wc -l)
        warning_msg "Found $container_count existing container(s). This script will bring up all services."
        echo "Current running services:"
        docker compose -f "$COMPOSE_FILE" ps
        echo ""
    fi
}

# Bring up services using Docker Compose
start_services() {
    info_msg "Starting services with Docker Compose..."

    # Navigate to project root
    cd "$PROJECT_ROOT"

    # Bring up services in detached mode
    if ! docker compose -f "$COMPOSE_FILE" up -d --remove-orphans; then
        error_exit "Failed to start services with Docker Compose"
    fi

    success_msg "Services started successfully"
}

# Wait for services to be healthy
wait_for_health() {
    info_msg "Waiting for services to be healthy..."

    # Wait for PostgreSQL
    echo -n "Waiting for PostgreSQL... "
    timeout 120 bash -c 'until docker compose -f '"$COMPOSE_FILE"' exec postgres pg_isready &>/dev/null; do sleep 2; done' || {
        error_exit "PostgreSQL did not become ready within 120 seconds"
    }
    echo -e "${GREEN}✓${NC}"

    # Wait for Neo4j
    echo -n "Waiting for Neo4j... "
    timeout 180 bash -c 'until docker compose -f '"$COMPOSE_FILE"' exec neo4j cypher-shell -u neo4j -p dev_password "RETURN 1;" &>/dev/null; do sleep 5; done' || {
        error_exit "Neo4j did not become ready within 180 seconds"
    }
    echo -e "${GREEN}✓${NC}"

    # Wait for Redis
    echo -n "Waiting for Redis... "
    timeout 60 bash -c 'until docker compose -f '"$COMPOSE_FILE"' exec redis redis-cli -a dev_password ping &>/dev/null; do sleep 2; done' || {
        error_exit "Redis did not become ready within 60 seconds"
    }
    echo -e "${GREEN}✓${NC}"

    # Wait for API server to be ready
    echo -n "Waiting for API server... "
    timeout 180 bash -c 'until curl -f -s http://localhost:4000/health/ready &>/dev/null; do sleep 5; done' || {
        error_exit "API server did not become ready within 180 seconds"
    }
    echo -e "${GREEN}✓${NC}"

    # Wait for UI to be ready
    echo -n "Waiting for UI... "
    timeout 120 bash -c 'until curl -f -s http://localhost:3000 &>/dev/null; do sleep 5; done' || {
        warning_msg "UI did not become ready within 120 seconds, but continuing..."
    }
    echo -e "${GREEN}✓${NC}"

    success_msg "All services are healthy"
}

# Seed demo data
seed_demo_data() {
    info_msg "Seeding demo data..."

    # Check if demo seed script exists
    if [[ ! -f "$PROJECT_ROOT/server/scripts/seed-demo.ts" ]]; then
        error_exit "Demo seed script not found: $PROJECT_ROOT/server/scripts/seed-demo.ts"
    fi

    # Run the demo seed script
    if ! cd "$PROJECT_ROOT/server" && npx tsx scripts/seed-demo.ts; then
        error_exit "Failed to seed demo data"
    fi

    success_msg "Demo data seeded successfully"
}

# Print demo info
print_demo_info() {
    echo ""
    echo -e "${GREEN}🎉 Demo environment is ready!${NC}"
    echo ""
    echo "📊 Services:"
    echo "   - UI: http://localhost:3000"
    echo "   - API: http://localhost:4000/graphql"
    echo "   - Neo4j Browser: http://localhost:7474"
    echo "   - Adminer (PostgreSQL): http://localhost:8080"
    echo "   - Grafana: http://localhost:8080"
    echo "   - Prometheus: http://localhost:9090"
    echo ""
    echo "🔑 Default credentials:"
    echo "   - Username: demo@example.com (or as configured)"
    echo "   - Password: demo123 (or as configured)"
    echo ""
    echo "🔧 To stop the demo: docker compose -f $COMPOSE_FILE down"
    echo "🔄 To view logs: docker compose -f $COMPOSE_FILE logs -f"
    echo ""
}

# Main execution function
main() {
    # Parse command line arguments first to handle help option
    # This allows --help to work without DEMO_MODE
    for arg in "$@"; do
        case $arg in
            --help)
                print_help
                exit 0
                ;;
        esac
    done

    # Check demo mode before other operations
    # This ensures safety checks happen for all other operations
    check_demo_mode

    # Parse remaining command line arguments
    local check_only=false
    for arg in "$@"; do
        case $arg in
            --help)
                # Already handled above
                ;;
            --check)
                check_only=true
                ;;
            *)
                echo "Unknown option: $arg"
                print_help
                exit 1
                ;;
        esac
    done

    echo -e "${BLUE}🚀 Summit Platform Demo Up${NC}"
    echo -e "${BLUE}==========================${NC}"
    echo ""

    # Check prerequisites
    check_prerequisites

    # If only checking, exit here
    if [[ "$check_only" == true ]]; then
        success_msg "Prerequisites check completed successfully"
        exit 0
    fi

    # Check for existing services
    check_existing_services

    # Start services
    start_services

    # Wait for health
    wait_for_health

    # Seed demo data
    seed_demo_data

    # Print demo info
    print_demo_info
}

# Run main function with all arguments
main "$@"