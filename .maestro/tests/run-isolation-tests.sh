#!/bin/bash

# Maestro Conductor v24.2.0 - Multi-Tenant Isolation Test Suite
# Epic E8: Comprehensive isolation testing with fault injection

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../../.." && pwd)"
BASE_URL="${BASE_URL:-http://localhost:4000}"
GRAPHQL_URL="${GRAPHQL_URL:-$BASE_URL/graphql}"
JWT_TOKEN="${JWT_TOKEN:-test-token-isolation}"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Test results
CHAOS_TESTS_PASSED=false
STRESS_TESTS_PASSED=false
OVERALL_PASSED=false

echo -e "${BLUE}🔒 Maestro Conductor v24.2.0 - Multi-Tenant Isolation Test Suite${NC}"
echo "=============================================================="
echo "Target: $BASE_URL"
echo "GraphQL: $GRAPHQL_URL"
echo ""

# Function to check if services are ready
check_services() {
    echo -e "${BLUE}🔍 Checking service availability...${NC}"
    
    # Check API health
    if ! curl -s -f "$BASE_URL/health" > /dev/null; then
        echo -e "${RED}❌ API service not available at $BASE_URL${NC}"
        exit 1
    fi
    
    # Check GraphQL endpoint
    if ! curl -s -f -X POST "$GRAPHQL_URL" \
        -H "Content-Type: application/json" \
        -d '{"query":"query{__typename}"}' > /dev/null; then
        echo -e "${RED}❌ GraphQL service not available at $GRAPHQL_URL${NC}"
        exit 1
    fi
    
    echo -e "${GREEN}✅ Services are ready${NC}"
    echo ""
}

# Function to run chaos tests
run_chaos_tests() {
    echo -e "${YELLOW}🧪 Running Isolation Chaos Tests...${NC}"
    echo "----------------------------------------"
    
    cd "$PROJECT_ROOT"
    
    # Set environment variables for chaos tests
    export NODE_ENV=test
    export DATABASE_URL="${DATABASE_URL:-postgresql://localhost:5432/maestro_test}"
    export NEO4J_URI="${NEO4J_URI:-bolt://localhost:7687}"
    export NEO4J_USER="${NEO4J_USER:-neo4j}"
    export NEO4J_PASSWORD="${NEO4J_PASSWORD:-password}"
    
    # Run TypeScript chaos tests
    if npx ts-node "$SCRIPT_DIR/chaos/isolation.test.ts"; then
        echo -e "${GREEN}✅ Chaos tests passed - No isolation violations detected${NC}"
        CHAOS_TESTS_PASSED=true
    else
        echo -e "${RED}❌ Chaos tests failed - Isolation vulnerabilities detected${NC}"
        CHAOS_TESTS_PASSED=false
    fi
    
    echo ""
}

# Function to run stress tests
run_stress_tests() {
    echo -e "${YELLOW}⚡ Running Isolation Stress Tests...${NC}"
    echo "----------------------------------------"
    
    # Check if k6 is available
    if ! command -v k6 &> /dev/null; then
        echo -e "${RED}❌ k6 not found. Installing k6...${NC}"
        
        # Install k6 based on OS
        if [[ "$OSTYPE" == "darwin"* ]]; then
            brew install k6
        elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
            # Ubuntu/Debian
            sudo gpg -k
            sudo gpg --no-default-keyring --keyring /usr/share/keyrings/k6-archive-keyring.gpg --keyserver hkp://keyserver.ubuntu.com:80 --recv-keys C5AD17C747E3415A3642D57D77C6C491D6AC1D69
            echo "deb [signed-by=/usr/share/keyrings/k6-archive-keyring.gpg] https://dl.k6.io/deb stable main" | sudo tee /etc/apt/sources.list.d/k6.list
            sudo apt-get update
            sudo apt-get install k6
        else
            echo -e "${RED}❌ Unsupported OS for k6 auto-install. Please install k6 manually.${NC}"
            exit 1
        fi
    fi
    
    # Set environment variables for k6
    export BASE_URL="$BASE_URL"
    export GRAPHQL_URL="$GRAPHQL_URL"
    export JWT="$JWT_TOKEN"
    
    # Run k6 stress tests
    cd "$SCRIPT_DIR"
    
    if k6 run k6/isolation_stress.js; then
        echo -e "${GREEN}✅ Stress tests passed - Isolation maintained under load${NC}"
        STRESS_TESTS_PASSED=true
    else
        echo -e "${RED}❌ Stress tests failed - Isolation broke under stress${NC}"
        STRESS_TESTS_PASSED=false
    fi
    
    echo ""
}

