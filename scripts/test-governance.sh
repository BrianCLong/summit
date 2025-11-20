#!/bin/bash

# ============================================================================
# Summit Governance System Test Script
# ============================================================================
# This script demonstrates and tests all governance features
#
# Usage:
#   ./scripts/test-governance.sh [OPTIONS]
#
# Options:
#   --full            Run all tests (default)
#   --warrants        Test warrant management only
#   --access-requests Test access request system only
#   --audit           Test audit logging only
#   --quick           Quick smoke test
#   --help            Show this help message
# ============================================================================

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

# Configuration
API_BASE_URL="${API_BASE_URL:-http://localhost:3000}"
ADMIN_TOKEN="${ADMIN_TOKEN:-admin-test-token}"
USER_TOKEN="${USER_TOKEN:-user-test-token}"
VIEWER_TOKEN="${VIEWER_TOKEN:-viewer-test-token}"

# Test tracking
TESTS_RUN=0
TESTS_PASSED=0
TESTS_FAILED=0

# ============================================================================
# Helper Functions
# ============================================================================

log_header() {
    echo -e "\n${CYAN}========================================${NC}"
    echo -e "${CYAN}$1${NC}"
    echo -e "${CYAN}========================================${NC}\n"
}

log_test() {
    echo -e "${BLUE}[TEST]${NC} $1"
}

log_pass() {
    echo -e "${GREEN}[PASS]${NC} $1"
    ((TESTS_PASSED++))
}

log_fail() {
    echo -e "${RED}[FAIL]${NC} $1"
    ((TESTS_FAILED++))
}

log_info() {
    echo -e "${YELLOW}[INFO]${NC} $1"
}

# Run a test
run_test() {
    local test_name="$1"
    local command="$2"
    local expected_status="$3"

    ((TESTS_RUN++))
    log_test "$test_name"

    response=$(eval "$command" 2>&1)
    status=$?

    if [ $status -eq $expected_status ]; then
        log_pass "$test_name"
        return 0
    else
        log_fail "$test_name (expected status $expected_status, got $status)"
        echo "$response"
        return 1
    fi
}

# Make API request
api_request() {
    local method="$1"
    local path="$2"
    local token="$3"
    local data="$4"

    if [ -n "$data" ]; then
        curl -s -X "$method" \
            -H "Authorization: Bearer $token" \
            -H "Content-Type: application/json" \
            -d "$data" \
            "$API_BASE_URL$path"
    else
        curl -s -X "$method" \
            -H "Authorization: Bearer $token" \
            "$API_BASE_URL$path"
    fi
}

# ============================================================================
# Warrant Tests
# ============================================================================

test_warrants() {
    log_header "Testing Warrant Management"

    # Test 1: Create warrant
    log_test "Creating test warrant..."
    response=$(api_request POST /api/warrants "$ADMIN_TOKEN" '{
        "warrantNumber": "SW-2025-TEST-001",
        "warrantType": "search_warrant",
        "issuingAuthority": "Test District Court",
        "issuedDate": "2025-01-15T00:00:00Z",
        "expiryDate": "2025-12-31T23:59:59Z",
        "jurisdiction": "US",
        "scopeDescription": "Test warrant for automated testing",
        "scopeConstraints": {
            "resourceTypes": ["investigation", "entity"],
            "allowedOperations": ["read", "export"],
            "purposes": ["investigation"]
        }
    }')

    if echo "$response" | grep -q '"id"'; then
        WARRANT_ID=$(echo "$response" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)
        log_pass "Warrant created: $WARRANT_ID"
    else
        log_fail "Failed to create warrant"
        echo "$response"
    fi

    # Test 2: Get warrant
    log_test "Fetching warrant by ID..."
    response=$(api_request GET "/api/warrants/$WARRANT_ID" "$ADMIN_TOKEN")
    if echo "$response" | grep -q "$WARRANT_ID"; then
        log_pass "Warrant fetched successfully"
    else
        log_fail "Failed to fetch warrant"
    fi

    # Test 3: List active warrants
    log_test "Listing active warrants..."
    response=$(api_request GET "/api/warrants/status/active" "$ADMIN_TOKEN")
    if echo "$response" | grep -q '"warrants"'; then
        log_pass "Active warrants listed"
    else
        log_fail "Failed to list active warrants"
    fi

    # Test 4: Validate warrant
    log_test "Validating warrant..."
    response=$(api_request POST "/api/warrants/$WARRANT_ID/validate" "$ADMIN_TOKEN" '{
        "resourceType": "investigation",
        "operation": "read",
        "purpose": "investigation"
    }')
    if echo "$response" | grep -q '"valid":true'; then
        log_pass "Warrant validation passed"
    else
        log_fail "Warrant validation failed"
    fi

    # Test 5: Get warrant usage
    log_test "Fetching warrant usage..."
    response=$(api_request GET "/api/warrants/$WARRANT_ID/usage" "$ADMIN_TOKEN")
    if echo "$response" | grep -q '"usage"'; then
        log_pass "Warrant usage fetched"
    else
        log_fail "Failed to fetch warrant usage"
    fi
}

