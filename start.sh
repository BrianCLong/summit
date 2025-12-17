#!/bin/bash

# IntelGraph Platform - Development Environment Startup Script
# Based on conductor summary requirements for Sprint 0 baseline

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$SCRIPT_DIR"
COMPOSE_FILE="deploy/compose/docker-compose.dev.yml"

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging functions
log_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

log_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

log_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

log_error() {
    echo -e "${RED}❌ $1${NC}"
}

# Check prerequisites
check_prerequisites() {
    log_info "Running environment validator..."
    if ! "$SCRIPT_DIR/validate-env.sh"; then
        log_error "Environment validation failed. Please address the issues above."
        exit 1
    fi
    log_success "Environment validation passed."

    log_info "Checking prerequisites..."

    # Check Docker and Docker Compose
    if ! command -v docker &> /dev/null; then
        log_error "Docker is not installed. Please install Docker Desktop."
        exit 1
    fi

    if ! command -v docker-compose &> /dev/null && ! docker compose version &> /dev/null; then
        log_error "Docker Compose is not available. Please install Docker Compose."
        exit 1
    fi

    # Check Node.js version
    if command -v node &> /dev/null; then
        NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
        if [ "$NODE_VERSION" -lt 20 ]; then
            log_warning "Node.js version is $NODE_VERSION. Recommended: Node.js 20.11.x"
        else
            log_success "Node.js version $(node -v) detected"
        fi
    else
        log_warning "Node.js not found. This is optional for Docker-only development."
    fi

    # Check available disk space (minimum 10GB)
    if command -v df &> /dev/null; then
        AVAILABLE_SPACE=$(df -BG . | awk 'NR==2 {print $4}' | sed 's/G//')
        if [ "$AVAILABLE_SPACE" -lt 10 ]; then
            log_warning "Low disk space: ${AVAILABLE_SPACE}GB available. Minimum 10GB recommended."
        fi
    fi

    log_success "Prerequisites check completed"
}

# Create necessary directories and files
setup_directories() {
    log_info "Setting up directory structure..."

    cd "$PROJECT_ROOT"

    # Create missing directories
    mkdir -p deploy/compose/{policies,grafana/{dashboards,datasources},keys}
    mkdir -p workers/ingest/src
    mkdir -p tests/{integration,k6}
    mkdir -p .artifacts

    # Create dummy cosign key for development
    if [ ! -f "deploy/compose/keys/cosign-public.key" ]; then
        echo "-----BEGIN PUBLIC KEY-----
MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEA1234567890abcdef...
-----END PUBLIC KEY-----" > deploy/compose/keys/cosign-public.key
    fi

    log_success "Directory structure created"
}

