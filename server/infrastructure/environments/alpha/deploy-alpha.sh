#!/bin/bash
#
# Summit v4.0.0 Alpha Environment Deployment Script
# ==================================================
#
# This script deploys the alpha environment for v4.0.0 testing.
#
# Usage:
#   ./deploy-alpha.sh [command]
#
# Commands:
#   start     - Start all alpha services
#   stop      - Stop all alpha services
#   restart   - Restart all alpha services
#   status    - Show service status
#   logs      - Show service logs
#   reset     - Reset database and restart
#   health    - Run health checks
#

set -e

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../../.." && pwd)"
COMPOSE_FILE="$SCRIPT_DIR/docker-compose.alpha.yml"
ENV_FILE="$SCRIPT_DIR/.env.alpha"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Helper functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check prerequisites
check_prerequisites() {
    log_info "Checking prerequisites..."

    if ! command -v docker &> /dev/null; then
        log_error "Docker is not installed"
        exit 1
    fi

    if ! command -v docker-compose &> /dev/null && ! docker compose version &> /dev/null; then
        log_error "Docker Compose is not installed"
        exit 1
    fi

    if [ ! -f "$COMPOSE_FILE" ]; then
        log_error "Docker Compose file not found: $COMPOSE_FILE"
        exit 1
    fi

    log_success "Prerequisites check passed"
}

# Start services
start_services() {
    log_info "Starting Summit v4.0.0 Alpha Environment..."

    check_prerequisites

    # Create necessary directories
    mkdir -p "$SCRIPT_DIR/prometheus/alerts"
    mkdir -p "$SCRIPT_DIR/grafana/provisioning/dashboards"
    mkdir -p "$SCRIPT_DIR/grafana/provisioning/datasources"
    mkdir -p "$SCRIPT_DIR/loki"
    mkdir -p "$SCRIPT_DIR/promtail"

    # Build and start services
    log_info "Building Summit API image..."
    docker compose -f "$COMPOSE_FILE" build

    log_info "Starting services..."
    docker compose -f "$COMPOSE_FILE" up -d

    # Wait for services to be healthy
    log_info "Waiting for services to be healthy..."
    sleep 10

    # Run health checks
    health_check

    log_success "Alpha environment started successfully!"
    print_access_info
}

# Stop services
stop_services() {
    log_info "Stopping Summit v4.0.0 Alpha Environment..."

    docker compose -f "$COMPOSE_FILE" down

    log_success "Alpha environment stopped"
}

# Restart services
restart_services() {
    log_info "Restarting Summit v4.0.0 Alpha Environment..."

    stop_services
    start_services
}

# Show status
show_status() {
    log_info "Summit v4.0.0 Alpha Environment Status"
    echo ""
    docker compose -f "$COMPOSE_FILE" ps
    echo ""

    # Show resource usage
    log_info "Resource Usage:"
    docker stats --no-stream --format "table {{.Name}}\t{{.CPUPerc}}\t{{.MemUsage}}" \
        $(docker compose -f "$COMPOSE_FILE" ps -q) 2>/dev/null || true
}

# Show logs
show_logs() {
    local service="${1:-}"

    if [ -n "$service" ]; then
        docker compose -f "$COMPOSE_FILE" logs -f "$service"
    else
        docker compose -f "$COMPOSE_FILE" logs -f
    fi
}

# Reset environment
reset_environment() {
    log_warning "This will reset all data in the alpha environment!"
    read -p "Are you sure? (y/N) " -n 1 -r
    echo

    if [[ $REPLY =~ ^[Yy]$ ]]; then
        log_info "Resetting alpha environment..."

        # Stop services
        docker compose -f "$COMPOSE_FILE" down -v

        # Remove volumes
        docker volume rm summit-alpha-data summit-alpha-postgres summit-alpha-redis 2>/dev/null || true

        # Start fresh
        start_services

        log_success "Alpha environment reset complete"
    else
        log_info "Reset cancelled"
    fi
}