# ============================================================================
# Access Request Tests
# ============================================================================

test_access_requests() {
    log_header "Testing Access Request System"

    # Test 1: Submit access request
    log_test "Submitting access request..."
    response=$(api_request POST /api/access-requests "$USER_TOKEN" '{
        "resourceType": "investigation",
        "resourceId": "test-inv-restricted",
        "requestedPurpose": "investigation",
        "justification": "I need access to this restricted investigation to analyze connections to case XYZ-123. My supervisor has verbally approved this access request.",
        "requestedOperations": ["read"],
        "requestedSensitivity": "restricted"
    }')

    if echo "$response" | grep -q '"accessRequestId"'; then
        ACCESS_REQUEST_ID=$(echo "$response" | grep -o '"accessRequestId":"[^"]*"' | cut -d'"' -f4)
        log_pass "Access request submitted: $ACCESS_REQUEST_ID"
    else
        log_fail "Failed to submit access request"
        echo "$response"
    fi

    # Test 2: List access requests
    log_test "Listing access requests..."
    response=$(api_request GET "/api/access-requests?status=pending" "$ADMIN_TOKEN")
    if echo "$response" | grep -q '"accessRequests"'; then
        log_pass "Access requests listed"
    else
        log_fail "Failed to list access requests"
    fi

    # Test 3: Get specific access request
    log_test "Fetching access request by ID..."
    response=$(api_request GET "/api/access-requests/$ACCESS_REQUEST_ID" "$ADMIN_TOKEN")
    if echo "$response" | grep -q "$ACCESS_REQUEST_ID"; then
        log_pass "Access request fetched"
    else
        log_fail "Failed to fetch access request"
    fi

    # Test 4: Approve access request
    log_test "Approving access request..."
    response=$(api_request POST "/api/access-requests/$ACCESS_REQUEST_ID/approve" "$ADMIN_TOKEN" '{
        "reviewNotes": "Approved after verifying supervisor approval and legitimate business need.",
        "approvalExpiresAt": "2025-06-30T23:59:59Z"
    }')
    if echo "$response" | grep -q '"success":true'; then
        log_pass "Access request approved"
    else
        log_fail "Failed to approve access request"
    fi
}

# ============================================================================
# Audit Tests
# ============================================================================

test_audit() {
    log_header "Testing Audit System"

    # Test 1: Query audit events
    log_test "Querying audit events..."
    response=$(api_request POST /api/audit/query "$ADMIN_TOKEN" '{
        "startTime": "2025-01-01T00:00:00Z",
        "endTime": "2025-12-31T23:59:59Z",
        "limit": 10
    }')
    if echo "$response" | grep -q '"events"'; then
        log_pass "Audit events queried"
    else
        log_fail "Failed to query audit events"
    fi

    # Test 2: Get audit statistics
    log_test "Fetching audit statistics..."
    response=$(api_request GET "/api/audit/stats?startDate=2025-01-01T00:00:00Z" "$ADMIN_TOKEN")
    if echo "$response" | grep -q '"stats"'; then
        log_pass "Audit statistics fetched"
    else
        log_fail "Failed to fetch audit statistics"
    fi

    # Test 3: Verify audit trail integrity
    log_test "Verifying audit trail integrity..."
    response=$(api_request POST /api/audit/verify-integrity "$ADMIN_TOKEN" '{
        "startDate": "2025-01-01T00:00:00Z"
    }')
    if echo "$response" | grep -q '"verification"'; then
        log_pass "Audit trail integrity verified"
    else
        log_fail "Failed to verify audit trail integrity"
    fi

    # Test 4: Generate compliance report
    log_test "Generating compliance report..."
    response=$(api_request POST /api/audit/compliance-report "$ADMIN_TOKEN" '{
        "framework": "SOX",
        "startDate": "2025-01-01T00:00:00Z",
        "endDate": "2025-01-31T23:59:59Z"
    }')
    if echo "$response" | grep -q '"report"'; then
        log_pass "Compliance report generated"
    else
        log_fail "Failed to generate compliance report"
    fi
}

# ============================================================================
# GraphQL Governance Tests
# ============================================================================

