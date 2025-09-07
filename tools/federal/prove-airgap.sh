#!/bin/bash
set -euo pipefail

# Air-gap compliance verification script
# Produces evidence artifacts for ATO/eMASS submission

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
EVIDENCE_DIR="${EVIDENCE_DIR:-/tmp/airgap-evidence-$(date +%Y%m%d_%H%M%S)}"
NAMESPACE="${NAMESPACE:-intelgraph}"
CLASSIFICATION="${CLASSIFICATION:-UNCLASSIFIED}"

fails=0
total_tests=0

note() {
    echo "[$(date -Iseconds)] $*"
}

test_result() {
    local test_name="$1"
    local result="$2"
    local details="$3"
    
    total_tests=$((total_tests + 1))
    
    if [ "$result" = "PASS" ]; then
        echo "✅ $test_name: PASS - $details"
    else
        echo "❌ $test_name: FAIL - $details"
        fails=$((fails + 1))
    fi
    
    # Log to evidence file
    echo "{\"timestamp\":\"$(date -Iseconds)\",\"test\":\"$test_name\",\"result\":\"$result\",\"details\":\"$details\",\"classification\":\"$CLASSIFICATION\"}" >> "$EVIDENCE_DIR/test-results.jsonl"
}

setup_evidence_collection() {
    note "Setting up evidence collection directory: $EVIDENCE_DIR"
    mkdir -p "$EVIDENCE_DIR"
    
    # Create evidence manifest
    cat > "$EVIDENCE_DIR/manifest.json" <<EOF
{
  "evidence_type": "air_gap_compliance",
  "classification": "$CLASSIFICATION",
  "generated_at": "$(date -Iseconds)",
  "generated_by": "$(whoami)@$(hostname)",
  "namespace": "$NAMESPACE",
  "tests": []
}
EOF
    
    # Initialize test results log
    echo "" > "$EVIDENCE_DIR/test-results.jsonl"
}