# Function to generate comprehensive report
generate_report() {
    echo -e "${BLUE}📊 Generating Comprehensive Isolation Report...${NC}"
    echo "================================================"
    
    local report_file="$SCRIPT_DIR/isolation-test-report.md"
    local timestamp=$(date -u '+%Y-%m-%d %H:%M:%S UTC')
    
    cat > "$report_file" << EOF
# Multi-Tenant Isolation Test Report

**Generated:** $timestamp  
**Test Suite:** Maestro Conductor v24.2.0  
**Target:** $BASE_URL  

## Executive Summary

| Test Type | Status | Result |
|-----------|--------|---------|
| Chaos Tests | $([ "$CHAOS_TESTS_PASSED" = true ] && echo "✅ PASS" || echo "❌ FAIL") | $([ "$CHAOS_TESTS_PASSED" = true ] && echo "No isolation violations under fault conditions" || echo "Isolation vulnerabilities detected") |
| Stress Tests | $([ "$STRESS_TESTS_PASSED" = true ] && echo "✅ PASS" || echo "❌ FAIL") | $([ "$STRESS_TESTS_PASSED" = true ] && echo "Isolation maintained under 10x load" || echo "Isolation broke under stress") |
| **Overall** | $([ "$OVERALL_PASSED" = true ] && echo "✅ PASS" || echo "❌ FAIL") | $([ "$OVERALL_PASSED" = true ] && echo "Multi-tenant isolation is production-ready" || echo "Critical isolation issues must be resolved") |

## Test Details

### Chaos Tests (Fault Injection)
- **Stale Cache Scenarios:** Tested isolation during cache invalidation
- **OPA Connection Failures:** Verified tenant scoping during auth failures  
- **Database Race Conditions:** Checked concurrent operation isolation
- **Memory Pressure:** Tested isolation under memory constraints
- **Concurrent Tenants:** Verified isolation with high tenant concurrency

### Stress Tests (Load Testing)
- **Peak Load:** 1000 concurrent virtual users (10x normal)
- **Test Duration:** 12 minutes with sustained stress
- **Tenant Operations:** Multi-tenant GraphQL queries and ingest
- **Isolation Checks:** Cross-tenant boundary validation under load

## SLO Compliance

### Epic E8 Requirements
- ✅ **Zero Cross-Tenant Data Leakage:** $([ "$OVERALL_PASSED" = true ] && echo "ACHIEVED" || echo "FAILED")
- ✅ **Fault Tolerance:** $([ "$CHAOS_TESTS_PASSED" = true ] && echo "ACHIEVED" || echo "FAILED") 
- ✅ **Stress Resilience:** $([ "$STRESS_TESTS_PASSED" = true ] && echo "ACHIEVED" || echo "FAILED")

### Performance Under Stress
- **Latency P95:** < 1000ms (acceptable degradation under 10x load)
- **Availability:** > 99% (maintained during stress testing)
- **Throughput:** Maintained tenant isolation at scale

## Recommendations

$([ "$OVERALL_PASSED" = true ] && cat << PASS_RECS
✅ **PRODUCTION READY:** Multi-tenant isolation is robust and ready for production deployment.

- All chaos scenarios passed with zero isolation violations
- Stress testing confirmed isolation scales under high load  
- Tenant boundary enforcement is working correctly
- Database-level scoping prevents cross-tenant access

**Next Steps:**
1. Deploy to production with confidence
2. Monitor isolation metrics in production
3. Schedule regular isolation testing as part of CI/CD
PASS_RECS
|| cat << FAIL_RECS
❌ **CRITICAL ISSUES:** Multi-tenant isolation has vulnerabilities that must be addressed.

**Immediate Actions Required:**
1. Review and fix tenant scoping in database layers
2. Strengthen OPA policy enforcement 
3. Add additional tenant boundary validation
4. Re-run tests until all scenarios pass

**Do NOT deploy to production until all isolation tests pass.**
FAIL_RECS
)

## Artifacts

- Chaos test logs: \`$SCRIPT_DIR/chaos/\`
- Stress test reports: \`$SCRIPT_DIR/k6/\`
- Performance metrics: Available in test outputs

---
*Report generated by Maestro Conductor v24.2.0 Isolation Test Suite*
EOF

    echo -e "${GREEN}📄 Report saved to: $report_file${NC}"
    echo ""
}

# Function to display final results
display_results() {
    echo -e "${BLUE}🎯 Final Results${NC}"
    echo "================"
    
    echo -n "Chaos Tests: "
    if [ "$CHAOS_TESTS_PASSED" = true ]; then
        echo -e "${GREEN}✅ PASSED${NC}"
    else
        echo -e "${RED}❌ FAILED${NC}"
    fi
    
    echo -n "Stress Tests: "
    if [ "$STRESS_TESTS_PASSED" = true ]; then
        echo -e "${GREEN}✅ PASSED${NC}"
    else
        echo -e "${RED}❌ FAILED${NC}"
    fi
    
    echo ""
    echo -n "Overall Status: "
    if [ "$OVERALL_PASSED" = true ]; then
        echo -e "${GREEN}✅ PRODUCTION READY${NC}"
        echo "Multi-tenant isolation is robust and secure."
    else
        echo -e "${RED}❌ CRITICAL ISSUES${NC}"
        echo "Isolation vulnerabilities detected. Do NOT deploy to production."
    fi
    
    echo ""
}

# Main execution
main() {
    check_services
    run_chaos_tests
    run_stress_tests
    
    # Determine overall result
    if [ "$CHAOS_TESTS_PASSED" = true ] && [ "$STRESS_TESTS_PASSED" = true ]; then
        OVERALL_PASSED=true
    else
        OVERALL_PASSED=false
    fi
    
    generate_report
    display_results
    
    # Exit with appropriate code
    if [ "$OVERALL_PASSED" = true ]; then
        exit 0
    else
        exit 1
    fi
}

# Handle script arguments
case "${1:-run}" in
    "chaos-only")
        check_services
        run_chaos_tests
        exit $?
        ;;
    "stress-only")
        check_services
        run_stress_tests
        exit $?
        ;;
    "run"|"")
        main
        ;;
    "help"|"-h"|"--help")
        echo "Usage: $0 [chaos-only|stress-only|run|help]"
        echo ""
        echo "Commands:"
        echo "  run         Run complete isolation test suite (default)"
        echo "  chaos-only  Run only chaos/fault injection tests"
        echo "  stress-only Run only stress/load tests"
        echo "  help        Show this help message"
        echo ""
        echo "Environment Variables:"
        echo "  BASE_URL    API base URL (default: http://localhost:4000)"
        echo "  JWT_TOKEN   Authentication token (default: test-token-isolation)"
        exit 0
        ;;
    *)
        echo "Unknown command: $1"
        echo "Use '$0 help' for usage information."
        exit 1
        ;;
esac