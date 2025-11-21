#!/usr/bin/env bash
#
# Incident Manager CLI - Summit IntelGraph
# Reference: RUNBOOKS/incident-response-playbook.md
#
# Usage:
#   ./scripts/incident-manager.sh <command> [options]
#
# Commands:
#   status        - Show current system health status
#   check         - Run health checks on all components
#   triage        - Interactive triage for current issues
#   rollback      - Rollback to previous deployment
#   restart       - Restart specified service(s)
#   logs          - Tail logs for specified service
#   connections   - Show database connection status
#   queues        - Show background job queue status
#   incident      - Create/manage incident records
#
set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
API_URL="${API_URL:-http://localhost:4000}"
COMPOSE_FILE="${COMPOSE_FILE:-docker-compose.dev.yml}"
INCIDENT_LOG_DIR="${INCIDENT_LOG_DIR:-./incidents}"

# =============================================================================
# UTILITY FUNCTIONS
# =============================================================================

log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[OK]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

print_header() {
    echo ""
    echo -e "${BLUE}════════════════════════════════════════════════════════════════${NC}"
    echo -e "${BLUE}  $1${NC}"
    echo -e "${BLUE}════════════════════════════════════════════════════════════════${NC}"
    echo ""
}

check_command() {
    if ! command -v "$1" &> /dev/null; then
        log_error "Required command '$1' not found"
        exit 1
    fi
}

# =============================================================================
# HEALTH CHECK FUNCTIONS
# =============================================================================

check_api_health() {
    local response
    local status

    log_info "Checking API health..."

    if response=$(curl -s -w "\n%{http_code}" "${API_URL}/health/detailed" 2>/dev/null); then
        status=$(echo "$response" | tail -n 1)
        body=$(echo "$response" | sed '$d')

        if [ "$status" = "200" ]; then
            log_success "API Server: Healthy (HTTP $status)"
            echo "$body" | jq -r '.dependencies | to_entries[] | "  - \(.key): \(.value.status)"' 2>/dev/null || true
            return 0
        else
            log_error "API Server: Unhealthy (HTTP $status)"
            return 1
        fi
    else
        log_error "API Server: Unreachable"
        return 1
    fi
}

check_neo4j_health() {
    log_info "Checking Neo4j health..."

    if docker exec neo4j cypher-shell "RETURN 1" &>/dev/null; then
        log_success "Neo4j: Healthy"
        return 0
    else
        log_error "Neo4j: Unhealthy or unreachable"
        return 1
    fi
}

check_postgres_health() {
    log_info "Checking PostgreSQL health..."

    if docker exec postgres pg_isready -U postgres &>/dev/null; then
        log_success "PostgreSQL: Healthy"

        # Show connection count
        local conn_count
        conn_count=$(docker exec postgres psql -U postgres -t -c "SELECT count(*) FROM pg_stat_activity;" 2>/dev/null | tr -d ' ')
        echo "  - Active connections: ${conn_count:-unknown}"
        return 0
    else
        log_error "PostgreSQL: Unhealthy or unreachable"
        return 1
    fi
}

check_redis_health() {
    log_info "Checking Redis health..."

    if docker exec redis redis-cli ping 2>/dev/null | grep -q "PONG"; then
        log_success "Redis: Healthy"

        # Show memory usage
        local memory
        memory=$(docker exec redis redis-cli INFO memory 2>/dev/null | grep "used_memory_human" | cut -d: -f2 | tr -d '\r')
        echo "  - Memory used: ${memory:-unknown}"
        return 0
    else
        log_error "Redis: Unhealthy or unreachable"
        return 1
    fi
}

# =============================================================================
# COMMAND IMPLEMENTATIONS
# =============================================================================

