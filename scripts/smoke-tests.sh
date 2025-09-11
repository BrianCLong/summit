#!/bin/bash

# Maestro Conductor v24.2.0 - Smoke Tests
# Epic E10: Deployment validation

set -euo pipefail

BASE_URL="${1:-http://localhost:4000}"
TIMEOUT=30

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

log_test() {
    echo -e "${YELLOW}[TEST]${NC} $1"
}

log_pass() {
    echo -e "${GREEN}[PASS]${NC} $1"
}

log_fail() {
    echo -e "${RED}[FAIL]${NC} $1"
}

# Test counter
TESTS_RUN=0
TESTS_PASSED=0

run_test() {
    local test_name="$1"
    local test_command="$2"
    
    log_test "$test_name"
    ((TESTS_RUN++))
    
    if eval "$test_command"; then
        log_pass "$test_name"
        ((TESTS_PASSED++))
        return 0
    else
        log_fail "$test_name"
        return 1
    fi
}

echo "🧪 Running smoke tests against $BASE_URL"
echo "Timeout: ${TIMEOUT}s per test"
echo ""

# Test 1: Health endpoint
run_test "Health endpoint" \
    "curl -sf --max-time $TIMEOUT '$BASE_URL/health' | jq -e '.status == \"healthy\"'"

# Test 2: Ready endpoint  
run_test "Ready endpoint" \
    "curl -sf --max-time $TIMEOUT '$BASE_URL/ready' | jq -e '.ready == true'"

# Test 3: GraphQL introspection
run_test "GraphQL introspection" \
    "curl -sf --max-time $TIMEOUT -X POST '$BASE_URL/graphql' \
     -H 'Content-Type: application/json' \
     -d '{\"query\":\"query{__schema{types{name}}}\"}' | jq -e '.data.__schema.types | length > 0'"

# Test 4: Metrics endpoint
run_test "Metrics endpoint" \
    "curl -sf --max-time $TIMEOUT '$BASE_URL/metrics' | grep -q 'maestro_'"

# Test 5: API versioning
run_test "API version" \
    "curl -sf --max-time $TIMEOUT '$BASE_URL/version' | jq -e '.version | test(\"24\\.2\\.0\")'"

# Test 6: Database connectivity
run_test "Database health" \
    "curl -sf --max-time $TIMEOUT '$BASE_URL/health/db' | jq -e '.postgresql == true and .neo4j == true'"

# Test 7: Authentication endpoints
run_test "Auth endpoints" \
    "curl -sf --max-time $TIMEOUT '$BASE_URL/auth/health' -o /dev/null"

# Test 8: Ingest endpoint availability
run_test "Ingest endpoint" \
    "curl -sf --max-time $TIMEOUT -X POST '$BASE_URL/ingest/stream' \
     -H 'Content-Type: application/json' \
     -d '{\"signals\":[]}' | jq -e '.accepted >= 0'"

echo ""
echo "📊 Smoke test results:"
echo "Tests run: $TESTS_RUN"
echo "Tests passed: $TESTS_PASSED" 
echo "Success rate: $(( TESTS_PASSED * 100 / TESTS_RUN ))%"

if [[ $TESTS_PASSED -eq $TESTS_RUN ]]; then
    echo -e "${GREEN}✅ All smoke tests passed!${NC}"
    exit 0
else
    echo -e "${RED}❌ Some smoke tests failed!${NC}"
    exit 1
fi