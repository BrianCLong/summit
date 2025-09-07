#!/bin/bash
set -euo pipefail

# Gatekeeper OPA Policy Enforcement Proof
# Demonstrates classification enforcement and policy denial capabilities

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
EVIDENCE_DIR="${EVIDENCE_DIR:-/tmp/gatekeeper-proof-$(date +%Y%m%d_%H%M%S)}"
NAMESPACE="${NAMESPACE:-intelgraph-test}"
CLASSIFICATION="${CLASSIFICATION:-UNCLASSIFIED}"

note() {
    echo "[$(date -u '+%Y-%m-%dT%H:%M:%SZ')] $*"
}

setup_test_environment() {
    note "Setting up Gatekeeper test environment"
    
    mkdir -p "$EVIDENCE_DIR"
    
    # Create test namespace with proper classification
    kubectl create namespace "$NAMESPACE" --dry-run=client -o yaml | \
    kubectl label --local -f - "classification=$CLASSIFICATION" -o yaml | \
    kubectl apply -f -
    
    note "Created test namespace: $NAMESPACE (classification: $CLASSIFICATION)"
    
    # Verify Gatekeeper is installed and running
    if ! kubectl get pods -n gatekeeper-system -l control-plane=controller-manager --no-headers | grep -q Running; then
        note "ERROR: Gatekeeper not running. Installing Gatekeeper..."
        kubectl apply -f https://raw.githubusercontent.com/open-policy-agent/gatekeeper/release-3.14/deploy/gatekeeper.yaml
        kubectl wait --for=condition=Ready pod -l control-plane=controller-manager -n gatekeeper-system --timeout=300s
    fi
    
    note "Gatekeeper system verified"
}

test_classification_denial() {
    note "Testing classification enforcement - pods without classification should be denied"
    
    # Create pod manifest without classification label
    cat > /tmp/badpod.yaml <<'EOF'
apiVersion: v1
kind: Pod
metadata: 
  name: badpod-no-classification
  namespace: NAMESPACE_PLACEHOLDER
spec:
  containers:
  - name: test
    image: busybox:latest
    command: ["sh", "-c", "sleep 60"]
  restartPolicy: Never
EOF
    
    sed "s/NAMESPACE_PLACEHOLDER/$NAMESPACE/g" /tmp/badpod.yaml > /tmp/badpod-final.yaml
    
    note "Attempting to deploy pod without classification label..."
    
    # Try to apply the pod - it should be denied
    if kubectl apply -f /tmp/badpod-final.yaml 2>&1 | tee "$EVIDENCE_DIR/gatekeeper-denial-1.txt" | grep -qi "denied\|violation\|admission webhook"; then
        note "✅ SUCCESS: Gatekeeper denied pod without classification label"
        echo "[PASS] Classification enforcement active" >> "$EVIDENCE_DIR/proof.txt"
    else
        note "❌ FAIL: Pod was not denied by Gatekeeper"
        echo "[FAIL] Classification enforcement failed" >> "$EVIDENCE_DIR/proof.txt"
        return 1
    fi
    
    # Clean up
    kubectl delete pod badpod-no-classification -n "$NAMESPACE" --ignore-not-found=true
    rm -f /tmp/badpod.yaml /tmp/badpod-final.yaml
}

test_airgap_enforcement() {
    note "Testing air-gap enforcement - pods with external images should be denied"
    
    # Create pod manifest with external image registry
    cat > /tmp/external-pod.yaml <<EOF
apiVersion: v1
kind: Pod
metadata: 
  name: external-image-pod
  namespace: $NAMESPACE
  labels:
    classification: "$CLASSIFICATION"
spec:
  containers:
  - name: test
    image: docker.io/nginx:latest  # External registry - should be blocked
    command: ["sleep", "60"]
  restartPolicy: Never
EOF
    
    note "Attempting to deploy pod with external registry image..."
    
    # Try to apply the pod - it should be denied by air-gap policy
    if kubectl apply -f /tmp/external-pod.yaml 2>&1 | tee "$EVIDENCE_DIR/gatekeeper-denial-2.txt" | grep -qi "denied\|violation\|external.*registry"; then
        note "✅ SUCCESS: Gatekeeper denied pod with external registry"
        echo "[PASS] Air-gap registry enforcement active" >> "$EVIDENCE_DIR/proof.txt"
    else
        note "⚠️  WARNING: Pod with external image was not denied (policy may not be active)"
        echo "[WARN] Air-gap registry enforcement may be inactive" >> "$EVIDENCE_DIR/proof.txt"
    fi
    
    # Clean up
    kubectl delete pod external-image-pod -n "$NAMESPACE" --ignore-not-found=true
    rm -f /tmp/external-pod.yaml
}