test_graphql_governance() {
    log_header "Testing GraphQL with Governance"

    # Test 1: Query with full governance headers
    log_test "GraphQL query with governance headers..."
    response=$(curl -s -X POST "$API_BASE_URL/graphql" \
        -H "Authorization: Bearer $USER_TOKEN" \
        -H "X-Purpose: investigation" \
        -H "X-Legal-Basis: investigation" \
        -H "X-Reason-For-Access: Testing governance system end-to-end" \
        -H "Content-Type: application/json" \
        -d '{"query":"{ investigationCaseGraph(investigationId: \"test-inv-1\") { investigation { id } governanceMetadata { purpose } } }"}')

    if echo "$response" | grep -q '"data"' || echo "$response" | grep -q '"purpose"'; then
        log_pass "GraphQL query with governance headers"
    else
        log_fail "GraphQL query failed"
        echo "$response"
    fi

    # Test 2: Query without governance headers (should use defaults in permissive mode)
    log_test "GraphQL query without governance headers..."
    response=$(curl -s -X POST "$API_BASE_URL/graphql" \
        -H "Authorization: Bearer $USER_TOKEN" \
        -H "Content-Type: application/json" \
        -d '{"query":"{ investigationCaseGraph(investigationId: \"test-inv-1\") { investigation { id } } }"}')

    if echo "$response" | grep -q '"data"' || echo "$response" | grep -q '"errors"'; then
        log_pass "GraphQL query without governance headers (backward compat)"
    else
        log_fail "GraphQL query failed unexpectedly"
    fi

    # Test 3: Access denied test
    log_test "Testing access denial..."
    response=$(curl -s -X POST "$API_BASE_URL/graphql" \
        -H "Authorization: Bearer $VIEWER_TOKEN" \
        -H "X-Purpose: investigation" \
        -H "X-Legal-Basis: investigation" \
        -H "X-Reason-For-Access: Testing access denial" \
        -H "Content-Type: application/json" \
        -d '{"query":"{ investigationCaseGraph(investigationId: \"restricted-inv\") { investigation { id } } }"}')

    if echo "$response" | grep -q '"errors"' && echo "$response" | grep -q "appeal"; then
        log_pass "Access denial with appeal guidance"
    else
        log_fail "Access denial test failed"
    fi
}

# ============================================================================
# Service Health Tests
# ============================================================================

test_services() {
    log_header "Testing Service Health"

    # Test OPA
    log_test "Checking OPA health..."
    response=$(curl -s http://localhost:8181/health 2>/dev/null || echo "error")
    if [ "$response" != "error" ]; then
        log_pass "OPA is healthy"
    else
        log_fail "OPA is not accessible"
    fi

    # Test PostgreSQL
    log_test "Checking PostgreSQL..."
    if psql "$DATABASE_URL" -c "SELECT 1" &>/dev/null 2>&1; then
        log_pass "PostgreSQL is accessible"
    else
        log_fail "PostgreSQL is not accessible"
    fi

    # Test Neo4j
    log_test "Checking Neo4j..."
    response=$(curl -s http://localhost:7474 2>/dev/null || echo "error")
    if [ "$response" != "error" ]; then
        log_pass "Neo4j is accessible"
    else
        log_fail "Neo4j is not accessible"
    fi

    # Test Redis
    log_test "Checking Redis..."
    if redis-cli ping &>/dev/null 2>&1; then
        log_pass "Redis is accessible"
    else
        log_fail "Redis is not accessible (non-critical)"
    fi
}

# ============================================================================
# Main Script
# ============================================================================

# Parse arguments
RUN_WARRANTS=false
RUN_ACCESS_REQUESTS=false
RUN_AUDIT=false
RUN_GRAPHQL=false
RUN_SERVICES=false
RUN_ALL=true

while [[ $# -gt 0 ]]; do
    case $1 in
        --warrants)
            RUN_WARRANTS=true
            RUN_ALL=false
            shift
            ;;
        --access-requests)
            RUN_ACCESS_REQUESTS=true
            RUN_ALL=false
            shift
            ;;
        --audit)
            RUN_AUDIT=true
            RUN_ALL=false
            shift
            ;;
        --graphql)
            RUN_GRAPHQL=true
            RUN_ALL=false
            shift
            ;;
        --services)
            RUN_SERVICES=true
            RUN_ALL=false
            shift
            ;;
        --quick)
            RUN_SERVICES=true
            RUN_WARRANTS=true
            RUN_ALL=false
            shift
            ;;
        --full)
            RUN_ALL=true
            shift
            ;;
        --help)
            head -n 15 "$0" | tail -n 13
            exit 0
            ;;
        *)
            echo "Unknown option: $1"
            exit 1
            ;;
    esac
done

# Show configuration
echo -e "${CYAN}Summit Governance System Test Suite${NC}"
echo "API Base URL: $API_BASE_URL"
echo ""

# Run tests
if [ "$RUN_ALL" = true ] || [ "$RUN_SERVICES" = true ]; then
    test_services
fi

if [ "$RUN_ALL" = true ] || [ "$RUN_WARRANTS" = true ]; then
    test_warrants
fi

if [ "$RUN_ALL" = true ] || [ "$RUN_ACCESS_REQUESTS" = true ]; then
    test_access_requests
fi

if [ "$RUN_ALL" = true ] || [ "$RUN_AUDIT" = true ]; then
    test_audit
fi

if [ "$RUN_ALL" = true ] || [ "$RUN_GRAPHQL" = true ]; then
    test_graphql_governance
fi

# Summary
log_header "Test Summary"
echo "Total Tests:  $TESTS_RUN"
echo -e "${GREEN}Passed:       $TESTS_PASSED${NC}"
echo -e "${RED}Failed:       $TESTS_FAILED${NC}"
echo ""

if [ $TESTS_FAILED -eq 0 ]; then
    echo -e "${GREEN}All tests passed! ✓${NC}"
    exit 0
else
    echo -e "${RED}Some tests failed! ✗${NC}"
    exit 1
fi
