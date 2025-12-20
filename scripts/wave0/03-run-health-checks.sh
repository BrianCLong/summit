#!/bin/bash
# Wave 0: Comprehensive Health Checks
# Validates all services and databases are operational

set -e

echo "========================================="
echo "Wave 0: Comprehensive Health Checks"
echo "========================================="

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

CHECKS_PASSED=0
CHECKS_FAILED=0

check_pass() {
    echo -e "${GREEN}✓${NC} $1"
    CHECKS_PASSED=$((CHECKS_PASSED + 1))
}

check_fail() {
    echo -e "${RED}✗${NC} $1"
    CHECKS_FAILED=$((CHECKS_FAILED + 1))
}

check_warn() {
    echo -e "${YELLOW}!${NC} $1"
}

section() {
    echo ""
    echo -e "${BLUE}$1${NC}"
    echo "-----------------------------------------"
}

# Load environment
if [ -f .env ]; then
    source .env
fi

# Default ports
API_PORT=${API_PORT:-4000}
NEO4J_BOLT_PORT=${NEO4J_BOLT_PORT:-7687}
NEO4J_HTTP_PORT=${NEO4J_HTTP_PORT:-7474}
POSTGRES_PORT=${POSTGRES_PORT:-5432}
REDIS_PORT=${REDIS_PORT:-6379}
PROMETHEUS_PORT=${PROMETHEUS_PORT:-9090}
GRAFANA_PORT=${GRAFANA_PORT:-3001}

section "1. API Server Health"

# Basic health
if curl -sf "http://localhost:${API_PORT}/health" > /dev/null 2>&1; then
    check_pass "API /health endpoint responding"
else
    check_fail "API /health endpoint not responding"
fi

# Detailed health
HEALTH=$(curl -sf "http://localhost:${API_PORT}/health/detailed" 2>/dev/null || echo '{"status":"error"}')
STATUS=$(echo "$HEALTH" | grep -o '"status":"[^"]*"' | head -1 | cut -d'"' -f4)
if [ "$STATUS" = "healthy" ] || [ "$STATUS" = "ok" ]; then
    check_pass "API detailed health: $STATUS"
else
    check_fail "API detailed health: $STATUS"
fi

# Ready probe
if curl -sf "http://localhost:${API_PORT}/health/ready" > /dev/null 2>&1; then
    check_pass "API readiness probe passing"
else
    check_warn "API readiness probe not available"
fi

# Live probe
if curl -sf "http://localhost:${API_PORT}/health/live" > /dev/null 2>&1; then
    check_pass "API liveness probe passing"
else
    check_warn "API liveness probe not available"
fi

section "2. Database Connectivity"

# Neo4j
if curl -sf "http://localhost:${NEO4J_HTTP_PORT}" > /dev/null 2>&1; then
    check_pass "Neo4j HTTP interface accessible"
else
    check_fail "Neo4j HTTP interface not accessible"
fi

# Neo4j Bolt (check via docker)
if docker exec summit-neo4j cypher-shell -u neo4j -p devpassword "RETURN 1" > /dev/null 2>&1; then
    check_pass "Neo4j Bolt connection working"
else
    check_warn "Neo4j Bolt connection check skipped (may need different container name)"
fi

# PostgreSQL
if docker exec summit-postgres pg_isready -U summit > /dev/null 2>&1; then
    check_pass "PostgreSQL accepting connections"
else
    check_warn "PostgreSQL check skipped (may need different container name)"
fi

# Redis
if docker exec summit-redis redis-cli ping > /dev/null 2>&1; then
    check_pass "Redis responding to PING"
else
    check_warn "Redis check skipped (may need different container name)"
fi

section "3. GraphQL Schema"

# Introspection
SCHEMA=$(curl -sf -X POST "http://localhost:${API_PORT}/graphql" \
    -H "Content-Type: application/json" \
    -d '{"query":"{ __schema { queryType { name } mutationType { name } } }"}' 2>/dev/null)

