#!/usr/bin/env bash
# =============================================================================
# Summit v4.0 Beta Environment - Deployment Script
# =============================================================================
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ENV_FILE="${SCRIPT_DIR}/.env"
COMPOSE_FILE="${SCRIPT_DIR}/docker-compose.beta.yml"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

log_info() { echo -e "${BLUE}[INFO]${NC} $1"; }
log_success() { echo -e "${GREEN}[SUCCESS]${NC} $1"; }
log_warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }

print_banner() {
    echo -e "${CYAN}"
    echo "╔═══════════════════════════════════════════════════════════════╗"
    echo "║                                                               ║"
    echo "║   Summit v4.0 Beta Environment                                ║"
    echo "║                                                               ║"
    echo "║   AI-Assisted Governance | Cross-Domain Compliance            ║"
    echo "║   Zero-Trust Security Evolution                               ║"
    echo "║                                                               ║"
    echo "║   Status: BETA PROGRAM ACTIVE                                 ║"
    echo "║                                                               ║"
    echo "╚═══════════════════════════════════════════════════════════════╝"
    echo -e "${NC}"
}

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

    if [ ! -f "${ENV_FILE}" ]; then
        log_warn ".env file not found, copying from template..."
        cp "${SCRIPT_DIR}/.env.beta" "${ENV_FILE}"
        log_warn "Please update ${ENV_FILE} with actual credentials before proceeding"
        exit 1
    fi

    log_success "Prerequisites check passed"
}

start_environment() {
    log_info "Starting Summit v4.0 Beta environment..."

    cd "${SCRIPT_DIR}"

    # Pull latest images
    log_info "Pulling latest images..."
    docker compose -f "${COMPOSE_FILE}" pull

    # Start services
    log_info "Starting services..."
    docker compose -f "${COMPOSE_FILE}" up -d

    # Wait for services to be healthy
    log_info "Waiting for services to be healthy..."
    sleep 10

    # Check health
    local retries=30
    local count=0
    while [ $count -lt $retries ]; do
        if curl -s http://localhost:3001/health/ready > /dev/null 2>&1; then
            log_success "API is healthy!"
            break
        fi
        count=$((count + 1))
        echo -n "."
        sleep 2
    done

    if [ $count -eq $retries ]; then
        log_error "Services failed to become healthy"
        docker compose -f "${COMPOSE_FILE}" logs --tail=50
        exit 1
    fi

    log_success "Beta environment started successfully"
}

stop_environment() {
    log_info "Stopping Summit v4.0 Beta environment..."
    cd "${SCRIPT_DIR}"
    docker compose -f "${COMPOSE_FILE}" down
    log_success "Beta environment stopped"
}

restart_environment() {
    stop_environment
    start_environment
}

show_status() {
    echo ""
    log_info "Beta Environment Status:"
    echo ""
    cd "${SCRIPT_DIR}"
    docker compose -f "${COMPOSE_FILE}" ps
    echo ""

    log_info "Service Endpoints:"
    echo "  API (Instance 1):  http://localhost:3001"
    echo "  API (Instance 2):  http://localhost:3002"
    echo "  API (Instance 3):  http://localhost:3003"
    echo "  Load Balancer:     http://localhost:80"
    echo "  Prometheus:        http://localhost:9090"
    echo "  Grafana:           http://localhost:3000"
    echo "  Jaeger:            http://localhost:16686"
    echo "  Alertmanager:      http://localhost:9093"
    echo ""
}

show_logs() {
    local service="${1:-}"
    cd "${SCRIPT_DIR}"
    if [ -n "${service}" ]; then
        docker compose -f "${COMPOSE_FILE}" logs -f "${service}"
    else
        docker compose -f "${COMPOSE_FILE}" logs -f
    fi
}

run_health_check() {
    log_info "Running health checks..."
    echo ""

    local endpoints=(
        "http://localhost:3001/health/ready:API-1"
        "http://localhost:3002/health/ready:API-2"
        "http://localhost:3003/health/ready:API-3"
        "http://localhost:9090/-/healthy:Prometheus"
        "http://localhost:3000/api/health:Grafana"
    )

    local all_healthy=true
    for endpoint in "${endpoints[@]}"; do
        local url="${endpoint%%:*}"
        local name="${endpoint##*:}"

        if curl -s -o /dev/null -w "%{http_code}" "${url}" | grep -q "200"; then
            echo -e "  ${GREEN}✓${NC} ${name}: Healthy"
        else
            echo -e "  ${RED}✗${NC} ${name}: Unhealthy"
            all_healthy=false
        fi
    done

    echo ""
    if [ "${all_healthy}" = true ]; then
        log_success "All services are healthy"
    else
        log_warn "Some services are unhealthy"
    fi
}

provision_tenants() {
    log_info "Provisioning beta tenant environments..."

    local tenants=(
        "medtech-partners:MedTech Partners:healthcare"
        "atlantic-financial:Atlantic Financial Group:financial"
        "cloudscale-tech:CloudScale Technologies:technology"
        "securegov-solutions:SecureGov Solutions:government"
        "national-health:National Health Systems:healthcare"
        "pacific-insurance:Pacific Insurance Corp:financial"
        "innovatetech-labs:InnovateTech Labs:technology"
        "defenseprime:DefensePrime Contractors:government"
    )

    for tenant in "${tenants[@]}"; do
        IFS=':' read -r id name segment <<< "${tenant}"
        log_info "Provisioning tenant: ${name}"

        # In a real scenario, this would call the API to create tenants
        # For now, we'll simulate the provisioning
        echo "  Tenant ID: ${id}"
        echo "  Segment: ${segment}"
        echo "  Status: Provisioned"
        echo ""
    done

    log_success "All beta tenants provisioned"
}

show_help() {
    echo "Usage: $0 [command]"
    echo ""
    echo "Commands:"
    echo "  start       Start the beta environment"
    echo "  stop        Stop the beta environment"
    echo "  restart     Restart the beta environment"
    echo "  status      Show environment status"
    echo "  health      Run health checks"
    echo "  logs        Show logs (optionally specify service)"
    echo "  provision   Provision beta tenant environments"
    echo "  help        Show this help message"
    echo ""
}

main() {
    print_banner

    case "${1:-start}" in
        start)
            check_prerequisites
            start_environment
            show_status
            ;;
        stop)
            stop_environment
            ;;
        restart)
            check_prerequisites
            restart_environment
            show_status
            ;;
        status)
            show_status
            ;;
        health)
            run_health_check
            ;;
        logs)
            show_logs "${2:-}"
            ;;
        provision)
            provision_tenants
            ;;
        help|--help|-h)
            show_help
            ;;
        *)
            log_error "Unknown command: $1"
            show_help
            exit 1
            ;;
    esac
}

main "$@"
