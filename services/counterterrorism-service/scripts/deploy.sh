#!/bin/bash

# Counterterrorism Service Deployment Script
# Usage: ./deploy.sh [environment]

set -euo pipefail

ENVIRONMENT=${1:-development}
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

echo "========================================="
echo "Counterterrorism Service Deployment"
echo "Environment: $ENVIRONMENT"
echo "========================================="

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Logging functions
log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
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

    if ! command -v docker-compose &> /dev/null; then
        log_error "Docker Compose is not installed"
        exit 1
    fi

    log_info "Prerequisites check passed"
}

# Build services
build_services() {
    log_info "Building services..."

    cd "$PROJECT_ROOT"

    # Build TypeScript
    log_info "Building TypeScript..."
    npm run build

    # Build Docker images
    log_info "Building Docker images..."
    docker-compose build

    log_info "Services built successfully"
}

# Run tests
run_tests() {
    log_info "Running tests..."

    cd "$PROJECT_ROOT"

    if [ "$ENVIRONMENT" != "production" ]; then
        npm test || {
            log_warn "Tests failed, but continuing deployment for $ENVIRONMENT"
        }
    else
        npm test || {
            log_error "Tests failed, aborting production deployment"
            exit 1
        }
    fi

    log_info "Tests completed"
}

# Deploy services
deploy_services() {
    log_info "Deploying services..."

    cd "$PROJECT_ROOT"

    case $ENVIRONMENT in
        development)
            log_info "Starting development environment..."
            docker-compose up -d
            ;;
        staging)
            log_info "Deploying to staging..."
            docker-compose -f docker-compose.yml -f docker-compose.staging.yml up -d
            ;;
        production)
            log_info "Deploying to production..."
            # Use Kubernetes for production
            if command -v kubectl &> /dev/null; then
                kubectl apply -f k8s/
            else
                log_warn "kubectl not found, using docker-compose"
                docker-compose -f docker-compose.yml -f docker-compose.prod.yml up -d
            fi
            ;;
        *)
            log_error "Unknown environment: $ENVIRONMENT"
            exit 1
            ;;
    esac

    log_info "Services deployed successfully"
}

# Health check
health_check() {
    log_info "Performing health check..."

    local max_attempts=30
    local attempt=1

    while [ $attempt -le $max_attempts ]; do
        if curl -f http://localhost:3020/health &> /dev/null; then
            log_info "Counterterrorism service is healthy"
            break
        fi

        if [ $attempt -eq $max_attempts ]; then
            log_error "Health check failed after $max_attempts attempts"
            return 1
        fi

        log_info "Waiting for service to be ready... (attempt $attempt/$max_attempts)"
        sleep 5
        ((attempt++))
    done

    # Check threat assessment service
    attempt=1
    while [ $attempt -le $max_attempts ]; do
        if curl -f http://localhost:3021/health &> /dev/null; then
            log_info "Threat assessment service is healthy"
            break
        fi

        if [ $attempt -eq $max_attempts ]; then
            log_error "Health check failed after $max_attempts attempts"
            return 1
        fi

        log_info "Waiting for service to be ready... (attempt $attempt/$max_attempts)"
        sleep 5
        ((attempt++))
    done

    log_info "All services are healthy"
}

# Show status
show_status() {
    log_info "Service status:"
    docker-compose ps
}

# Main deployment flow
main() {
    log_info "Starting deployment process..."

    check_prerequisites
    build_services
    run_tests
    deploy_services
    health_check
    show_status

    echo ""
    log_info "========================================="
    log_info "Deployment completed successfully!"
    log_info "========================================="
    echo ""
    log_info "Services:"
    log_info "  - Counterterrorism Service: http://localhost:3020"
    log_info "  - Threat Assessment Service: http://localhost:3021"
    log_info "  - Grafana Dashboard: http://localhost:3000"
    log_info "  - Prometheus: http://localhost:9090"
    echo ""
    log_info "To view logs: docker-compose logs -f"
    log_info "To stop services: docker-compose down"
}

# Run main function
main "$@"