test_dns_isolation() {
    note "Testing DNS resolution to external domains (should fail)"
    
    local external_domains=("google.com" "github.com" "registry.npmjs.org" "docker.io")
    local dns_failures=0
    
    for domain in "${external_domains[@]}"; do
        if timeout 5 getent hosts "$domain" >/dev/null 2>&1; then
            test_result "DNS_ISOLATION_${domain^^}" "FAIL" "External DNS resolution succeeded unexpectedly"
            echo "$domain resolved successfully" >> "$EVIDENCE_DIR/dns-leaks.txt"
        else
            dns_failures=$((dns_failures + 1))
        fi
    done
    
    if [ $dns_failures -eq ${#external_domains[@]} ]; then
        test_result "DNS_ISOLATION" "PASS" "All external DNS lookups properly blocked ($dns_failures/${#external_domains[@]})"
    else
        test_result "DNS_ISOLATION" "FAIL" "Some external DNS lookups succeeded ($(( ${#external_domains[@]} - dns_failures ))/${#external_domains[@]})"
    fi
}

test_outbound_tcp_blocking() {
    note "Testing outbound TCP connections (should be blocked)"
    
    local external_ips=("1.1.1.1:443" "8.8.8.8:53" "208.67.222.222:443")
    local tcp_blocks=0
    
    for endpoint in "${external_ips[@]}"; do
        if timeout 3 bash -c "cat < /dev/tcp/$endpoint" >/dev/null 2>&1; then
            test_result "TCP_BLOCKING_${endpoint//[:.]/_}" "FAIL" "Outbound TCP connection succeeded"
            echo "$endpoint connection succeeded" >> "$EVIDENCE_DIR/tcp-leaks.txt"
        else
            tcp_blocks=$((tcp_blocks + 1))
        fi
    done
    
    if [ $tcp_blocks -eq ${#external_ips[@]} ]; then
        test_result "TCP_BLOCKING" "PASS" "All outbound TCP connections properly blocked ($tcp_blocks/${#external_ips[@]})"
    else
        test_result "TCP_BLOCKING" "FAIL" "Some outbound TCP connections succeeded ($(( ${#external_ips[@]} - tcp_blocks ))/${#external_ips[@]})"
    fi
}

test_kubernetes_network_policies() {
    note "Verifying Kubernetes NetworkPolicies are enforced"
    
    # Check that default-deny egress policy exists
    if kubectl get networkpolicy deny-all-egress -n "$NAMESPACE" >/dev/null 2>&1; then
        test_result "NETPOL_DENY_EGRESS" "PASS" "Default deny-all-egress NetworkPolicy exists"
        kubectl get networkpolicy deny-all-egress -n "$NAMESPACE" -o yaml > "$EVIDENCE_DIR/deny-all-egress.yaml"
    else
        test_result "NETPOL_DENY_EGRESS" "FAIL" "Default deny-all-egress NetworkPolicy not found"
    fi
    
    # Check air-gap specific policies
    if kubectl get networkpolicy airgap-monitor-policy -n "$NAMESPACE" >/dev/null 2>&1; then
        test_result "NETPOL_AIRGAP_MONITOR" "PASS" "Air-gap monitor NetworkPolicy exists"
        kubectl get networkpolicy airgap-monitor-policy -n "$NAMESPACE" -o yaml > "$EVIDENCE_DIR/airgap-monitor-policy.yaml"
    else
        test_result "NETPOL_AIRGAP_MONITOR" "FAIL" "Air-gap monitor NetworkPolicy not found"
    fi
    
    # Export all NetworkPolicies for evidence
    kubectl get networkpolicies -n "$NAMESPACE" -o yaml > "$EVIDENCE_DIR/all-networkpolicies.yaml"
}

test_gatekeeper_constraints() {
    note "Verifying Gatekeeper OPA constraints are active"
    
    local constraints=("k8sclassificationaffinity" "k8sairgapenforcement" "k8sfipsvalidation")
    local active_constraints=0
    
    for constraint in "${constraints[@]}"; do
        if kubectl get constrainttemplate "$constraint" >/dev/null 2>&1; then
            active_constraints=$((active_constraints + 1))
            kubectl get constrainttemplate "$constraint" -o yaml > "$EVIDENCE_DIR/constraint-${constraint}.yaml"
        fi
    done
    
    if [ $active_constraints -eq ${#constraints[@]} ]; then
        test_result "GATEKEEPER_CONSTRAINTS" "PASS" "All required Gatekeeper constraints active ($active_constraints/${#constraints[@]})"
    else
        test_result "GATEKEEPER_CONSTRAINTS" "FAIL" "Missing Gatekeeper constraints ($(( ${#constraints[@]} - active_constraints ))/${#constraints[@]})"
    fi
    
    # Get constraint statuses
    kubectl get constraints -o yaml > "$EVIDENCE_DIR/constraint-statuses.yaml" 2>/dev/null || true
}

test_pod_scheduling_compliance() {
    note "Verifying pods are scheduled with proper classification controls"
    
    # Check federal pods have classification labels
    local federal_pods
    federal_pods=$(kubectl get pods -n "$NAMESPACE" -l deployment=federal -o name 2>/dev/null | wc -l)
    
    if [ "$federal_pods" -gt 0 ]; then
        # Check classification labels
        local properly_labeled=0
        while IFS= read -r pod; do
            if kubectl get "$pod" -n "$NAMESPACE" -o jsonpath='{.metadata.labels.security\.intelgraph\.io/classification}' | grep -q "$CLASSIFICATION"; then
                properly_labeled=$((properly_labeled + 1))
            fi
        done < <(kubectl get pods -n "$NAMESPACE" -l deployment=federal -o name 2>/dev/null)
        
        if [ $properly_labeled -eq "$federal_pods" ]; then
            test_result "POD_CLASSIFICATION" "PASS" "All federal pods properly classified ($properly_labeled/$federal_pods)"
        else
            test_result "POD_CLASSIFICATION" "FAIL" "Some federal pods missing classification labels ($(( federal_pods - properly_labeled ))/$federal_pods)"
        fi
    else
        test_result "POD_CLASSIFICATION" "FAIL" "No federal pods found for testing"
    fi
    
    # Export pod details for evidence
    kubectl get pods -n "$NAMESPACE" -o yaml > "$EVIDENCE_DIR/pods-deployment.yaml"
}

test_offline_registry_integrity() {
    note "Verifying offline registry integrity"
    
    # Test if conductor-federal pod has offline registry mounted
    local conductor_pod
    conductor_pod=$(kubectl get pods -n "$NAMESPACE" -l app=conductor,deployment=federal -o name 2>/dev/null | head -n1 | cut -d'/' -f2)
    
    if [ -n "$conductor_pod" ]; then
        # Check registry mount
        if kubectl exec -n "$NAMESPACE" "$conductor_pod" -- test -d /opt/intelgraph/registry; then
            test_result "OFFLINE_REGISTRY_MOUNT" "PASS" "Offline registry directory accessible"
            
            # Check registry index
            if kubectl exec -n "$NAMESPACE" "$conductor_pod" -- test -f /opt/intelgraph/registry/index.json; then
                test_result "OFFLINE_REGISTRY_INDEX" "PASS" "Registry index file exists"
                kubectl exec -n "$NAMESPACE" "$conductor_pod" -- cat /opt/intelgraph/registry/index.json > "$EVIDENCE_DIR/registry-index.json"
            else
                test_result "OFFLINE_REGISTRY_INDEX" "FAIL" "Registry index file missing"
            fi
        else
            test_result "OFFLINE_REGISTRY_MOUNT" "FAIL" "Offline registry directory not accessible"
        fi
    else
        test_result "OFFLINE_REGISTRY_MOUNT" "FAIL" "No federal conductor pod found for testing"
    fi
}

test_fips_enforcement() {
    note "Verifying FIPS compliance enforcement"
    
    # Check HSM availability through health endpoint
    local conductor_svc="conductor-federal.$NAMESPACE.svc.cluster.local"
    
    # Use kubectl port-forward for testing (in production, this would be internal service call)
    kubectl port-forward -n "$NAMESPACE" svc/conductor-federal 8080:8000 &
    local pf_pid=$!
    sleep 3
    
    if curl -k -s --max-time 10 "https://localhost:8080/api/federal/health" > "$EVIDENCE_DIR/federal-health.json"; then
        if grep -q '"fipsEnabled":true' "$EVIDENCE_DIR/federal-health.json"; then
            test_result "FIPS_ENFORCEMENT" "PASS" "FIPS compliance active according to health endpoint"
        else
            test_result "FIPS_ENFORCEMENT" "FAIL" "FIPS compliance not active"
        fi
    else
        test_result "FIPS_ENFORCEMENT" "FAIL" "Unable to reach federal health endpoint"
    fi
    
    kill $pf_pid 2>/dev/null || true
    wait $pf_pid 2>/dev/null || true
}

test_worm_audit_compliance() {
    note "Verifying WORM audit storage compliance"
    
    # Check audit storage PVC exists
    if kubectl get pvc federal-audit-storage -n "$NAMESPACE" >/dev/null 2>&1; then
        test_result "WORM_PVC" "PASS" "Federal audit storage PVC exists"
        kubectl get pvc federal-audit-storage -n "$NAMESPACE" -o yaml > "$EVIDENCE_DIR/audit-pvc.yaml"
    else
        test_result "WORM_PVC" "FAIL" "Federal audit storage PVC not found"
    fi
    
    # Test compliance endpoint
    kubectl port-forward -n "$NAMESPACE" svc/conductor-federal 8080:8000 &
    local pf_pid=$!
    sleep 3
    
    if curl -k -s --max-time 10 "https://localhost:8080/api/federal/compliance-status" > "$EVIDENCE_DIR/compliance-status.json"; then
        if grep -q '"fipsEnabled":true' "$EVIDENCE_DIR/compliance-status.json"; then
            test_result "WORM_COMPLIANCE" "PASS" "WORM compliance endpoint accessible"
        else
            test_result "WORM_COMPLIANCE" "FAIL" "WORM compliance data incomplete"
        fi
    else
        test_result "WORM_COMPLIANCE" "FAIL" "Unable to reach compliance status endpoint"
    fi
    
    kill $pf_pid 2>/dev/null || true
    wait $pf_pid 2>/dev/null || true
}

test_break_glass_controls() {
    note "Verifying break-glass controls are in place"
    
    # Check break-glass storage
    if kubectl get pvc break-glass-storage -n "$NAMESPACE" >/dev/null 2>&1; then
        test_result "BREAKGLASS_STORAGE" "PASS" "Break-glass storage PVC exists"
        kubectl get pvc break-glass-storage -n "$NAMESPACE" -o yaml > "$EVIDENCE_DIR/breakglass-pvc.yaml"
    else
        test_result "BREAKGLASS_STORAGE" "FAIL" "Break-glass storage PVC not found"
    fi
    
    # Verify no active break-glass sessions (should be 0 in normal operation)
    kubectl port-forward -n "$NAMESPACE" svc/conductor-federal 8080:8000 &
    local pf_pid=$!
    sleep 3
    
    if curl -k -s --max-time 10 "https://localhost:8080/api/federal/health" > "$EVIDENCE_DIR/breakglass-status.json"; then
        local active_sessions
        active_sessions=$(jq -r '.airGap.activeBreakGlass // 0' "$EVIDENCE_DIR/breakglass-status.json")
        
        if [ "$active_sessions" = "0" ]; then
            test_result "BREAKGLASS_SESSIONS" "PASS" "No unauthorized break-glass sessions active"
        else
            test_result "BREAKGLASS_SESSIONS" "FAIL" "$active_sessions active break-glass sessions detected"
        fi
    else
        test_result "BREAKGLASS_SESSIONS" "FAIL" "Unable to check break-glass session status"
    fi
    
    kill $pf_pid 2>/dev/null || true
    wait $pf_pid 2>/dev/null || true
}

collect_system_evidence() {
    note "Collecting system evidence for ATO submission"
    
    # Node information
    kubectl get nodes -o yaml > "$EVIDENCE_DIR/nodes.yaml"
    kubectl get nodes -o wide > "$EVIDENCE_DIR/nodes.txt"
    
    # Security contexts
    kubectl get podsecuritypolicies -o yaml > "$EVIDENCE_DIR/pod-security-policies.yaml" 2>/dev/null || true
    
    # Service accounts and RBAC
    kubectl get serviceaccounts -n "$NAMESPACE" -o yaml > "$EVIDENCE_DIR/service-accounts.yaml"
    kubectl get roles,rolebindings -n "$NAMESPACE" -o yaml > "$EVIDENCE_DIR/rbac.yaml"
    
    # Storage classes and volumes
    kubectl get storageclasses -o yaml > "$EVIDENCE_DIR/storage-classes.yaml"
    kubectl get pv,pvc -n "$NAMESPACE" -o yaml > "$EVIDENCE_DIR/volumes.yaml"
    
    # Generate resource inventory
    {
        echo "# Air-Gap Environment Resource Inventory"
        echo "Generated: $(date -Iseconds)"
        echo "Classification: $CLASSIFICATION"
        echo "Namespace: $NAMESPACE"
        echo ""
        echo "## Pods"
        kubectl get pods -n "$NAMESPACE" -o wide
        echo ""
        echo "## Services"
        kubectl get services -n "$NAMESPACE" -o wide
        echo ""
        echo "## ConfigMaps"
        kubectl get configmaps -n "$NAMESPACE"
        echo ""
        echo "## Secrets"
        kubectl get secrets -n "$NAMESPACE"
    } > "$EVIDENCE_DIR/resource-inventory.md"
}

generate_evidence_report() {
    note "Generating final evidence report"
    
    local pass_count=$((total_tests - fails))
    local pass_rate=$(( (pass_count * 100) / total_tests ))
    
    # Update manifest with results
    jq --arg total "$total_tests" \
       --arg passes "$pass_count" \
       --arg fails "$fails" \
       --arg rate "$pass_rate" \
       '.summary = {
         "total_tests": ($total | tonumber),
         "passed": ($passes | tonumber), 
         "failed": ($fails | tonumber),
         "pass_rate": ($rate | tonumber)
       }' "$EVIDENCE_DIR/manifest.json" > "$EVIDENCE_DIR/manifest.tmp" && \
       mv "$EVIDENCE_DIR/manifest.tmp" "$EVIDENCE_DIR/manifest.json"
    
    # Generate compliance report
    {
        echo "# Air-Gap Compliance Verification Report"
        echo ""
        echo "**Classification:** $CLASSIFICATION"
        echo "**Test Date:** $(date -Iseconds)"
        echo "**Namespace:** $NAMESPACE"
        echo "**Tester:** $(whoami)@$(hostname)"
        echo ""
        echo "## Executive Summary"
        echo ""
        echo "- **Total Tests:** $total_tests"
        echo "- **Passed:** $pass_count"
        echo "- **Failed:** $fails"
        echo "- **Pass Rate:** $pass_rate%"
        echo ""
        if [ $fails -eq 0 ]; then
            echo "✅ **RESULT: COMPLIANT** - All air-gap controls verified"
        else
            echo "❌ **RESULT: NON-COMPLIANT** - $fails control failures detected"
        fi
        echo ""
        echo "## Test Results"
        echo ""
        
        # Parse test results into markdown table
        {
            echo "| Test | Result | Details |"
            echo "|------|--------|---------|"
            while IFS= read -r line; do
                if [ -n "$line" ]; then
                    local test result details
                    test=$(echo "$line" | jq -r '.test')
                    result=$(echo "$line" | jq -r '.result')
                    details=$(echo "$line" | jq -r '.details')
                    echo "| $test | $result | $details |"
                fi
            done < "$EVIDENCE_DIR/test-results.jsonl"
        }
        echo ""
        echo "## Evidence Files"
        echo ""
        find "$EVIDENCE_DIR" -type f -name "*.yaml" -o -name "*.json" -o -name "*.txt" | while read -r file; do
            echo "- $(basename "$file")"
        done
        echo ""
        echo "## Recommendations"
        echo ""
        if [ $fails -gt 0 ]; then
            echo "The following issues must be resolved before ATO approval:"
            echo ""
            grep '"result":"FAIL"' "$EVIDENCE_DIR/test-results.jsonl" | while IFS= read -r line; do
                local test details
                test=$(echo "$line" | jq -r '.test')
                details=$(echo "$line" | jq -r '.details')
                echo "- **$test:** $details"
            done
        else
            echo "All air-gap compliance controls verified. System ready for ATO approval."
        fi
        
    } > "$EVIDENCE_DIR/compliance-report.md"
    
    # Create evidence bundle checksum
    find "$EVIDENCE_DIR" -type f ! -name "*.sha256" -exec sha256sum {} \; > "$EVIDENCE_DIR/evidence-checksums.sha256"
}

main() {
    note "Starting air-gap compliance verification for $CLASSIFICATION environment"
    note "Target namespace: $NAMESPACE"
    
    setup_evidence_collection
    
    # Run all compliance tests
    test_dns_isolation
    test_outbound_tcp_blocking
    test_kubernetes_network_policies
    test_gatekeeper_constraints
    test_pod_scheduling_compliance
    test_offline_registry_integrity
    test_fips_enforcement
    test_worm_audit_compliance
    test_break_glass_controls
    
    # Collect supporting evidence
    collect_system_evidence
    
    # Generate final report
    generate_evidence_report
    
    note "Evidence collection complete: $EVIDENCE_DIR"
    note "Compliance report: $EVIDENCE_DIR/compliance-report.md"
    
    if [ $fails -eq 0 ]; then
        note "🎉 AIRGAP_PROOF_PASS - All $total_tests tests passed"
        echo "AIRGAP_PROOF_PASS"
        exit 0
    else
        note "❌ AIRGAP_PROOF_FAIL - $fails/$total_tests tests failed"
        echo "AIRGAP_PROOF_FAIL count=$fails"
        exit 1
    fi
}

# Handle command line arguments
case "${1:-run}" in
    "help"|"-h"|"--help")
        echo "Usage: $0 [run|help]"
        echo ""
        echo "Environment Variables:"
        echo "  NAMESPACE - Kubernetes namespace (default: intelgraph)"
        echo "  CLASSIFICATION - Security classification (default: UNCLASSIFIED)"
        echo "  EVIDENCE_DIR - Output directory for evidence (default: /tmp/airgap-evidence-*)"
        echo ""
        echo "Examples:"
        echo "  $0                                    # Run all tests with defaults"
        echo "  NAMESPACE=federal $0                  # Test 'federal' namespace"
        echo "  CLASSIFICATION=SECRET $0              # Test SECRET classification level"
        exit 0
        ;;
    "run"|*)
        main
        ;;
esac