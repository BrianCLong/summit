#!/usr/bin/env bash
set -euo pipefail

# Policy Testing Pipeline
# Runs OPA unit tests and Conftest validation for conductor policies

# Configuration
POLICY_DIR=${POLICY_DIR:-./server/src/conductor/security}
CONFTEST_DIR=${CONFTEST_DIR:-./policy/conftest}
DEPLOY_DIR=${DEPLOY_DIR:-./deploy}
TEST_DATA_DIR=${TEST_DATA_DIR:-./policy/test-data}

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Logging
say() { printf "\n${BLUE}== %s ==${NC}\n" "$*"; }
pass() { printf "${GREEN}✅ %s${NC}\n" "$*"; }
fail() { printf "${RED}❌ %s${NC}\n" "$*"; }
warn() { printf "${YELLOW}⚠️  %s${NC}\n" "$*"; }

# Test counters
TESTS_RUN=0
TESTS_PASSED=0
TESTS_FAILED=0

# Test wrapper
run_test() {
    local test_name="$1"
    shift
    TESTS_RUN=$((TESTS_RUN + 1))
    
    if "$@"; then
        pass "$test_name"
        TESTS_PASSED=$((TESTS_PASSED + 1))
        return 0
    else
        fail "$test_name"
        TESTS_FAILED=$((TESTS_FAILED + 1))
        return 1
    fi
}