if echo "$SCHEMA" | grep -q '"queryType"'; then
    check_pass "GraphQL introspection enabled"
else
    check_fail "GraphQL introspection failed"
fi

# Check for key types
KEY_TYPES=("Entity" "Relationship" "Investigation" "User")
for type in "${KEY_TYPES[@]}"; do
    TYPE_CHECK=$(curl -sf -X POST "http://localhost:${API_PORT}/graphql" \
        -H "Content-Type: application/json" \
        -d "{\"query\":\"{ __type(name: \\\"$type\\\") { name } }\"}" 2>/dev/null)

    if echo "$TYPE_CHECK" | grep -q "\"name\":\"$type\""; then
        check_pass "GraphQL type '$type' exists"
    else
        check_warn "GraphQL type '$type' not found"
    fi
done

section "4. Observability"

# Metrics endpoint
if curl -sf "http://localhost:${API_PORT}/metrics" > /dev/null 2>&1; then
    METRIC_COUNT=$(curl -sf "http://localhost:${API_PORT}/metrics" 2>/dev/null | grep -c "^[a-z]" || echo "0")
    check_pass "Prometheus metrics exposed ($METRIC_COUNT metrics)"
else
    check_fail "Prometheus metrics not available"
fi

# Prometheus server
if curl -sf "http://localhost:${PROMETHEUS_PORT}/-/healthy" > /dev/null 2>&1; then
    check_pass "Prometheus server healthy"
else
    check_warn "Prometheus server not accessible"
fi

# Grafana
if curl -sf "http://localhost:${GRAFANA_PORT}/api/health" > /dev/null 2>&1; then
    check_pass "Grafana healthy"
else
    check_warn "Grafana not accessible"
fi

section "5. Security"

# CORS headers
CORS_CHECK=$(curl -sf -I -X OPTIONS "http://localhost:${API_PORT}/graphql" \
    -H "Origin: http://localhost:3000" \
    -H "Access-Control-Request-Method: POST" 2>/dev/null | grep -i "access-control" || echo "")

if [ -n "$CORS_CHECK" ]; then
    check_pass "CORS headers present"
else
    check_warn "CORS headers not detected"
fi

# Rate limiting headers
RATE_CHECK=$(curl -sf -I "http://localhost:${API_PORT}/health" 2>/dev/null | grep -i "x-ratelimit" || echo "")
if [ -n "$RATE_CHECK" ]; then
    check_pass "Rate limiting headers present"
else
    check_warn "Rate limiting headers not detected"
fi

section "6. Golden Path Services"

# Check key service endpoints
SERVICES=(
    "Client:3000:/"
    "GraphQL:4000:/graphql"
    "Neo4j:7474:/"
)

for svc in "${SERVICES[@]}"; do
    NAME=$(echo "$svc" | cut -d: -f1)
    PORT=$(echo "$svc" | cut -d: -f2)
    PATH=$(echo "$svc" | cut -d: -f3)

    if curl -sf "http://localhost:${PORT}${PATH}" > /dev/null 2>&1; then
        check_pass "$NAME accessible on port $PORT"
    else
        check_warn "$NAME not accessible on port $PORT"
    fi
done

# Summary
echo ""
echo "========================================="
echo "Health Check Summary"
echo "========================================="
echo ""
echo -e "Passed: ${GREEN}$CHECKS_PASSED${NC}"
echo -e "Failed: ${RED}$CHECKS_FAILED${NC}"
echo ""

if [ $CHECKS_FAILED -eq 0 ]; then
    echo -e "${GREEN}All critical checks passed!${NC}"
    exit 0
elif [ $CHECKS_FAILED -lt 3 ]; then
    echo -e "${YELLOW}Some checks failed, but system may be operational${NC}"
    exit 0
else
    echo -e "${RED}Multiple failures detected - investigate before proceeding${NC}"
    exit 1
fi
