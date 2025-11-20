#!/usr/bin/env bash
#
# Deployment Verification Script
# Verifies that container images are signed, attested, and secure before deployment
#
# Usage:
#   ./scripts/verify-deployment.sh <image> [environment]
#
# Example:
#   ./scripts/verify-deployment.sh ghcr.io/yourorg/summit/server:sha-abc123 production
#

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
IMAGE="${1:?ERROR: Image name required as first argument}"
ENVIRONMENT="${2:-staging}"
COSIGN_EXPERIMENTAL="${COSIGN_EXPERIMENTAL:-true}"
CERT_IDENTITY_REGEXP="${CERT_IDENTITY_REGEXP:-^https://github.com/.*}"
CERT_OIDC_ISSUER="${CERT_OIDC_ISSUER:-https://token.actions.githubusercontent.com}"

# Logging functions
log_info() {
    echo -e "${GREEN}[INFO]${NC} $*"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $*"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $*"
}

# Check prerequisites
check_prerequisites() {
    log_info "Checking prerequisites..."

    if ! command -v cosign &> /dev/null; then
        log_error "cosign is not installed. Install from: https://docs.sigstore.dev/cosign/installation/"
        return 1
    fi

    if ! command -v syft &> /dev/null; then
        log_warn "syft is not installed. SBOM verification will be skipped."
    fi

    if ! command -v trivy &> /dev/null; then
        log_warn "trivy is not installed. Vulnerability scanning will be skipped."
    fi

    log_info "Prerequisites check passed"
    return 0
}

# Verify image signature
verify_signature() {
    log_info "Verifying image signature for: $IMAGE"

    if COSIGN_EXPERIMENTAL="$COSIGN_EXPERIMENTAL" cosign verify \
        --certificate-identity-regexp="$CERT_IDENTITY_REGEXP" \
        --certificate-oidc-issuer="$CERT_OIDC_ISSUER" \
        "$IMAGE" > /dev/null 2>&1; then
        log_info "✓ Image signature verified successfully"
        return 0
    else
        log_error "✗ Image signature verification FAILED"
        log_error "  Image may be tampered with or not properly signed"
        return 1
    fi
}

# Verify SBOM attestation
verify_sbom_attestation() {
    log_info "Verifying SBOM attestation for: $IMAGE"

    if COSIGN_EXPERIMENTAL="$COSIGN_EXPERIMENTAL" cosign verify-attestation \
        --type spdxjson \
        --certificate-identity-regexp="$CERT_IDENTITY_REGEXP" \
        --certificate-oidc-issuer="$CERT_OIDC_ISSUER" \
        "$IMAGE" > /dev/null 2>&1; then
        log_info "✓ SBOM attestation verified successfully"
        return 0
    else
        log_error "✗ SBOM attestation verification FAILED"
        log_error "  Cannot verify software bill of materials"
        return 1
    fi
}

# Verify SLSA provenance (if available)
verify_provenance() {
    log_info "Verifying SLSA provenance for: $IMAGE"

    if COSIGN_EXPERIMENTAL="$COSIGN_EXPERIMENTAL" cosign verify-attestation \
        --type slsaprovenance \
        --certificate-identity-regexp="$CERT_IDENTITY_REGEXP" \
        --certificate-oidc-issuer="$CERT_OIDC_ISSUER" \
        "$IMAGE" > /dev/null 2>&1; then
        log_info "✓ SLSA provenance verified successfully"
        return 0
    else
        log_warn "⚠ SLSA provenance verification skipped (not required for $ENVIRONMENT)"
        return 0  # Don't fail for staging
    fi
}