# Initialize database schemas
init_database_schemas() {
    log_info "Creating database initialization scripts..."

    mkdir -p deploy/compose/init-db

    cat > deploy/compose/init-db/01-init-schemas.sql << 'EOF'
-- IntelGraph Platform Database Schema
-- Sprint 0 Baseline Schema

-- Create staging table for ingested entities
CREATE TABLE IF NOT EXISTS staging_entities (
    id TEXT PRIMARY KEY,
    type TEXT NOT NULL,
    name TEXT,
    attributes JSONB DEFAULT '{}'::jsonb,
    pii_flags JSONB DEFAULT '{}'::jsonb,
    source_id TEXT NOT NULL,
    provenance JSONB,
    retention_tier TEXT DEFAULT 'standard-365d',
    purpose TEXT DEFAULT 'investigation',
    region TEXT DEFAULT 'US',
    collected_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS ix_staging_entities_type ON staging_entities(type);
CREATE INDEX IF NOT EXISTS ix_staging_entities_source ON staging_entities(source_id);
CREATE INDEX IF NOT EXISTS ix_staging_entities_purpose ON staging_entities(purpose);
CREATE INDEX IF NOT EXISTS ix_staging_entities_region ON staging_entities(region);
CREATE INDEX IF NOT EXISTS ix_staging_entities_gin ON staging_entities USING GIN (attributes);
CREATE INDEX IF NOT EXISTS ix_staging_entities_created ON staging_entities(created_at);

-- Create provenance ledger table
CREATE TABLE IF NOT EXISTS provenance_ledger (
    id SERIAL PRIMARY KEY,
    subject_id TEXT NOT NULL,
    activity TEXT NOT NULL,
    actor TEXT NOT NULL,
    hash TEXT NOT NULL,
    timestamp TIMESTAMPTZ DEFAULT NOW(),
    attestation JSONB
);

CREATE INDEX IF NOT EXISTS ix_provenance_subject ON provenance_ledger(subject_id);
CREATE INDEX IF NOT EXISTS ix_provenance_timestamp ON provenance_ledger(timestamp);

-- Grant permissions
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO intelgraph;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO intelgraph;

-- Insert sample data for development
INSERT INTO staging_entities (id, type, name, attributes, source_id, purpose) VALUES
('demo:entity-001', 'indicator', 'suspicious-domain.com', '{"indicator_type": "domain", "confidence": 0.85}', 's3:demo-entities', 'threat-intel'),
('demo:entity-002', 'entity', 'Organization Alpha', '{"org_type": "corporate", "sector": "technology"}', 's3:demo-entities', 'investigation'),
('demo:entity-003', 'indicator', '192.168.1.100', '{"indicator_type": "ip", "confidence": 0.72}', 'http:threat-intel-feed', 'threat-intel'),
('demo:entity-004', 'entity', 'Project Beta', '{"project_type": "research", "classification": "internal"}', 's3:demo-entities', 'investigation'),
('demo:entity-005', 'insight', 'Anomalous Activity Pattern', '{"insight_type": "behavioral", "score": 0.91}', 'http:topicality-insights', 'enrichment')
ON CONFLICT (id) DO NOTHING;
EOF

    log_success "Database schema initialized"
}

# Setup Grafana dashboards and datasources
setup_grafana() {
    log_info "Setting up Grafana configuration..."

    # Datasources configuration
    cat > deploy/compose/grafana/datasources/prometheus.yml << 'EOF'
apiVersion: 1

datasources:
  - name: Prometheus
    type: prometheus
    access: proxy
    url: http://prometheus:9090
    isDefault: true
    editable: true

  - name: Jaeger
    type: jaeger
    access: proxy
    url: http://jaeger:16686
    editable: true
EOF

    # Basic dashboard for IntelGraph metrics
    cat > deploy/compose/grafana/dashboards/intelgraph-overview.json << 'EOF'
{
  "dashboard": {
    "title": "IntelGraph Platform Overview",
    "tags": ["intelgraph", "sprint-0"],
    "time": {
      "from": "now-1h",
      "to": "now"
    },
    "panels": [
      {
        "title": "API Response Times",
        "type": "stat",
        "targets": [
          {
            "expr": "histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m]))",
            "legendFormat": "p95 Response Time"
          }
        ]
      },
      {
        "title": "Ingestion Rate",
        "type": "stat",
        "targets": [
          {
            "expr": "rate(intelgraph_entities_ingested_total[5m])",
            "legendFormat": "Entities/sec"
          }
        ]
      }
    ]
  }
}
EOF

    log_success "Grafana configuration created"
}

# Start the development environment
start_environment() {
    log_info "Starting IntelGraph development environment..."

    cd "$PROJECT_ROOT"

    # Pull the latest images
    log_info "Pulling Docker images..."
    docker compose -f "$COMPOSE_FILE" pull --ignore-pull-failures

    # Start the services
    log_info "Starting services..."
    docker compose -f "$COMPOSE_FILE" up -d

    # Wait for services to be healthy
    log_info "Waiting for services to be ready..."

    local services=("postgres" "neo4j" "redis" "vault" "opa")
    local max_attempts=60
    local attempt=1

    for service in "${services[@]}"; do
        log_info "Waiting for $service..."
        while [ $attempt -le $max_attempts ]; do
            if docker compose -f "$COMPOSE_FILE" ps --services --filter "status=running" | grep -q "$service"; then
                if docker compose -f "$COMPOSE_FILE" exec -T "$service" echo "health check" &>/dev/null 2>&1 || \
                   docker compose -f "$COMPOSE_FILE" ps "$service" --format "table {{.Status}}" | grep -q "healthy\|Up"; then
                    log_success "$service is ready"
                    break
                fi
            fi

            if [ $attempt -eq $max_attempts ]; then
                log_warning "$service is not ready after $max_attempts attempts"
                break
            fi

            sleep 2
            ((attempt++))
        done
        attempt=1
    done

    log_success "Core services are running"
}

# Display access information
show_access_info() {
    log_success "🌐 IntelGraph Platform Development Environment Started!"
    echo
    echo "📊 Access Points:"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "  🌐 Web Client:          http://localhost:3000"
    echo "  🔗 GraphQL Gateway:     http://localhost:4001/graphql"
    echo "  🔧 Core API Server:     http://localhost:4000"
    echo "  🗃️  Neo4j Browser:       http://localhost:7474 (neo4j/intelgraph-dev-secret)"
    echo "  📈 Grafana Dashboards:  http://localhost:3001 (admin/admin)"
    echo "  🔍 Jaeger Tracing:      http://localhost:16686"
    echo "  📊 Prometheus Metrics:  http://localhost:9090"
    echo "  🪣 MinIO Console:       http://localhost:9001 (minioadmin/minioadmin)"
    echo "  🔐 Vault UI:            http://localhost:8200 (token: intelgraph-dev-root-token)"
    echo "  ⚖️  OPA Policy Engine:   http://localhost:8181"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo
    echo "🎯 Sprint 0 E2E Slice Ready: batch_ingest_graph_query_ui"
    echo
    echo "📚 Quick Commands:"
    echo "  • View logs:           docker compose -f $COMPOSE_FILE logs -f [service]"
    echo "  • Run k6 tests:        k6 run tests/k6/api-performance.js"
    echo "  • Generate evidence:   node scripts/generate-evidence-bundle.js"
    echo "  • Stop environment:    docker compose -f $COMPOSE_FILE down"
    echo
    echo "🔍 Health Check:"
    echo "  curl http://localhost:4001/graphql -d '{\"query\":\"{health{status timestamp version}}\"}' -H 'Content-Type: application/json'"
    echo
}

# Cleanup function
cleanup_environment() {
    log_info "Stopping IntelGraph development environment..."
    cd "$PROJECT_ROOT"
    docker compose -f "$COMPOSE_FILE" down -v
    log_success "Environment stopped and cleaned up"
}

# Main execution
main() {
    echo "🚀 IntelGraph Platform - Development Environment Setup"
    echo "═══════════════════════════════════════════════════════"
    echo

    case "${1:-start}" in
        "start")
            check_prerequisites
            setup_directories
            init_database_schemas
            setup_grafana
            start_environment
            show_access_info
            ;;
        "stop")
            cleanup_environment
            ;;
        "restart")
            cleanup_environment
            sleep 3
            main start
            ;;
        "logs")
            cd "$PROJECT_ROOT"
            docker compose -f "$COMPOSE_FILE" logs -f "${2:-}"
            ;;
        "status")
            cd "$PROJECT_ROOT"
            docker compose -f "$COMPOSE_FILE" ps
            ;;
        *)
            echo "Usage: $0 {start|stop|restart|logs [service]|status}"
            echo
            echo "Commands:"
            echo "  start    - Start the development environment (default)"
            echo "  stop     - Stop and clean up the environment"
            echo "  restart  - Stop and start the environment"
            echo "  logs     - Show logs for all services or a specific service"
            echo "  status   - Show status of all services"
            exit 1
            ;;
    esac
}

# Handle Ctrl+C gracefully
trap cleanup_environment INT

# Run main function
main "$@"