#!/bin/bash
# Local Preview Environment Testing Script
# Simulates the CI preview environment locally with Docker Compose

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "${SCRIPT_DIR}")"
COMPOSE_FILE="${PROJECT_ROOT}/docker-compose.preview.yml"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

log() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')] $1${NC}"
}

warn() {
    echo -e "${YELLOW}[$(date +'%Y-%m-%d %H:%M:%S')] WARNING: $1${NC}"
}

error() {
    echo -e "${RED}[$(date +'%Y-%m-%d %H:%M:%S')] ERROR: $1${NC}"
}

info() {
    echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')] INFO: $1${NC}"
}

# Help function
show_help() {
    cat << EOF
🚀 Local Preview Environment Script

Usage: $0 [COMMAND]

Commands:
    up          Start the preview environment
    down        Stop and remove the preview environment
    build       Build container images
    test        Run smoke tests against the environment
    logs        Show logs from all services
    status      Show status of all services
    clean       Clean up everything (images, volumes, networks)
    help        Show this help message

Examples:
    $0 up                    # Start preview environment
    $0 test                  # Run smoke tests
    $0 logs --follow         # Follow logs in real-time
    $0 clean                 # Clean everything
EOF
}

# Check dependencies
check_deps() {
    log "Checking dependencies..."

    if ! command -v docker &> /dev/null; then
        error "Docker is not installed"
        exit 1
    fi

    if ! command -v docker-compose &> /dev/null && ! docker compose version &> /dev/null; then
        error "Docker Compose is not installed"
        exit 1
    fi

    info "Dependencies check passed ✅"
}

# Create Docker Compose file for preview
create_compose_file() {
    cat > "${COMPOSE_FILE}" << 'EOF'
version: '3.8'

services:
  postgres:
    image: postgres:16-alpine
    environment:
      POSTGRES_DB: intelgraph_preview
      POSTGRES_USER: preview_user
      POSTGRES_PASSWORD: preview_pass
    ports:
      - "5433:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U preview_user -d intelgraph_preview"]
      interval: 10s
      timeout: 5s
      retries: 5

  redis:
    image: redis:7-alpine
    ports:
      - "6380:6379"
    volumes:
      - redis_data:/data
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 10s
      timeout: 3s
      retries: 5

  neo4j:
    image: neo4j:5-enterprise
    environment:
      NEO4J_AUTH: neo4j/preview_pass
      NEO4J_ACCEPT_LICENSE_AGREEMENT: "yes"
      NEO4J_server_memory_heap_initial__size: 512m
      NEO4J_server_memory_heap_max__size: 1g
    ports:
      - "7688:7687"
      - "7475:7474"
    volumes:
      - neo4j_data:/data
      - neo4j_logs:/logs
    healthcheck:
      test: ["CMD", "cypher-shell", "-u", "neo4j", "-p", "preview_pass", "RETURN 1"]
      interval: 30s
      timeout: 10s
      retries: 5

  server:
    build:
      context: ./server
      dockerfile: Dockerfile
    ports:
      - "4001:4000"
    environment:
      NODE_ENV: preview
      DATABASE_URL: postgresql://preview_user:preview_pass@postgres:5432/intelgraph_preview
      REDIS_URL: redis://redis:6379
      NEO4J_URI: bolt://neo4j:7687
      NEO4J_USER: neo4j
      NEO4J_PASSWORD: preview_pass
      LOG_LEVEL: info
      CORS_ORIGINS: http://localhost:3001,http://localhost:3000
      OTEL_EXPORTER_OTLP_ENDPOINT: http://otel-collector:4317
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_healthy
      neo4j:
        condition: service_healthy
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:4000/health"]
      interval: 30s
      timeout: 10s
      retries: 5

  client:
    build:
      context: ./client
      dockerfile: Dockerfile
    ports:
      - "3001:3000"
    environment:
      REACT_APP_API_URL: http://localhost:4001
      REACT_APP_GRAPHQL_URL: http://localhost:4001/graphql
      REACT_APP_WS_URL: ws://localhost:4001/graphql
    depends_on:
      server:
        condition: service_healthy
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3000"]
      interval: 30s
      timeout: 10s
      retries: 3