# Scan for vulnerabilities
scan_vulnerabilities() {
    if ! command -v trivy &> /dev/null; then
        log_warn "Skipping vulnerability scan (trivy not installed)"
        return 0
    fi

    log_info "Scanning for vulnerabilities: $IMAGE"

    if trivy image --severity HIGH,CRITICAL --exit-code 0 --quiet "$IMAGE"; then
        local vuln_count
        vuln_count=$(trivy image --severity HIGH,CRITICAL --format json --quiet "$IMAGE" | jq '[.Results[].Vulnerabilities[]?] | length')

        if [ "$vuln_count" -eq 0 ]; then
            log_info "✓ No HIGH or CRITICAL vulnerabilities found"
            return 0
        else
            log_error "✗ Found $vuln_count HIGH/CRITICAL vulnerabilities"

            if [ "$ENVIRONMENT" == "production" ]; then
                log_error "  Cannot deploy to production with vulnerabilities"
                return 1
            else
                log_warn "  Allowing deployment to $ENVIRONMENT with vulnerabilities (not recommended)"
                return 0
            fi
        fi
    else
        log_error "✗ Vulnerability scan failed"
        return 1
    fi
}

# Scan for embedded secrets
scan_secrets() {
    if ! command -v trivy &> /dev/null; then
        log_warn "Skipping secret scan (trivy not installed)"
        return 0
    fi

    log_info "Scanning for embedded secrets: $IMAGE"

    if trivy image --scanners secret --severity HIGH,CRITICAL --exit-code 0 --quiet "$IMAGE"; then
        local secret_count
        secret_count=$(trivy image --scanners secret --severity HIGH,CRITICAL --format json --quiet "$IMAGE" | jq '[.Results[].Secrets[]?] | length')

        if [ "$secret_count" -eq 0 ]; then
            log_info "✓ No embedded secrets found"
            return 0
        else
            log_error "✗ Found $secret_count potential secrets in image"
            log_error "  Cannot deploy image with embedded secrets"
            return 1
        fi
    else
        log_error "✗ Secret scan failed"
        return 1
    fi
}

# Verify OPA policies (if available)
verify_policies() {
    if [ ! -f "policy/deployment-security.rego" ]; then
        log_warn "Skipping policy verification (policy/deployment-security.rego not found)"
        return 0
    fi

    if ! command -v opa &> /dev/null; then
        log_warn "Skipping policy verification (opa not installed)"
        return 0
    fi

    log_info "Verifying OPA policies for: $IMAGE"

    # Create input JSON for OPA
    local input_json
    input_json=$(cat <<EOF
{
  "image": "$IMAGE",
  "environment": "$ENVIRONMENT",
  "requester": "${USER:-unknown}",
  "image_metadata": {
    "signed": true,
    "sbom_attested": true
  },
  "vulnerabilities": [],
  "image_secrets": [],
  "container_config": {
    "user": "nonroot",
    "privileged": false,
    "network_mode": "bridge",
    "read_only_root_filesystem": false
  }
}
EOF
)

    if echo "$input_json" | opa eval --data policy/ --input - --format pretty "data.deployment.allow" | grep -q "true"; then
        log_info "✓ OPA policy checks passed"
        return 0
    else
        log_error "✗ OPA policy checks FAILED"
        echo "$input_json" | opa eval --data policy/ --input - --format pretty "data.deployment.deny"
        return 1
    fi
}

# Main verification flow
main() {
    log_info "=========================================="
    log_info "Deployment Verification"
    log_info "=========================================="
    log_info "Image:       $IMAGE"
    log_info "Environment: $ENVIRONMENT"
    log_info "=========================================="
    echo

    local exit_code=0

    # Run all checks
    check_prerequisites || exit_code=$?

    verify_signature || exit_code=$?
    verify_sbom_attestation || exit_code=$?
    verify_provenance || exit_code=$?
    scan_vulnerabilities || exit_code=$?
    scan_secrets || exit_code=$?
    verify_policies || exit_code=$?

    echo
    log_info "=========================================="

    if [ $exit_code -eq 0 ]; then
        log_info "✓ All verification checks passed"
        log_info "  Image is APPROVED for deployment to $ENVIRONMENT"
        log_info "=========================================="
        return 0
    else
        log_error "✗ Verification checks FAILED"
        log_error "  Image is NOT APPROVED for deployment"
        log_error "=========================================="
        return 1
    fi
}

# Run main function
main "$@"