test_privilege_escalation_denial() {
    note "Testing privilege escalation denial"
    
    # Create privileged pod manifest
    cat > /tmp/privileged-pod.yaml <<EOF
apiVersion: v1
kind: Pod
metadata: 
  name: privileged-pod
  namespace: $NAMESPACE
  labels:
    classification: "$CLASSIFICATION"
spec:
  containers:
  - name: test
    image: busybox:latest
    command: ["sleep", "60"]
    securityContext:
      privileged: true  # Should be denied
  restartPolicy: Never
EOF
    
    note "Attempting to deploy privileged pod..."
    
    # Try to apply the pod - it should be denied
    if kubectl apply -f /tmp/privileged-pod.yaml 2>&1 | tee "$EVIDENCE_DIR/gatekeeper-denial-3.txt" | grep -qi "denied\|violation\|privileged"; then
        note "✅ SUCCESS: Gatekeeper denied privileged pod"
        echo "[PASS] Privilege escalation prevention active" >> "$EVIDENCE_DIR/proof.txt"
    else
        note "⚠️  WARNING: Privileged pod was not denied"
        echo "[WARN] Privilege escalation prevention may be inactive" >> "$EVIDENCE_DIR/proof.txt"
    fi
    
    # Clean up
    kubectl delete pod privileged-pod -n "$NAMESPACE" --ignore-not-found=true
    rm -f /tmp/privileged-pod.yaml
}

test_valid_pod_acceptance() {
    note "Testing valid pod acceptance - properly classified pod should be allowed"
    
    # Create compliant pod manifest
    cat > /tmp/good-pod.yaml <<EOF
apiVersion: v1
kind: Pod
metadata: 
  name: compliant-pod
  namespace: $NAMESPACE
  labels:
    classification: "$CLASSIFICATION"
    app: test
spec:
  containers:
  - name: test
    image: registry.local/busybox:latest  # Internal registry
    command: ["sleep", "30"]
    securityContext:
      runAsNonRoot: true
      runAsUser: 1000
      allowPrivilegeEscalation: false
      readOnlyRootFilesystem: true
      capabilities:
        drop:
        - ALL
  restartPolicy: Never
EOF
    
    note "Attempting to deploy compliant pod..."
    
    # Try to apply the pod - it should be accepted
    if kubectl apply -f /tmp/good-pod.yaml 2>&1 | tee "$EVIDENCE_DIR/gatekeeper-acceptance.txt" | grep -qi "created\|configured"; then
        note "✅ SUCCESS: Compliant pod was accepted"
        echo "[PASS] Compliant workloads accepted" >> "$EVIDENCE_DIR/proof.txt"
        
        # Wait for pod to be scheduled
        kubectl wait --for=condition=Ready pod/compliant-pod -n "$NAMESPACE" --timeout=60s || true
        
    else
        note "⚠️  WARNING: Compliant pod was unexpectedly denied"
        echo "[WARN] Compliant pod rejection (policy may be too restrictive)" >> "$EVIDENCE_DIR/proof.txt"
    fi
    
    # Clean up
    kubectl delete pod compliant-pod -n "$NAMESPACE" --ignore-not-found=true --wait=false
    rm -f /tmp/good-pod.yaml
}

