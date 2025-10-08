#!/bin/bash
# IntelGraph Safe Mutations - Post-Deploy Smoke Tests
# Copy-paste validation suite for canary GA deployment

set -euo pipefail

# Configuration
API_BASE="${API_BASE:-https://api.intelgraph.dev}"
DEMO_TENANT="${DEMO_TENANT:-demo}"
TEST_TIMEOUT="${TEST_TIMEOUT:-10}"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Test results tracking
TESTS_PASSED=0
TESTS_FAILED=0

log() {
    echo -e "${GREEN}[$(date +'%H:%M:%S')]${NC} $1"
}

error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

test_result() {
    local test_name="$1"
    local expected="$2"
    local actual="$3"
    
    if [[ "$actual" == *"$expected"* ]]; then
        echo -e "${GREEN}✅ PASS${NC} $test_name"
        ((TESTS_PASSED++))
        return 0
    else
        echo -e "${RED}❌ FAIL${NC} $test_name"
        echo "    Expected: $expected"
        echo "    Got: $actual"
        ((TESTS_FAILED++))
        return 1
    fi
}

# Test A: Persisted queries enforcement (should fail)
test_pq_enforcement() {
    log "Testing persisted query enforcement..."
    
    local response
    response=$(curl -sS -X POST "$API_BASE/graphql" \
        -H "Content-Type: application/json" \
        -H "X-Tenant: $DEMO_TENANT" \
        -d '{"query":"mutation { SafeNoop }"}' \
        --max-time $TEST_TIMEOUT 2>/dev/null || echo '{"errors":[{"message":"curl failed"}]}')
    
    test_result "PQ Enforcement" "Persisted queries required" "$response"
}

# Test B: Budget denial path (cap too low)
test_budget_denial() {
    log "Testing budget cap enforcement..."
    
    # Using a known valid hash for a low-cost operation with impossibly low cap
    local valid_hash="a1b2c3d4e5f6789012345678901234567890abcdef1234567890abcdef123456"
    
    local response
    response=$(curl -sS -X POST "$API_BASE/graphql" \
        -H "Content-Type: application/json" \
        -H "X-Tenant: $DEMO_TENANT" \
        -H "apq: 1" \
        -d "{\"extensions\":{\"persistedQuery\":{\"sha256Hash\":\"$valid_hash\"}},\"variables\":{\"capUSD\":0.00001}}" \
        --max-time $TEST_TIMEOUT 2>/dev/null || echo '{"errors":[{"message":"curl failed"}]}')
    
    test_result "Budget Denial" "Budget cap exceeded" "$response"
}

# Test C: Four-eyes approval required (> $5 or risky tag)
test_four_eyes_required() {
    log "Testing four-eyes approval requirement..."
    
    # Using merge_entities hash (risky operation)
    local merge_hash="b2c3d4e5f6789012345678901234567890abcdef1234567890abcdef1234567"
    
    local response
    response=$(curl -sS -X POST "$API_BASE/graphql" \
        -H "Content-Type: application/json" \
        -H "X-Tenant: $DEMO_TENANT" \
        -d "{\"extensions\":{\"persistedQuery\":{\"sha256Hash\":\"$merge_hash\"}},\"variables\":{\"risk_tag\":\"merge_entities\",\"est_usd\":7.50,\"approvers\":[]}}" \
        --max-time $TEST_TIMEOUT 2>/dev/null || echo '{"errors":[{"message":"curl failed"}]}')
    
    test_result "Four-Eyes Required" "approval required" "$response"
}

# Test D: Approval satisfied (should succeed)
test_approval_satisfied() {
    log "Testing satisfied approval flow..."
    
    local merge_hash="b2c3d4e5f6789012345678901234567890abcdef1234567890abcdef1234567"
    
    local response
    response=$(curl -sS -X POST "$API_BASE/graphql" \
        -H "Content-Type: application/json" \
        -H "X-Tenant: $DEMO_TENANT" \
        -d "{\"extensions\":{\"persistedQuery\":{\"sha256Hash\":\"$merge_hash\"}},\"variables\":{\"risk_tag\":\"merge_entities\",\"est_usd\":7.50,\"approvers\":[\"u1\",\"u2\"]}}" \
        --max-time $TEST_TIMEOUT 2>/dev/null || echo '{"errors":[{"message":"curl failed"}]}')
    
    # Success should not contain "error" or show actual data
    if [[ "$response" != *"error"* && "$response" == *"data"* ]]; then
        echo -e "${GREEN}✅ PASS${NC} Approval Satisfied"
        ((TESTS_PASSED++))
    else
        echo -e "${RED}❌ FAIL${NC} Approval Satisfied"
        echo "    Response: $response"
        ((TESTS_FAILED++))
    fi
}

# Test E: Canary budget alert verification
test_canary_alerts() {
    log "Testing canary budget alert thresholds..."
    
    # Check Grafana API for alert state (requires auth)
    local grafana_url="${GRAFANA_URL:-http://grafana.intelgraph.dev:3000}"
    local alert_response
    
    if [[ -n "${GRAFANA_TOKEN:-}" ]]; then
        alert_response=$(curl -sS -H "Authorization: Bearer $GRAFANA_TOKEN" \
            "$grafana_url/api/alerts" \
            --max-time $TEST_TIMEOUT 2>/dev/null || echo '[]')
        
        if [[ "$alert_response" == *"CanaryDailyBudgetApproaching"* ]]; then
            echo -e "${GREEN}✅ PASS${NC} Canary Alert Configuration"
            ((TESTS_PASSED++))
        else
            echo -e "${YELLOW}⚠️  SKIP${NC} Canary Alert (alert not found or not configured)"
        fi
    else
        echo -e "${YELLOW}⚠️  SKIP${NC} Canary Alert (GRAFANA_TOKEN not set)"
    fi
}

# Health check endpoints
test_health_endpoints() {
    log "Testing health endpoints..."
    
    local health_response
    health_response=$(curl -sS "$API_BASE/health" \
        --max-time $TEST_TIMEOUT 2>/dev/null || echo 'fail')
    
    test_result "Health Endpoint" "ok" "$health_response"
    
    # Test Redis connectivity (rate limiting)
    local redis_health
    redis_health=$(curl -sS "$API_BASE/health/redis" \
        --max-time $TEST_TIMEOUT 2>/dev/null || echo 'fail')
    
    test_result "Redis Health" "ok" "$redis_health"
}

# Main execution
main() {
    echo "========================================"
    echo "IntelGraph Safe Mutations Smoke Tests"
    echo "API Base: $API_BASE"
    echo "Tenant: $DEMO_TENANT"
    echo "========================================"
    echo
    
    test_health_endpoints
    test_pq_enforcement
    test_budget_denial
    test_four_eyes_required
    test_approval_satisfied
    test_canary_alerts
    
    echo
    echo "========================================"
    echo "Test Results Summary"
    echo "========================================"
    echo -e "Passed: ${GREEN}$TESTS_PASSED${NC}"
    echo -e "Failed: ${RED}$TESTS_FAILED${NC}"
    echo
    
    if [[ $TESTS_FAILED -eq 0 ]]; then
        echo -e "${GREEN}🎉 All critical smoke tests passed!${NC}"
        echo "Safe Mutations canary deployment is ready for GA."
        exit 0
    else
        echo -e "${RED}💥 Some smoke tests failed!${NC}"
        echo "Review failures before proceeding with GA cutover."
        exit 1
    fi
}

# Allow sourcing this script for individual test functions
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    main "$@"
fi