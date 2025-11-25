#!/usr/bin/env bash
# Policy Linting Tool
# Validates zero-trust policies for correctness and best practices

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(dirname "$SCRIPT_DIR")"
POLICIES_DIR="$ROOT_DIR/policies"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Counters
ERRORS=0
WARNINGS=0
PASSED=0

log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[PASS]${NC} $1"
    ((PASSED++))
}

log_warning() {
    echo -e "${YELLOW}[WARN]${NC} $1"
    ((WARNINGS++))
}

log_error() {
    echo -e "${RED}[FAIL]${NC} $1"
    ((ERRORS++))
}

#############################################
# KUBERNETES NETWORK POLICY LINTING
#############################################

lint_network_policies() {
    log_info "Linting Kubernetes NetworkPolicies..."

    # Find all network policy files
    network_policy_files=$(find "$POLICIES_DIR/network" -name "*.yaml" -o -name "*.yml" 2>/dev/null || true)

    if [[ -z "$network_policy_files" ]]; then
        log_warning "No network policy files found"
        return
    fi

    for file in $network_policy_files; do
        log_info "Checking: $file"

        # Check YAML syntax
        if ! yq eval '.' "$file" > /dev/null 2>&1; then
            log_error "Invalid YAML syntax: $file"
            continue
        fi

        # Check for required labels
        if ! yq eval '.metadata.labels' "$file" | grep -q "app.kubernetes.io/name"; then
            log_warning "Missing app.kubernetes.io/name label: $file"
        fi

        # Check for namespace
        if ! yq eval '.metadata.namespace' "$file" | grep -qv "null"; then
            log_error "Missing namespace in metadata: $file"
        fi

        # Check for podSelector
        if yq eval '.spec.podSelector' "$file" | grep -q "null"; then
            log_warning "Empty podSelector (matches all pods): $file"
        fi

        # Check for both Ingress and Egress policy types
        policy_types=$(yq eval '.spec.policyTypes[]' "$file" 2>/dev/null || echo "")
        if [[ ! "$policy_types" =~ "Ingress" ]] && [[ ! "$policy_types" =~ "Egress" ]]; then
            log_warning "No policyTypes specified (defaults to Ingress only): $file"
        fi

        # Check for overly permissive rules
        if yq eval '.spec.egress[].to[]' "$file" 2>/dev/null | grep -q "{}"; then
            log_warning "Overly permissive egress rule (allows all): $file"
        fi

        if yq eval '.spec.ingress[].from[]' "$file" 2>/dev/null | grep -q "{}"; then
            log_warning "Overly permissive ingress rule (allows all): $file"
        fi

        log_success "NetworkPolicy validated: $file"
    done
}

#############################################
# OPA REGO POLICY LINTING
#############################################

lint_opa_policies() {
    log_info "Linting OPA/Rego policies..."

    # Find all rego files
    rego_files=$(find "$POLICIES_DIR/opa" -name "*.rego" ! -name "*_test.rego" 2>/dev/null || true)

    if [[ -z "$rego_files" ]]; then
        log_warning "No Rego policy files found"
        return
    fi

    # Check if OPA is installed
    if ! command -v opa &> /dev/null; then
        log_warning "OPA not installed, skipping Rego linting"
        return
    fi

    for file in $rego_files; do
        log_info "Checking: $file"

        # Check Rego syntax
        if ! opa check "$file" 2>/dev/null; then
            log_error "Invalid Rego syntax: $file"
            continue
        fi

        # Check for default deny rule
        if ! grep -q "default allow := false" "$file"; then
            log_warning "Missing 'default allow := false' rule: $file"
        fi

        # Check for package declaration
        if ! grep -q "^package " "$file"; then
            log_error "Missing package declaration: $file"
        fi

        # Check for import rego.v1
        if ! grep -q "import rego.v1" "$file"; then
            log_warning "Not using rego.v1 (recommended for future compatibility): $file"
        fi

        log_success "Rego policy validated: $file"
    done

    # Run OPA tests
    log_info "Running OPA policy tests..."
    test_files=$(find "$POLICIES_DIR/opa/tests" -name "*_test.rego" 2>/dev/null || true)

    if [[ -n "$test_files" ]]; then
        if opa test "$POLICIES_DIR/opa" -v; then
            log_success "All OPA tests passed"
        else
            log_error "OPA tests failed"
        fi
    else
        log_warning "No OPA test files found"
    fi
}

#############################################
# ISTIO POLICY LINTING
#############################################

