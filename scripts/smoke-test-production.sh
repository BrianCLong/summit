#!/bin/bash
# Production Smoke Test Script
# Run after deployment to verify service health
# Usage: ./scripts/smoke-test-production.sh [BASE_URL]
#
# Exit codes:
#   0 - All checks passed
#   1 - One or more checks failed

set -euo pipefail

BASE_URL="${1:-${API_URL:-http://localhost:4000}}"
TIMEOUT=10
VERBOSE="${VERBOSE:-false}"

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

log_info() { echo -e "${GREEN}[INFO]${NC} $1"; }
log_warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }

check_endpoint() {
    local endpoint=$1
    local expected_status=$2
    local description=$3
    local jq_check=${4:-}

    local url="${BASE_URL}${endpoint}"

    if [[ "$VERBOSE" == "true" ]]; then
        log_info "Checking $description: $url"
    fi

    local response
    local http_code

    response=$(curl -s -w "\n%{http_code}" --max-time "$TIMEOUT" "$url" 2>/dev/null) || {
        log_error "$description: Connection failed"
        return 1
    }

    http_code=$(echo "$response" | tail -n1)
    local body=$(echo "$response" | sed '$d')

    if [[ "$http_code" != "$expected_status" ]]; then
        log_error "$description: Expected HTTP $expected_status, got $http_code"
        return 1
    fi

    if [[ -n "$jq_check" ]] && command -v jq &> /dev/null; then
        if ! echo "$body" | jq -e "$jq_check" > /dev/null 2>&1; then
            log_error "$description: JSON check failed - $jq_check"
            if [[ "$VERBOSE" == "true" ]]; then
                echo "$body" | jq . 2>/dev/null || echo "$body"
            fi
            return 1
        fi
    fi

    log_info "$description: OK"
    return 0
}

main() {
    log_info "=== Production Smoke Test ==="
    log_info "Target: $BASE_URL"
    log_info "Timeout: ${TIMEOUT}s per request"
    echo ""

    local failed=0

    # 1. Liveness check (must always work)
    check_endpoint "/health/live" "200" "Liveness probe" '.status == "alive"' || ((failed++))

    # 2. Basic health check
    check_endpoint "/health" "200" "Basic health" '.status == "ok"' || ((failed++))

    # 3. Readiness check (critical for traffic routing)
    check_endpoint "/health/ready" "200" "Readiness probe" '.status == "ready"' || {
        log_warn "Readiness check failed - service may not be ready for traffic"
        ((failed++))
    }

    # 4. Detailed health (verifies database connectivity)
    check_endpoint "/health/detailed" "200" "Detailed health (DB connectivity)" '.status == "ok" or .status == "degraded"' || {
        log_warn "Detailed health check reported issues"
        # Don't fail on degraded - just warn
    }

    # 5. Status endpoint (version info)
    check_endpoint "/status" "200" "Status/version" '.version' || ((failed++))

    # 6. Deployment validation
    check_endpoint "/health/deployment" "200" "Deployment validation" '.status == "ready_for_traffic"' || {
        log_warn "Deployment validation check did not pass"
        ((failed++))
    }

    echo ""
    if [[ $failed -eq 0 ]]; then
        log_info "=== ALL SMOKE TESTS PASSED ==="
        exit 0
    else
        log_error "=== $failed SMOKE TEST(S) FAILED ==="
        exit 1
    fi
}

# Check for required tools
if ! command -v curl &> /dev/null; then
    log_error "curl is required but not installed"
    exit 1
fi

main "$@"