# Health check
health_check() {
    log_info "Running health checks..."

    local all_healthy=true

    # Check API
    log_info "Checking Summit API..."
    if curl -sf http://localhost:3000/health > /dev/null 2>&1; then
        log_success "Summit API: Healthy"
    else
        log_error "Summit API: Unhealthy"
        all_healthy=false
    fi

    # Check Prometheus
    log_info "Checking Prometheus..."
    if curl -sf http://localhost:9091/-/healthy > /dev/null 2>&1; then
        log_success "Prometheus: Healthy"
    else
        log_warning "Prometheus: Not responding (may still be starting)"
    fi

    # Check Grafana
    log_info "Checking Grafana..."
    if curl -sf http://localhost:3001/api/health > /dev/null 2>&1; then
        log_success "Grafana: Healthy"
    else
        log_warning "Grafana: Not responding (may still be starting)"
    fi

    # Check Jaeger
    log_info "Checking Jaeger..."
    if curl -sf http://localhost:16686/ > /dev/null 2>&1; then
        log_success "Jaeger: Healthy"
    else
        log_warning "Jaeger: Not responding (may still be starting)"
    fi

    # Check database
    log_info "Checking PostgreSQL..."
    if docker compose -f "$COMPOSE_FILE" exec -T postgres pg_isready -U summit > /dev/null 2>&1; then
        log_success "PostgreSQL: Healthy"
    else
        log_error "PostgreSQL: Unhealthy"
        all_healthy=false
    fi

    # Check Redis
    log_info "Checking Redis..."
    if docker compose -f "$COMPOSE_FILE" exec -T redis redis-cli ping > /dev/null 2>&1; then
        log_success "Redis: Healthy"
    else
        log_error "Redis: Unhealthy"
        all_healthy=false
    fi

    echo ""
    if $all_healthy; then
        log_success "All core services are healthy!"
        return 0
    else
        log_error "Some services are unhealthy"
        return 1
    fi
}

# Print access information
print_access_info() {
    echo ""
    echo "=============================================="
    echo "  Summit v4.0.0 Alpha Environment"
    echo "=============================================="
    echo ""
    echo "  Services:"
    echo "  ---------"
    echo "  Summit API:    http://localhost:3000"
    echo "  Prometheus:    http://localhost:9091"
    echo "  Grafana:       http://localhost:3001"
    echo "  Jaeger:        http://localhost:16686"
    echo ""
    echo "  Grafana Credentials:"
    echo "  --------------------"
    echo "  Username: admin"
    echo "  Password: summit_alpha"
    echo ""
    echo "  API Health Check:"
    echo "  ------------------"
    echo "  curl http://localhost:3000/health"
    echo ""
    echo "  Metrics Endpoint:"
    echo "  ------------------"
    echo "  curl http://localhost:3000/metrics"
    echo ""
    echo "=============================================="
}

# Run database migrations
run_migrations() {
    log_info "Running database migrations..."

    docker compose -f "$COMPOSE_FILE" exec summit-api npm run db:migrate

    log_success "Migrations complete"
}

# Seed test data
seed_data() {
    log_info "Seeding test data..."

    docker compose -f "$COMPOSE_FILE" exec summit-api npm run db:seed:alpha

    log_success "Test data seeded"
}

# Main command handler
main() {
    local command="${1:-start}"

    case "$command" in
        start)
            start_services
            ;;
        stop)
            stop_services
            ;;
        restart)
            restart_services
            ;;
        status)
            show_status
            ;;
        logs)
            show_logs "${2:-}"
            ;;
        reset)
            reset_environment
            ;;
        health)
            health_check
            ;;
        migrate)
            run_migrations
            ;;
        seed)
            seed_data
            ;;
        info)
            print_access_info
            ;;
        *)
            echo "Summit v4.0.0 Alpha Environment"
            echo ""
            echo "Usage: $0 [command]"
            echo ""
            echo "Commands:"
            echo "  start     Start all alpha services"
            echo "  stop      Stop all alpha services"
            echo "  restart   Restart all alpha services"
            echo "  status    Show service status"
            echo "  logs      Show service logs (optionally specify service)"
            echo "  reset     Reset database and restart"
            echo "  health    Run health checks"
            echo "  migrate   Run database migrations"
            echo "  seed      Seed test data"
            echo "  info      Show access information"
            echo ""
            exit 1
            ;;
    esac
}

# Run main
main "$@"