volumes:
  postgres_data:
  redis_data:
  neo4j_data:
  neo4j_logs:

networks:
  default:
    name: intelgraph_preview
EOF
}

# Build images
build_images() {
    log "Building container images..."

    create_compose_file

    # Build with no cache to ensure fresh images
    docker-compose -f "${COMPOSE_FILE}" build --no-cache --parallel

    log "Images built successfully ✅"
}

# Start environment
start_env() {
    log "Starting preview environment..."

    create_compose_file

    # Start services
    docker-compose -f "${COMPOSE_FILE}" up -d

    # Wait for services to be healthy
    log "Waiting for services to be healthy..."
    docker-compose -f "${COMPOSE_FILE}" ps

    info "Preview environment started! 🚀"
    info "Services available at:"
    info "  - Client:    http://localhost:3001"
    info "  - Server:    http://localhost:4001"
    info "  - GraphQL:   http://localhost:4001/graphql"
    info "  - Health:    http://localhost:4001/health"
    info "  - Metrics:   http://localhost:4001/metrics"
    info "  - Neo4j:     http://localhost:7475 (neo4j/preview_pass)"
    info "  - Postgres:  localhost:5433 (preview_user/preview_pass)"
    info "  - Redis:     localhost:6380"
}

# Stop environment
stop_env() {
    log "Stopping preview environment..."

    if [ -f "${COMPOSE_FILE}" ]; then
        docker-compose -f "${COMPOSE_FILE}" down
        log "Environment stopped ✅"
    else
        warn "Compose file not found, environment may not be running"
    fi
}

# Run smoke tests
run_tests() {
    log "Running smoke tests..."

    # Check if services are running
    if ! docker-compose -f "${COMPOSE_FILE}" ps | grep -q "Up"; then
        error "Preview environment is not running. Start it with: $0 up"
        exit 1
    fi

    # Health checks
    info "Testing health endpoints..."
    curl -f http://localhost:4001/health --max-time 30 || { error "Health check failed"; exit 1; }
    curl -f http://localhost:4001/health/graphql --max-time 30 || { error "GraphQL health check failed"; exit 1; }

    # GraphQL query test
    info "Testing GraphQL endpoint..."
    curl -X POST http://localhost:4001/graphql \
        -H "Content-Type: application/json" \
        -d '{"query":"query Health { __typename }"}' \
        --max-time 30 || { error "GraphQL query failed"; exit 1; }

    # Client accessibility
    info "Testing client accessibility..."
    curl -f http://localhost:3001 --max-time 30 || { error "Client not accessible"; exit 1; }

    log "All smoke tests passed ✅"
}

# Show logs
show_logs() {
    if [ -f "${COMPOSE_FILE}" ]; then
        docker-compose -f "${COMPOSE_FILE}" logs "$@"
    else
        error "Compose file not found"
        exit 1
    fi
}

# Show status
show_status() {
    if [ -f "${COMPOSE_FILE}" ]; then
        docker-compose -f "${COMPOSE_FILE}" ps
        echo
        docker-compose -f "${COMPOSE_FILE}" top
    else
        error "Compose file not found"
        exit 1
    fi
}

# Clean everything
clean_all() {
    log "Cleaning up preview environment..."

    if [ -f "${COMPOSE_FILE}" ]; then
        # Stop and remove containers, networks, and volumes
        docker-compose -f "${COMPOSE_FILE}" down -v --remove-orphans

        # Remove images
        docker-compose -f "${COMPOSE_FILE}" down --rmi all

        # Remove compose file
        rm -f "${COMPOSE_FILE}"
    fi

    # Clean up orphaned resources
    docker network prune -f
    docker volume prune -f

    log "Cleanup completed ✅"
}

# Main script logic
main() {
    check_deps

    case "${1:-help}" in
        up|start)
            start_env
            ;;
        down|stop)
            stop_env
            ;;
        build)
            build_images
            ;;
        test|smoke)
            run_tests
            ;;
        logs)
            shift
            show_logs "$@"
            ;;
        status|ps)
            show_status
            ;;
        clean)
            clean_all
            ;;
        help|--help|-h)
            show_help
            ;;
        *)
            error "Unknown command: $1"
            show_help
            exit 1
            ;;
    esac
}

# Run main function with all arguments
main "$@"