# Check prerequisites
check_prerequisites() {
    local missing=()
    
    if ! command -v opa >/dev/null 2>&1; then
        missing+=("opa")
    fi
    
    if ! command -v conftest >/dev/null 2>&1; then
        missing+=("conftest")
    fi
    
    if [ ${#missing[@]} -gt 0 ]; then
        fail "Missing required tools: ${missing[*]}"
        echo ""
        echo "Installation instructions:"
        echo "  OPA: https://www.openpolicyagent.org/docs/latest/#running-opa"
        echo "  Conftest: https://www.conftest.dev/install/"
        exit 1
    fi
}

# Run OPA unit tests
test_opa_policies() {
    say "Running OPA Rego unit tests"
    
    local test_output
    if test_output=$(opa test "$POLICY_DIR" --verbose --format json 2>&1); then
        # Parse JSON output for detailed results
        local total_tests
        local passed_tests
        local failed_tests
        
        # New OPA version returns an array directly, or an object with .tests
        if echo "$test_output" | jq -e 'type == "array"' >/dev/null 2>&1; then
            total_tests=$(echo "$test_output" | jq '. | length' 2>/dev/null || echo "0")
            failed_tests=$(echo "$test_output" | jq '[.[] | select(.fail == true)] | length' 2>/dev/null || echo "0")
            passed_tests=$((total_tests - failed_tests))
        else
            total_tests=$(echo "$test_output" | jq '.tests | length' 2>/dev/null || echo "unknown")
            passed_tests=$(echo "$test_output" | jq '[.tests[] | select(.pass == true)] | length' 2>/dev/null || echo "0")
            failed_tests=$(echo "$test_output" | jq '[.tests[] | select(.pass == false)] | length' 2>/dev/null || echo "0")
        fi
        
        if [ "$failed_tests" = "0" ] && [ "$total_tests" != "0" ]; then
            pass "All $passed_tests OPA unit tests passed"
            return 0
        elif [ "$total_tests" = "0" ]; then
            warn "No OPA unit tests found in $POLICY_DIR"
            return 0 # Not necessarily a failure
        else
            fail "$failed_tests out of $total_tests OPA unit tests failed"
            
            # Show failed tests
            echo "Failed tests:"
            if echo "$test_output" | jq -e 'type == "array"' >/dev/null 2>&1; then
                echo "$test_output" | jq -r '.[] | select(.fail == true) | "  - " + .package + "." + .name' 2>/dev/null || true
            else
                echo "$test_output" | jq -r '.tests[] | select(.pass == false) | "  - " + .package + "." + .name' 2>/dev/null || true
            fi
            return 1
        fi
    else
        fail "OPA test execution failed"
        echo "Output: $test_output"
        return 1
    fi
}

# Test policy syntax
test_policy_syntax() {
    say "Validating policy syntax"
    
    local policies_valid=true
    
    for policy_file in "$POLICY_DIR"/*.rego "$CONFTEST_DIR"/*.rego; do
        if [ -f "$policy_file" ]; then
            if opa fmt --diff "$policy_file" >/dev/null 2>&1; then
                pass "Syntax valid: $(basename "$policy_file")"
            else
                fail "Syntax error: $(basename "$policy_file")"
                policies_valid=false
            fi
        fi
    done
    
    $policies_valid
}

# Create test data if missing
create_test_data() {
    mkdir -p "$TEST_DATA_DIR"
    
    # Create sample Docker Compose for testing
    if [ ! -f "$TEST_DATA_DIR/test-compose.yml" ]; then
        cat > "$TEST_DATA_DIR/test-compose.yml" << 'EOF'
services:
  good-service:
    image: nginx:1.21.6@sha256:2834dc507516af02784808c5f48b7cbe38b8ed5d0f4837f16e78d00deb7e7767
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost/health"]
    deploy:
      resources:
        limits:
          cpus: '0.5'
          memory: 512M
    cap_drop:
      - ALL
    networks:
      - app-network

  bad-service:
    image: redis:latest  # Uses :latest tag
    privileged: true     # Privileged mode
    user: "0"           # Root user
    ports:
      - "0.0.0.0:6379:6379"  # Binds to all interfaces

networks:
  app-network:
    driver: bridge
EOF
    fi
    
    # Create sample Kubernetes manifest
    if [ ! -f "$TEST_DATA_DIR/test-deployment.yaml" ]; then
        cat > "$TEST_DATA_DIR/test-deployment.yaml" << 'EOF'
apiVersion: apps/v1
kind: Deployment
metadata:
  name: conductor-server
  namespace: conductor
spec:
  template:
    spec:
      containers:
      - name: server
        image: conductor-server:v1.0.0
        securityContext:
          runAsUser: 1000
          readOnlyRootFilesystem: true
        resources:
          limits:
            cpu: 500m
            memory: 512Mi
        livenessProbe:
          httpGet:
            path: /health
            port: 4000
        readinessProbe:
          httpGet:
            path: /ready
            port: 4000
EOF
    fi
}

# Run Conftest validation
test_conftest_validation() {
    say "Running Conftest policy validation"
    
    create_test_data
    
    local conftest_results=true
    
    # Test Docker Compose validation
    if [ -f "$TEST_DATA_DIR/test-compose.yml" ]; then
        if conftest test --policy "$CONFTEST_DIR" "$TEST_DATA_DIR/test-compose.yml" --output table; then
            pass "Docker Compose validation passed"
        else
            warn "Docker Compose validation found issues (expected for test data)"
            # Don't fail the test since our test data intentionally has violations
        fi
    fi
    
    # Test Kubernetes validation
    if [ -f "$TEST_DATA_DIR/test-deployment.yaml" ]; then
        if conftest test --policy "$CONFTEST_DIR" "$TEST_DATA_DIR/test-deployment.yaml" --output table; then
            pass "Kubernetes manifest validation passed"
        else
            warn "Kubernetes validation found issues"
        fi
    fi
    
    # Test actual deployment files if they exist
    if [ -d "$DEPLOY_DIR" ]; then
        for manifest in "$DEPLOY_DIR"/*.yaml "$DEPLOY_DIR"/*.yml; do
            if [ -f "$manifest" ]; then
                if conftest test --policy "$CONFTEST_DIR" "$manifest" --output table; then
                    pass "Validation passed: $(basename "$manifest")"
                else
                    fail "Validation failed: $(basename "$manifest")"
                    conftest_results=false
                fi
            fi
        done
    fi
    
    $conftest_results
}

# Test policy performance
test_policy_performance() {
    say "Testing policy performance"
    
    local temp_input=$(mktemp)
    cat > "$temp_input" << 'EOF'
{
  "user": {
    "id": "test-user",
    "roles": ["analyst"],
    "permissions": ["read", "graph_access"],
    "clearance_level": 2,
    "budget_remaining": 100.0,
    "rate_limit": 500,
    "requests_last_hour": 50,
    "location": "US"
  },
  "action": "conduct",
  "task": "analyze market trends",
  "expert": "LLM_LIGHT"
}
EOF
    
    local start_time=$(date +%s%N)
    
    # Run policy evaluation 100 times
    for i in {1..100}; do
        opa eval -d "$POLICY_DIR" -i "$temp_input" "data.conductor.security.allow" >/dev/null 2>&1
    done
    
    local end_time=$(date +%s%N)
    local duration_ms=$(((end_time - start_time) / 1000000))
    local avg_latency=$((duration_ms / 100))
    
    rm -f "$temp_input"
    
    if [ $avg_latency -lt 50 ]; then
        pass "Policy performance: ${avg_latency}ms average latency"
        return 0
    else
        warn "Policy performance: ${avg_latency}ms average latency (target: <50ms)"
        return 1
    fi
}

# Test policy coverage
test_policy_coverage() {
    say "Analyzing policy test coverage"
    
    # Count total rules
    local total_rules
    total_rules=$(grep -r "^[[:space:]]*[a-zA-Z_][a-zA-Z0-9_]*[[:space:]]*:=" "$POLICY_DIR"/*.rego | wc -l || echo "0")
    
    # Count test rules
    local test_rules
    test_rules=$(grep -r "^[[:space:]]*test_" "$POLICY_DIR"/*.rego | wc -l || echo "0")
    
    if [ "$total_rules" -gt 0 ]; then
        local coverage_percent=$((test_rules * 100 / total_rules))
        
        if [ $coverage_percent -ge 80 ]; then
            pass "Policy coverage: ${coverage_percent}% ($test_rules/$total_rules rules tested)"
            return 0
        else
            warn "Policy coverage: ${coverage_percent}% ($test_rules/$total_rules rules tested) - target: ≥80%"
            return 1
        fi
    else
        fail "Could not analyze policy coverage"
        return 1
    fi
}

# Generate coverage report
generate_coverage_report() {
    say "Generating policy coverage report"
    
    local report_file="policy-coverage-report.md"
    
    cat > "$report_file" << EOF
# Policy Test Coverage Report

Generated: $(date -u +"%Y-%m-%d %H:%M:%S UTC")

## Summary

EOF
    
    # Add OPA test results
    if opa test "$POLICY_DIR" --format json > /tmp/opa-results.json 2>/dev/null; then
        local total_tests passed_tests
        total_tests=$(jq '.tests | length' /tmp/opa-results.json 2>/dev/null || echo "0")
        passed_tests=$(jq '[.tests[] | select(.pass == true)] | length' /tmp/opa-results.json 2>/dev/null || echo "0")
        
        cat >> "$report_file" << EOF
- **OPA Unit Tests**: $passed_tests/$total_tests passed
- **Test Execution**: $([ $passed_tests -eq $total_tests ] && echo "✅ All tests pass" || echo "❌ Some tests failing")

## Test Results

| Test | Status | Package |
|------|--------|---------|
EOF
        
        jq -r '.tests[] | "| " + .name + " | " + (if .pass then "✅ Pass" else "❌ Fail" end) + " | " + .package + " |"' \
            /tmp/opa-results.json >> "$report_file" 2>/dev/null || true
        
        rm -f /tmp/opa-results.json
    fi
    
    cat >> "$report_file" << EOF

## Recommendations

- Ensure all policy rules have corresponding unit tests
- Add integration tests for complex policy combinations
- Consider property-based testing for edge cases
- Review test coverage regularly during policy updates

EOF
    
    pass "Coverage report generated: $report_file"
}

# Main test execution
main() {
    say "🧪 Policy Testing Pipeline"
    say "========================"
    
    check_prerequisites
    
    say "Test Execution"
    run_test "Policy syntax validation" test_policy_syntax
    run_test "OPA unit tests" test_opa_policies
    run_test "Conftest validation" test_conftest_validation
    run_test "Policy performance" test_policy_performance
    run_test "Policy coverage analysis" test_policy_coverage
    
    generate_coverage_report
    
    # Summary
    say "Test Results Summary"
    printf "Tests Run: %d\n" $TESTS_RUN
    printf "Passed: ${GREEN}%d${NC}\n" $TESTS_PASSED  
    printf "Failed: ${RED}%d${NC}\n" $TESTS_FAILED
    
    local success_rate=$((TESTS_PASSED * 100 / TESTS_RUN))
    printf "Success Rate: %d%%\n" $success_rate
    
    if [ $TESTS_FAILED -eq 0 ]; then
        say "🎉 All policy tests passed!"
        return 0
    else
        fail "Policy tests failed - review results before deployment"
        return 1
    fi
}

# Handle command line arguments
case "${1:-}" in
    --help)
        cat << EOF
Usage: $0 [options]

Options:
  --syntax-only    Only validate policy syntax
  --unit-only      Only run OPA unit tests
  --conftest-only  Only run Conftest validation
  --performance    Only run performance tests
  --help           Show this help

Environment Variables:
  POLICY_DIR=./server/src/conductor/security    Policy directory
  CONFTEST_DIR=./policy/conftest                Conftest policies
  DEPLOY_DIR=./deploy                           Deployment manifests
  TEST_DATA_DIR=./policy/test-data              Test data directory

Examples:
  # Run all tests
  ./scripts/test-policies.sh
  
  # Only validate syntax
  ./scripts/test-policies.sh --syntax-only
  
  # Only run unit tests
  ./scripts/test-policies.sh --unit-only

EOF
        exit 0
        ;;
    --syntax-only)
        test_policy_syntax
        ;;
    --unit-only)
        test_opa_policies
        ;;
    --conftest-only)
        test_conftest_validation
        ;;
    --performance)
        test_policy_performance
        ;;
    *)
        main
        ;;
esac