cmd_status() {
    print_header "SYSTEM STATUS - $(date -u '+%Y-%m-%d %H:%M:%S UTC')"

    local exit_code=0

    # Container status
    echo "Container Status:"
    docker compose -f "$COMPOSE_FILE" ps --format "table {{.Name}}\t{{.Status}}\t{{.Ports}}" 2>/dev/null || {
        log_warn "Could not get container status"
    }
    echo ""

    # Health checks
    echo "Health Checks:"
    check_api_health || exit_code=1
    check_neo4j_health || exit_code=1
    check_postgres_health || exit_code=1
    check_redis_health || exit_code=1

    echo ""

    # Recent errors
    echo "Recent Errors (last 5 min):"
    docker compose -f "$COMPOSE_FILE" logs --since 5m 2>/dev/null | grep -i "error\|exception\|fatal" | tail -10 || echo "  No recent errors found"

    echo ""

    if [ $exit_code -eq 0 ]; then
        log_success "All systems operational"
    else
        log_error "One or more systems unhealthy - see above for details"
    fi

    return $exit_code
}

cmd_check() {
    print_header "COMPREHENSIVE HEALTH CHECK"

    local failures=0

    # API Health
    echo "1. API Server Health"
    check_api_health || ((failures++))
    echo ""

    # Database Health
    echo "2. Database Health"
    check_neo4j_health || ((failures++))
    check_postgres_health || ((failures++))
    check_redis_health || ((failures++))
    echo ""

    # Metrics endpoint
    echo "3. Metrics Endpoint"
    if curl -s "${API_URL}/metrics" &>/dev/null; then
        log_success "Metrics endpoint: Available"
    else
        log_error "Metrics endpoint: Unavailable"
        ((failures++))
    fi
    echo ""

    # Disk space
    echo "4. Disk Space"
    df -h / | tail -1 | awk '{print "  - Root filesystem: " $5 " used (" $4 " available)"}'
    echo ""

    # Memory
    echo "5. Memory Usage"
    free -h | grep Mem | awk '{print "  - Total: " $2 ", Used: " $3 ", Available: " $7}'
    echo ""

    # Docker resources
    echo "6. Container Resources"
    docker stats --no-stream --format "table {{.Name}}\t{{.CPUPerc}}\t{{.MemUsage}}" 2>/dev/null | head -10
    echo ""

    # Summary
    if [ $failures -eq 0 ]; then
        log_success "All health checks passed"
        return 0
    else
        log_error "$failures health check(s) failed"
        return 1
    fi
}

cmd_triage() {
    print_header "INCIDENT TRIAGE ASSISTANT"

    echo "Running diagnostic checks..."
    echo ""

    # Quick status
    local api_ok=true
    local db_ok=true
    local cache_ok=true

    # Check API
    if ! curl -s "${API_URL}/health" &>/dev/null; then
        api_ok=false
        log_error "API Server is DOWN"
    fi

    # Check Neo4j
    if ! docker exec neo4j cypher-shell "RETURN 1" &>/dev/null 2>&1; then
        db_ok=false
        log_error "Neo4j is DOWN"
    fi

    # Check PostgreSQL
    if ! docker exec postgres pg_isready -U postgres &>/dev/null 2>&1; then
        db_ok=false
        log_error "PostgreSQL is DOWN"
    fi

    # Check Redis
    if ! docker exec redis redis-cli ping &>/dev/null 2>&1; then
        cache_ok=false
        log_error "Redis is DOWN"
    fi

    echo ""

    # Severity assessment
    if [ "$api_ok" = false ]; then
        echo -e "${RED}═══════════════════════════════════════════════════════════════${NC}"
        echo -e "${RED}  SEVERITY: SEV-1 (CRITICAL) - API Server Down${NC}"
        echo -e "${RED}═══════════════════════════════════════════════════════════════${NC}"
        echo ""
        echo "Recommended Actions:"
        echo "  1. Check API server logs: docker compose logs intelgraph-server"
        echo "  2. Check for OOM: dmesg | grep -i 'killed process'"
        echo "  3. Restart API: docker compose restart intelgraph-server"
        echo "  4. If recent deploy, rollback: ./scripts/auto-rollback.sh"
    elif [ "$db_ok" = false ]; then
        echo -e "${RED}═══════════════════════════════════════════════════════════════${NC}"
        echo -e "${RED}  SEVERITY: SEV-1 (CRITICAL) - Database Unavailable${NC}"
        echo -e "${RED}═══════════════════════════════════════════════════════════════${NC}"
        echo ""
        echo "Recommended Actions:"
        echo "  1. Check database logs: docker compose logs neo4j postgres"
        echo "  2. Check disk space: df -h"
        echo "  3. Restart database: docker compose restart neo4j postgres"
        echo "  4. If data corruption suspected, restore from backup"
    elif [ "$cache_ok" = false ]; then
        echo -e "${YELLOW}═══════════════════════════════════════════════════════════════${NC}"
        echo -e "${YELLOW}  SEVERITY: SEV-2 (HIGH) - Cache Unavailable${NC}"
        echo -e "${YELLOW}═══════════════════════════════════════════════════════════════${NC}"
        echo ""
        echo "Recommended Actions:"
        echo "  1. Check Redis logs: docker compose logs redis"
        echo "  2. Check memory: docker exec redis redis-cli INFO memory"
        echo "  3. Restart Redis: docker compose restart redis"
    else
        echo -e "${GREEN}═══════════════════════════════════════════════════════════════${NC}"
        echo -e "${GREEN}  All Core Services Operational${NC}"
        echo -e "${GREEN}═══════════════════════════════════════════════════════════════${NC}"
        echo ""
        echo "If issues persist, check:"
        echo "  1. Application logs: docker compose logs -f --tail=100"
        echo "  2. Error rates in Grafana"
        echo "  3. Recent deployments"
    fi

    echo ""
    echo "Full playbook: RUNBOOKS/incident-response-playbook.md"
}