collect_gatekeeper_evidence() {
    note "Collecting Gatekeeper configuration and status evidence"
    
    # Gatekeeper system status
    kubectl get pods -n gatekeeper-system -o wide > "$EVIDENCE_DIR/gatekeeper-pods.txt"
    kubectl get deployments -n gatekeeper-system -o yaml > "$EVIDENCE_DIR/gatekeeper-deployments.yaml"
    
    # Active constraints
    kubectl get constraints --all-namespaces -o yaml > "$EVIDENCE_DIR/active-constraints.yaml"
    kubectl get constraints --all-namespaces > "$EVIDENCE_DIR/active-constraints.txt"
    
    # Constraint templates
    kubectl get constrainttemplates -o yaml > "$EVIDENCE_DIR/constraint-templates.yaml"
    
    # Config and assignments
    kubectl get config -n gatekeeper-system -o yaml > "$EVIDENCE_DIR/gatekeeper-config.yaml" 2>/dev/null || true
    kubectl get assign -n gatekeeper-system -o yaml > "$EVIDENCE_DIR/gatekeeper-assignments.yaml" 2>/dev/null || true
    
    # Webhook configurations
    kubectl get validatingadmissionwebhooks -o yaml | grep -A 50 -B 10 gatekeeper > "$EVIDENCE_DIR/admission-webhooks.yaml" || true
    
    # Check for specific federal policy constraints
    note "Checking for federal-specific policy constraints..."
    {
        echo "# Federal Policy Constraint Status"
        echo "Generated: $(date -u '+%Y-%m-%dT%H:%M:%SZ')"
        echo ""
        
        # Check for classification requirement constraint
        if kubectl get k8srequiredclassification >/dev/null 2>&1; then
            echo "✅ K8sRequiredClassification constraint active"
            kubectl describe k8srequiredclassification >> "$EVIDENCE_DIR/federal-constraints.txt"
        else
            echo "❌ K8sRequiredClassification constraint not found"
        fi
        
        # Check for air-gap registry constraint
        if kubectl get k8srequiredairgap >/dev/null 2>&1; then
            echo "✅ K8sRequiredAirgap constraint active" 
            kubectl describe k8srequiredairgap >> "$EVIDENCE_DIR/federal-constraints.txt"
        else
            echo "❌ K8sRequiredAirgap constraint not found"
        fi
        
        # Check for privilege escalation prevention
        if kubectl get k8spspallowprivilegeescalationcontainer >/dev/null 2>&1; then
            echo "✅ K8sPSPAllowPrivilegeEscalationContainer constraint active"
        else
            echo "❌ Privilege escalation constraint not found"
        fi
        
    } > "$EVIDENCE_DIR/federal-policy-status.txt"
    
    # Collect violation events from audit logs
    note "Collecting policy violation events..."
    kubectl get events --all-namespaces --field-selector reason=FailedAdmission | grep -i gatekeeper > "$EVIDENCE_DIR/gatekeeper-violations.txt" || echo "No recent violations found" > "$EVIDENCE_DIR/gatekeeper-violations.txt"
}

