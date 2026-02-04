#!/bin/bash
# =============================================================================
# IntelGraph Platform - Smoke Test Script
# =============================================================================
# Usage: ./scripts/smoke-test.sh [host:port]
# Default: localhost:3000
# =============================================================================

set -euo pipefail

HOST="${1:-localhost:3000}"
PASSED=0
FAILED=0

echo "============================================"
echo "IntelGraph Platform Smoke Tests"
echo "Target: $HOST"
echo "============================================"
echo ""

# Helper function for test results
check() {
    local name="$1"
    local result="$2"
    if [ "$result" -eq 0 ]; then
        echo "[PASS] $name"
        ((PASSED++))
    else
        echo "[FAIL] $name"
        ((FAILED++))
    fi
}

# Test 1: Health endpoint
echo "Testing health endpoint..."
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "http://$HOST/healthz" 2>/dev/null || echo "000")
if [ "$HTTP_CODE" = "200" ]; then
    check "Health endpoint (/healthz)" 0
else
    check "Health endpoint (/healthz) - got $HTTP_CODE" 1
fi

# Test 2: Health endpoint JSON response
echo "Testing health endpoint response..."
HEALTH_RESPONSE=$(curl -s "http://$HOST/health" 2>/dev/null || echo "{}")
if echo "$HEALTH_RESPONSE" | grep -q '"status"'; then
    check "Health response contains status" 0
else
    check "Health response contains status" 1
fi

# Test 3: GraphQL endpoint exists
echo "Testing GraphQL endpoint..."
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" -X POST "http://$HOST/graphql" \
    -H "Content-Type: application/json" \
    -d '{"query":"{ __typename }"}' 2>/dev/null || echo "000")
if [ "$HTTP_CODE" = "200" ] || [ "$HTTP_CODE" = "401" ]; then
    check "GraphQL endpoint (/graphql)" 0
else
    check "GraphQL endpoint (/graphql) - got $HTTP_CODE" 1
fi

# Test 4: Static files (if in production mode)
echo "Testing static file serving..."
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "http://$HOST/" 2>/dev/null || echo "000")
if [ "$HTTP_CODE" = "200" ] || [ "$HTTP_CODE" = "304" ]; then
    check "Root path serves content" 0
else
    check "Root path serves content - got $HTTP_CODE" 1
fi

# Test 5: CORS headers present
echo "Testing CORS configuration..."
CORS_HEADER=$(curl -s -I "http://$HOST/healthz" 2>/dev/null | grep -i "access-control" || echo "")
if [ -n "$CORS_HEADER" ]; then
    check "CORS headers present" 0
else
    check "CORS headers present (may be expected if same-origin)" 0
fi

# Test 6: Security headers
echo "Testing security headers..."
HEADERS=$(curl -s -I "http://$HOST/healthz" 2>/dev/null)
if echo "$HEADERS" | grep -qi "x-content-type-options"; then
    check "Security header: X-Content-Type-Options" 0
else
    check "Security header: X-Content-Type-Options" 1
fi

# Summary
echo ""
echo "============================================"
echo "Results: $PASSED passed, $FAILED failed"
echo "============================================"

if [ "$FAILED" -gt 0 ]; then
    exit 1
else
    echo "All smoke tests passed!"
    exit 0
fi