cmd_rollback() {
    print_header "DEPLOYMENT ROLLBACK"

    log_warn "This will rollback to the previous deployment"
    echo ""

    # Check for auto-rollback script
    if [ -f "./scripts/auto-rollback.sh" ]; then
        log_info "Using auto-rollback script..."
        ./scripts/auto-rollback.sh
    else
        # Manual rollback
        log_info "Performing manual rollback..."

        # Get previous commit
        local prev_commit
        prev_commit=$(git log --oneline -2 | tail -1 | cut -d' ' -f1)

        log_info "Rolling back to commit: $prev_commit"
        git checkout "$prev_commit"

        log_info "Rebuilding containers..."
        docker compose -f "$COMPOSE_FILE" build intelgraph-server

        log_info "Restarting services..."
        docker compose -f "$COMPOSE_FILE" up -d intelgraph-server

        log_success "Rollback complete"
    fi
}

cmd_restart() {
    local service="${1:-}"

    if [ -z "$service" ]; then
        echo "Usage: $0 restart <service>"
        echo ""
        echo "Available services:"
        docker compose -f "$COMPOSE_FILE" ps --services 2>/dev/null | sed 's/^/  - /'
        exit 1
    fi

    print_header "RESTARTING SERVICE: $service"

    log_info "Stopping $service..."
    docker compose -f "$COMPOSE_FILE" stop "$service"

    log_info "Starting $service..."
    docker compose -f "$COMPOSE_FILE" up -d "$service"

    log_info "Waiting for health check..."
    sleep 5

    if docker compose -f "$COMPOSE_FILE" ps "$service" | grep -q "Up"; then
        log_success "Service $service restarted successfully"
    else
        log_error "Service $service may not have started correctly"
        docker compose -f "$COMPOSE_FILE" logs --tail=20 "$service"
    fi
}

cmd_logs() {
    local service="${1:-}"
    local lines="${2:-100}"

    if [ -z "$service" ]; then
        log_info "Tailing logs for all services (last $lines lines)..."
        docker compose -f "$COMPOSE_FILE" logs -f --tail="$lines"
    else
        log_info "Tailing logs for $service (last $lines lines)..."
        docker compose -f "$COMPOSE_FILE" logs -f --tail="$lines" "$service"
    fi
}

cmd_connections() {
    print_header "DATABASE CONNECTIONS STATUS"

    echo "Neo4j Connections:"
    docker exec neo4j cypher-shell "CALL dbms.listConnections()" 2>/dev/null || echo "  Unable to query Neo4j connections"
    echo ""

    echo "PostgreSQL Connections:"
    docker exec postgres psql -U postgres -c "SELECT datname, usename, client_addr, state, query_start FROM pg_stat_activity WHERE datname IS NOT NULL ORDER BY query_start DESC LIMIT 20;" 2>/dev/null || echo "  Unable to query PostgreSQL connections"
    echo ""

    echo "Redis Clients:"
    docker exec redis redis-cli CLIENT LIST 2>/dev/null | head -20 || echo "  Unable to query Redis clients"
}