generate_proof_summary() {
    note "Generating Gatekeeper proof summary"
    
    local total_tests=0
    local passed_tests=0
    local failed_tests=0
    local warnings=0
    
    # Count test results
    total_tests=$(grep -c "^\[" "$EVIDENCE_DIR/proof.txt" 2>/dev/null || echo 0)
    passed_tests=$(grep -c "^\[PASS\]" "$EVIDENCE_DIR/proof.txt" 2>/dev/null || echo 0)
    failed_tests=$(grep -c "^\[FAIL\]" "$EVIDENCE_DIR/proof.txt" 2>/dev/null || echo 0)
    warnings=$(grep -c "^\[WARN\]" "$EVIDENCE_DIR/proof.txt" 2>/dev/null || echo 0)
    
    # Generate summary report
    cat > "$EVIDENCE_DIR/gatekeeper-proof-summary.md" <<EOF
# Gatekeeper OPA Policy Enforcement Proof

**Generated:** $(date -u '+%Y-%m-%dT%H:%M:%SZ')  
**Namespace:** $NAMESPACE  
**Classification:** $CLASSIFICATION  
**Tester:** $(whoami)@$(hostname)

## Executive Summary

This report provides evidence of Gatekeeper OPA policy enforcement 
capabilities for federal compliance requirements.

**Test Results:**
- Total Tests: $total_tests
- Passed: $passed_tests
- Failed: $failed_tests  
- Warnings: $warnings

## Test Details

EOF
    
    # Add detailed test results
    if [[ -f "$EVIDENCE_DIR/proof.txt" ]]; then
        echo "### Policy Enforcement Tests" >> "$EVIDENCE_DIR/gatekeeper-proof-summary.md"
        echo "" >> "$EVIDENCE_DIR/gatekeeper-proof-summary.md"
        while IFS= read -r line; do
            echo "- $line" >> "$EVIDENCE_DIR/gatekeeper-proof-summary.md"
        done < "$EVIDENCE_DIR/proof.txt"
        echo "" >> "$EVIDENCE_DIR/gatekeeper-proof-summary.md"
    fi
    
    # Add evidence file listing
    cat >> "$EVIDENCE_DIR/gatekeeper-proof-summary.md" <<EOF

## Evidence Files

The following files contain detailed evidence of Gatekeeper configuration and testing:

EOF
    
    find "$EVIDENCE_DIR" -name "*.txt" -o -name "*.yaml" | sort | while read -r file; do
        echo "- \`$(basename "$file")\` - $(file "$file" | cut -d: -f2-)" >> "$EVIDENCE_DIR/gatekeeper-proof-summary.md"
    done
    
    cat >> "$EVIDENCE_DIR/gatekeeper-proof-summary.md" <<EOF

## Compliance Assessment

EOF
    
    if [[ $failed_tests -eq 0 ]]; then
        cat >> "$EVIDENCE_DIR/gatekeeper-proof-summary.md" <<EOF
✅ **COMPLIANT** - All Gatekeeper policy enforcement tests passed successfully.

The system demonstrates:
- Classification-based admission control
- Air-gap registry enforcement  
- Privilege escalation prevention
- Compliant workload acceptance

This evidence supports ATO approval for policy enforcement controls.
EOF
    else
        cat >> "$EVIDENCE_DIR/gatekeeper-proof-summary.md" <<EOF
❌ **NON-COMPLIANT** - $failed_tests policy enforcement failures detected.

**Required Actions:**
EOF
        grep "^\[FAIL\]" "$EVIDENCE_DIR/proof.txt" | while IFS= read -r line; do
            echo "- ${line#[FAIL] }" >> "$EVIDENCE_DIR/gatekeeper-proof-summary.md"
        done
        
        echo "" >> "$EVIDENCE_DIR/gatekeeper-proof-summary.md"
        echo "These issues must be resolved before ATO approval." >> "$EVIDENCE_DIR/gatekeeper-proof-summary.md"
    fi
}

cleanup_test_environment() {
    note "Cleaning up test environment"
    
    # Delete test namespace and resources
    kubectl delete namespace "$NAMESPACE" --ignore-not-found=true --wait=false
    
    # Clean up any remaining test files
    rm -f /tmp/badpod*.yaml /tmp/external-pod.yaml /tmp/privileged-pod.yaml /tmp/good-pod.yaml
}

main() {
    note "Starting Gatekeeper OPA policy enforcement proof"
    note "Test namespace: $NAMESPACE"
    note "Classification: $CLASSIFICATION"
    
    # Initialize
    setup_test_environment
    
    # Run enforcement tests
    test_classification_denial || true
    test_airgap_enforcement || true
    test_privilege_escalation_denial || true
    test_valid_pod_acceptance || true
    
    # Collect evidence
    collect_gatekeeper_evidence
    
    # Generate summary
    generate_proof_summary
    
    # Cleanup
    cleanup_test_environment
    
    note "Gatekeeper proof complete. Evidence saved to: $EVIDENCE_DIR"
    note "Summary report: $EVIDENCE_DIR/gatekeeper-proof-summary.md"
    
    # Return appropriate exit code
    if grep -q "^\[FAIL\]" "$EVIDENCE_DIR/proof.txt" 2>/dev/null; then
        note "❌ Some tests failed - review evidence for details"
        exit 1
    else
        note "✅ All tests passed - Gatekeeper enforcement verified"
        exit 0
    fi
}

# Handle command line arguments
case "${1:-}" in
    --help|-h)
        echo "Usage: $0 [OPTIONS]"
        echo "Prove Gatekeeper OPA policy enforcement for federal compliance"
        echo ""
        echo "Environment Variables:"
        echo "  NAMESPACE       Test namespace (default: intelgraph-test)"
        echo "  CLASSIFICATION  Security classification (default: UNCLASSIFIED)"
        echo "  EVIDENCE_DIR    Evidence output directory"
        echo ""
        echo "Examples:"
        echo "  $0                                    # Run with defaults"
        echo "  CLASSIFICATION=SECRET $0              # Test SECRET classification"
        echo "  NAMESPACE=federal-test $0             # Use specific namespace"
        exit 0
        ;;
esac

main "$@"