lint_istio_policies() {
    log_info "Linting Istio policies..."

    # Find all Istio policy files
    istio_files=$(find "$POLICIES_DIR/istio" -name "*.yaml" -o -name "*.yml" 2>/dev/null || true)

    if [[ -z "$istio_files" ]]; then
        log_warning "No Istio policy files found"
        return
    fi

    for file in $istio_files; do
        log_info "Checking: $file"

        # Check YAML syntax
        if ! yq eval '.' "$file" > /dev/null 2>&1; then
            log_error "Invalid YAML syntax: $file"
            continue
        fi

        # Check for PeerAuthentication policies
        kind=$(yq eval '.kind' "$file")

        case $kind in
            "PeerAuthentication")
                # Check for STRICT mode
                mode=$(yq eval '.spec.mtls.mode' "$file")
                if [[ "$mode" != "STRICT" ]]; then
                    log_warning "PeerAuthentication not using STRICT mode: $file"
                fi
                ;;
            "AuthorizationPolicy")
                # Check for empty rules (allows all)
                rules=$(yq eval '.spec.rules' "$file")
                if [[ "$rules" == "null" ]]; then
                    log_warning "AuthorizationPolicy with no rules (denies all): $file"
                fi
                ;;
            "DestinationRule")
                # Check for mTLS configuration
                tls_mode=$(yq eval '.spec.trafficPolicy.tls.mode' "$file")
                if [[ "$tls_mode" != "ISTIO_MUTUAL" ]]; then
                    log_warning "DestinationRule not using ISTIO_MUTUAL: $file"
                fi
                ;;
        esac

        log_success "Istio policy validated: $file"
    done
}

#############################################
# SPIRE ENTRY LINTING
#############################################

lint_spire_entries() {
    log_info "Linting SPIRE entries..."

    entry_files=$(find "$ROOT_DIR/identity/spire/entries" -name "*.yaml" -o -name "*.yml" 2>/dev/null || true)

    if [[ -z "$entry_files" ]]; then
        log_warning "No SPIRE entry files found"
        return
    fi

    for file in $entry_files; do
        log_info "Checking: $file"

        # Check YAML syntax
        if ! yq eval '.' "$file" > /dev/null 2>&1; then
            log_error "Invalid YAML syntax: $file"
            continue
        fi

        log_success "SPIRE entry validated: $file"
    done
}

#############################################
# COMMUNICATION MATRIX VALIDATION
#############################################

lint_communication_matrix() {
    log_info "Validating communication matrix..."

    matrix_file="$ROOT_DIR/config/communication-matrix.yaml"

    if [[ ! -f "$matrix_file" ]]; then
        log_warning "Communication matrix file not found: $matrix_file"
        return
    fi

    # Check YAML syntax
    if ! yq eval '.' "$matrix_file" > /dev/null 2>&1; then
        log_error "Invalid YAML syntax: $matrix_file"
        return
    fi

    # Check for default policy
    default_policy=$(yq eval '.data."matrix.yaml" | from_yaml | .defaultPolicy' "$matrix_file" 2>/dev/null || echo "")
    if [[ "$default_policy" != "DENY" ]]; then
        log_warning "Default policy is not DENY: $matrix_file"
    else
        log_success "Default policy is DENY"
    fi

    # Count rules
    rule_count=$(yq eval '.data."matrix.yaml" | from_yaml | .rules | length' "$matrix_file" 2>/dev/null || echo "0")
    log_info "Found $rule_count communication rules"

    log_success "Communication matrix validated: $matrix_file"
}

#############################################
# MAIN
#############################################

main() {
    echo "=============================================="
    echo "Zero-Trust Policy Linting"
    echo "=============================================="
    echo ""

    # Run all linters
    lint_network_policies
    echo ""
    lint_opa_policies
    echo ""
    lint_istio_policies
    echo ""
    lint_spire_entries
    echo ""
    lint_communication_matrix

    # Summary
    echo ""
    echo "=============================================="
    echo "Summary"
    echo "=============================================="
    echo -e "Passed:   ${GREEN}$PASSED${NC}"
    echo -e "Warnings: ${YELLOW}$WARNINGS${NC}"
    echo -e "Errors:   ${RED}$ERRORS${NC}"
    echo ""

    if [[ $ERRORS -gt 0 ]]; then
        echo -e "${RED}Policy linting failed with $ERRORS error(s)${NC}"
        exit 1
    elif [[ $WARNINGS -gt 0 ]]; then
        echo -e "${YELLOW}Policy linting completed with $WARNINGS warning(s)${NC}"
        exit 0
    else
        echo -e "${GREEN}All policies passed validation!${NC}"
        exit 0
    fi
}

main "$@"