cmd_queues() {
    print_header "BACKGROUND JOB QUEUE STATUS"

    # Check queue depths via Redis
    echo "Queue Depths:"
    for queue in default high-priority low-priority; do
        local depth
        depth=$(docker exec redis redis-cli LLEN "bull:${queue}:wait" 2>/dev/null || echo "0")
        echo "  - ${queue}: ${depth} waiting"
    done
    echo ""

    # Check for failed jobs
    echo "Failed Jobs:"
    for queue in default high-priority low-priority; do
        local failed
        failed=$(docker exec redis redis-cli LLEN "bull:${queue}:failed" 2>/dev/null || echo "0")
        echo "  - ${queue}: ${failed} failed"
    done
    echo ""

    # Check metrics endpoint
    echo "Processing Metrics (from /metrics):"
    curl -s "${API_URL}/metrics" 2>/dev/null | grep "maestro_" | head -10 || echo "  Unable to fetch metrics"
}

cmd_incident() {
    local action="${1:-}"
    local incident_id="${2:-}"

    case "$action" in
        create)
            # Create incident record
            local timestamp
            timestamp=$(date -u '+%Y-%m-%d-%H%M')
            incident_id="INC-${timestamp}"

            mkdir -p "$INCIDENT_LOG_DIR"

            cat > "${INCIDENT_LOG_DIR}/${incident_id}.md" << EOF
# Incident: ${incident_id}

**Created**: $(date -u '+%Y-%m-%d %H:%M:%S UTC')
**Status**: INVESTIGATING
**Severity**: [SEV-1 | SEV-2 | SEV-3]

## Summary
[Brief description of the incident]

## Impact
- Users Affected:
- Functionality Affected:

## Timeline
| Time (UTC) | Event |
|------------|-------|
| $(date -u '+%H:%M') | Incident created |

## Actions Taken
1.

## Root Cause
[To be determined]

## Resolution
[To be determined]

---
Incident Commander:
Technical Lead:
EOF

            log_success "Created incident: ${incident_id}"
            echo "File: ${INCIDENT_LOG_DIR}/${incident_id}.md"
            ;;

        list)
            echo "Incident Records:"
            ls -la "$INCIDENT_LOG_DIR"/*.md 2>/dev/null || echo "  No incidents found"
            ;;

        *)
            echo "Usage: $0 incident <create|list>"
            ;;
    esac
}

cmd_help() {
    cat << EOF
Incident Manager CLI - Summit IntelGraph

Usage: $0 <command> [options]

Commands:
  status              Show current system health status
  check               Run comprehensive health checks
  triage              Interactive triage for current issues
  rollback            Rollback to previous deployment
  restart <service>   Restart specified service
  logs [service]      Tail logs (all services or specific)
  connections         Show database connection status
  queues              Show background job queue status
  incident <action>   Manage incident records (create, list)
  help                Show this help message

Examples:
  $0 status                     # Quick status check
  $0 triage                     # Interactive triage
  $0 restart intelgraph-server  # Restart API server
  $0 logs neo4j                 # Tail Neo4j logs
  $0 incident create            # Create new incident record

Environment Variables:
  API_URL         API server URL (default: http://localhost:4000)
  COMPOSE_FILE    Docker compose file (default: docker-compose.dev.yml)

Reference: RUNBOOKS/incident-response-playbook.md
EOF
}

# =============================================================================
# MAIN
# =============================================================================

main() {
    local command="${1:-help}"
    shift || true

    case "$command" in
        status)      cmd_status "$@" ;;
        check)       cmd_check "$@" ;;
        triage)      cmd_triage "$@" ;;
        rollback)    cmd_rollback "$@" ;;
        restart)     cmd_restart "$@" ;;
        logs)        cmd_logs "$@" ;;
        connections) cmd_connections "$@" ;;
        queues)      cmd_queues "$@" ;;
        incident)    cmd_incident "$@" ;;
        help|--help|-h) cmd_help ;;
        *)
            log_error "Unknown command: $command"
            cmd_help
            exit 1
            ;;
    esac
}

main "$@"
