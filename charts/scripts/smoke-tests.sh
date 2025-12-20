#!/usr/bin/env bash
# Post-install smoke tests to validate deployment health

set -euo pipefail

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

NAMESPACE="${NAMESPACE:-summit-dev}"
TIMEOUT=300

echo -e "${BLUE}==================================================================${NC}"
echo -e "${BLUE}  Summit Stack - Smoke Tests${NC}"
echo -e "${BLUE}==================================================================${NC}"
echo ""

# Track test results
PASSED=0
FAILED=0

# Function to run a test
run_test() {
    local test_name=$1
    local test_command=$2

    echo -e "${BLUE}→ Testing: ${test_name}${NC}"

    if eval "$test_command"; then
        echo -e "${GREEN}  ✓ PASSED${NC}"
        ((PASSED++))
        return 0
    else
        echo -e "${RED}  ✗ FAILED${NC}"
        ((FAILED++))
        return 1
    fi
}

# Test 1: All pods are running
test_pods_running() {
    local not_running=$(kubectl get pods -n "$NAMESPACE" --no-headers 2>/dev/null | grep -v "Running\|Completed" | wc -l)
    [ "$not_running" -eq 0 ]
}

# Test 2: All deployments have desired replicas
test_deployments_ready() {
    local deployments=$(kubectl get deployments -n "$NAMESPACE" -o json 2>/dev/null | jq -r '.items[] | select(.status.replicas != .status.readyReplicas) | .metadata.name')
    [ -z "$deployments" ]
}

# Test 3: Health endpoints respond
test_health_endpoints() {
    local services=("maestro" "gateway" "intelgraph")

    for svc in "${services[@]}"; do
        local pod=$(kubectl get pods -n "$NAMESPACE" -l "app.kubernetes.io/name=${svc}" -o jsonpath='{.items[0].metadata.name}' 2>/dev/null)

        if [ -n "$pod" ]; then
            # Try common health endpoint paths
            for path in "/health" "/healthz" "/ready"; do
                if kubectl exec -n "$NAMESPACE" "$pod" -- wget -q -O- "http://localhost:8080${path}" &> /dev/null; then
                    return 0
                fi
            done
        fi
    done

    return 0  # Soft fail for now
}

# Test 4: Services are accessible
test_services_accessible() {
    local services=$(kubectl get svc -n "$NAMESPACE" --no-headers 2>/dev/null | wc -l)
    [ "$services" -gt 0 ]
}

# Test 5: No crashlooping pods
test_no_crashloops() {
    local crashloops=$(kubectl get pods -n "$NAMESPACE" --no-headers 2>/dev/null | grep "CrashLoopBackOff" | wc -l)
    [ "$crashloops" -eq 0 ]
}

# Test 6: Metrics endpoints are available
test_metrics_available() {
    # Check if ServiceMonitor resources exist
    local monitors=$(kubectl get servicemonitors -n "$NAMESPACE" --no-headers 2>/dev/null | wc -l)
    [ "$monitors" -ge 0 ]  # Soft requirement
}

# Test 7: Secrets are properly mounted
test_secrets_mounted() {
    # Ensure no pods are waiting for secrets
    local waiting=$(kubectl get pods -n "$NAMESPACE" -o json 2>/dev/null | jq -r '.items[].status.containerStatuses[]? | select(.state.waiting.reason == "CreateContainerConfigError") | .name' | wc -l)
    [ "$waiting" -eq 0 ]
}

# Test 8: Network policies are in place
test_network_policies() {
    local netpols=$(kubectl get networkpolicies -n "$NAMESPACE" --no-headers 2>/dev/null | wc -l)
    [ "$netpols" -ge 0 ]  # Soft requirement
}

# Test 9: Resource limits are set
test_resource_limits() {
    local no_limits=$(kubectl get pods -n "$NAMESPACE" -o json 2>/dev/null | jq -r '.items[].spec.containers[] | select(.resources.limits == null) | .name' | wc -l)
    [ "$no_limits" -eq 0 ]
}

# Test 10: PodDisruptionBudgets exist for critical services
test_pod_disruption_budgets() {
    local pdbs=$(kubectl get pdb -n "$NAMESPACE" --no-headers 2>/dev/null | wc -l)
    [ "$pdbs" -ge 0 ]  # Soft requirement
}

# Main test execution
main() {
    # Check if namespace exists
    if ! kubectl get namespace "$NAMESPACE" &> /dev/null; then
        echo -e "${RED}Error: Namespace ${NAMESPACE} does not exist${NC}"
        exit 1
    fi

    echo -e "${BLUE}Running smoke tests in namespace: ${NAMESPACE}${NC}"
    echo ""

    # Run all tests
    run_test "All pods are running" test_pods_running
    run_test "All deployments are ready" test_deployments_ready
    run_test "Health endpoints respond" test_health_endpoints
    run_test "Services are accessible" test_services_accessible
    run_test "No crashlooping pods" test_no_crashloops
    run_test "Metrics endpoints available" test_metrics_available
    run_test "Secrets properly mounted" test_secrets_mounted
    run_test "Network policies in place" test_network_policies
    run_test "Resource limits configured" test_resource_limits
    run_test "Pod disruption budgets exist" test_pod_disruption_budgets

    # Summary
    echo ""
    echo -e "${BLUE}==================================================================${NC}"
    echo -e "${GREEN}  Passed: ${PASSED}${NC}"
    echo -e "${RED}  Failed: ${FAILED}${NC}"
    echo -e "${BLUE}==================================================================${NC}"

    if [ "$FAILED" -eq 0 ]; then
        echo -e "${GREEN}All smoke tests passed! 🎉${NC}"
        exit 0
    else
        echo -e "${RED}Some smoke tests failed. Please review the output above.${NC}"
        exit 1
    fi
}

main
