#!/bin/bash
# demo-smoke-test.sh - Run smoke tests against the demo environment
# Usage: ./scripts/demo-smoke-test.sh

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log_info() { echo -e "${BLUE}[INFO]${NC} $1"; }
log_success() { echo -e "${GREEN}[PASS]${NC} $1"; }
log_warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }
log_error() { echo -e "${RED}[FAIL]${NC} $1"; }

TESTS_PASSED=0
TESTS_FAILED=0

run_test() {
    local name=$1
    local command=$2

    echo -n "Testing: $name... "
    if eval "$command" >/dev/null 2>&1; then
        echo -e "${GREEN}PASS${NC}"
        TESTS_PASSED=$((TESTS_PASSED + 1))
        return 0
    else
        echo -e "${RED}FAIL${NC}"
        TESTS_FAILED=$((TESTS_FAILED + 1))
        return 1
    fi
}

echo ""
echo "Summit Platform Demo - Smoke Tests"
echo "==================================="
echo ""

# Health checks
run_test "API Health" "curl -sf http://localhost:4000/health"
run_test "API Ready" "curl -sf http://localhost:4000/health/ready"
run_test "Frontend Accessible" "curl -sf http://localhost:3000"
run_test "GraphQL Endpoint" "curl -sf http://localhost:4000/graphql -X POST -H 'Content-Type: application/json' -d '{\"query\":\"{__typename}\"}'"

# Neo4j check
run_test "Neo4j Browser" "curl -sf http://localhost:7474"

# Metrics check
run_test "Metrics Endpoint" "curl -sf http://localhost:4000/metrics" || true

# GraphQL introspection
run_test "GraphQL Schema" "curl -sf http://localhost:4000/graphql -X POST -H 'Content-Type: application/json' -d '{\"query\":\"{__schema{types{name}}}\"}'"

echo ""
echo "==================================="
echo "Results: $TESTS_PASSED passed, $TESTS_FAILED failed"
echo ""

if [ $TESTS_FAILED -gt 0 ]; then
    log_warn "Some smoke tests failed. The demo may still be functional."
    exit 1
else
    log_success "All smoke tests passed!"
    exit 0
fi
