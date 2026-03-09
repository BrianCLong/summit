#!/usr/bin/env bash
# SLSA L3 Compliance Verification Script
# This script verifies that container images meet SLSA Level 3 requirements
#
# Usage: ./verify-slsa-l3.sh <image-reference>
#
# Requirements:
# - cosign (>= 2.2.0)
# - slsa-verifier (>= 2.4.0)
# - jq

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
GITHUB_OIDC_ISSUER="https://token.actions.githubusercontent.com"
EXPECTED_REPO="${EXPECTED_REPO:-}"
SLSA_MIN_LEVEL="${SLSA_MIN_LEVEL:-3}"

# Logging functions
log_info() { echo -e "${BLUE}[INFO]${NC} $*"; }
log_success() { echo -e "${GREEN}[PASS]${NC} $*"; }
log_warning() { echo -e "${YELLOW}[WARN]${NC} $*"; }
log_error() { echo -e "${RED}[FAIL]${NC} $*"; }

# Check dependencies
check_dependencies() {
    local missing=()

    for cmd in cosign jq; do
        if ! command -v "$cmd" &> /dev/null; then
            missing+=("$cmd")
        fi
    done

    if [ ${#missing[@]} -ne 0 ]; then
        log_error "Missing required tools: ${missing[*]}"
        echo "Install with:"
        echo "  - cosign: https://docs.sigstore.dev/cosign/installation/"
        echo "  - jq: apt-get install jq / brew install jq"
        exit 1
    fi

    log_success "All required tools are installed"
}

# Verify image signature
verify_signature() {
    local image="$1"
    local repo_pattern="$2"

    log_info "Verifying image signature for: $image"

    if [ -n "$repo_pattern" ]; then
        if cosign verify "$image" \
            --certificate-identity-regexp="https://github.com/${repo_pattern}" \
            --certificate-oidc-issuer="$GITHUB_OIDC_ISSUER" 2>/dev/null; then
            log_success "Image signature verified (OIDC identity matched)"
            return 0
        else
            log_error "Image signature verification failed"
            return 1
        fi
    else
        if cosign verify "$image" \
            --certificate-oidc-issuer="$GITHUB_OIDC_ISSUER" 2>/dev/null; then
            log_success "Image signature verified"
            return 0
        else
            log_error "Image signature verification failed"
            return 1
        fi
    fi
}

# Verify SBOM attestation
verify_sbom() {
    local image="$1"
    local repo_pattern="$2"

    log_info "Verifying SBOM attestation..."

    local sbom_types=("cyclonedx" "spdx")
    local found=false

    for sbom_type in "${sbom_types[@]}"; do
        if [ -n "$repo_pattern" ]; then
            if cosign verify-attestation "$image" \
                --type "$sbom_type" \
                --certificate-identity-regexp="https://github.com/${repo_pattern}" \
                --certificate-oidc-issuer="$GITHUB_OIDC_ISSUER" 2>/dev/null; then
                log_success "SBOM attestation verified (type: $sbom_type)"
                found=true
            fi
        else
            if cosign verify-attestation "$image" \
                --type "$sbom_type" \
                --certificate-oidc-issuer="$GITHUB_OIDC_ISSUER" 2>/dev/null; then
                log_success "SBOM attestation verified (type: $sbom_type)"
                found=true
            fi
        fi
    done

    if [ "$found" = false ]; then
        log_warning "No SBOM attestation found"
        return 1
    fi

    return 0
}

# Verify SLSA provenance
verify_provenance() {
    local image="$1"
    local repo_pattern="$2"

    log_info "Verifying SLSA provenance attestation..."

    if [ -n "$repo_pattern" ]; then
        if cosign verify-attestation "$image" \
            --type slsaprovenance \
            --certificate-identity-regexp="https://github.com/${repo_pattern}" \
            --certificate-oidc-issuer="$GITHUB_OIDC_ISSUER" 2>/dev/null; then
            log_success "SLSA provenance attestation verified"
            return 0
        fi
    else
        if cosign verify-attestation "$image" \
            --type slsaprovenance \
            --certificate-oidc-issuer="$GITHUB_OIDC_ISSUER" 2>/dev/null; then
            log_success "SLSA provenance attestation verified"
            return 0
        fi
    fi

    log_warning "SLSA provenance attestation not found or invalid"
    return 1
}

# Extract and display provenance details
show_provenance_details() {
    local image="$1"

    log_info "Extracting provenance details..."

    local provenance
    provenance=$(cosign verify-attestation "$image" \
        --type slsaprovenance \
        --certificate-oidc-issuer="$GITHUB_OIDC_ISSUER" 2>/dev/null | jq -r '.payload' | base64 -d 2>/dev/null || echo "{}")

    if [ "$provenance" != "{}" ]; then
        echo ""
        echo "=== Provenance Details ==="
        echo "Builder: $(echo "$provenance" | jq -r '.predicate.runDetails.builder.id // .predicate.builder.id // "unknown"')"
        echo "Source: $(echo "$provenance" | jq -r '.predicate.buildDefinition.resolvedDependencies[0].uri // .predicate.invocation.configSource.uri // "unknown"')"
        echo "Commit: $(echo "$provenance" | jq -r '.predicate.buildDefinition.resolvedDependencies[0].digest.gitCommit // .predicate.invocation.configSource.digest.sha1 // "unknown"')"
        echo "Build ID: $(echo "$provenance" | jq -r '.predicate.runDetails.metadata.invocationId // .predicate.metadata.buildInvocationId // "unknown"')"
        echo ""
    fi
}

# Determine SLSA level
determine_slsa_level() {
    local signature_ok="$1"
    local sbom_ok="$2"
    local provenance_ok="$3"

    if [ "$signature_ok" = true ] && [ "$provenance_ok" = true ]; then
        if [ "$sbom_ok" = true ]; then
            echo "3"
        else
            echo "2"
        fi
    elif [ "$signature_ok" = true ]; then
        echo "1"
    else
        echo "0"
    fi
}

# Generate compliance report
generate_report() {
    local image="$1"
    local signature_ok="$2"
    local sbom_ok="$3"
    local provenance_ok="$4"
    local slsa_level="$5"

    echo ""
    echo "=============================================="
    echo "       SLSA L3 Compliance Report"
    echo "=============================================="
    echo ""
    echo "Image: $image"
    echo "Timestamp: $(date -u +%Y-%m-%dT%H:%M:%SZ)"
    echo ""
    echo "Verification Results:"
    echo "---------------------"
    printf "  Image Signature:      %s\n" "$([ "$signature_ok" = true ] && echo "PASS" || echo "FAIL")"
    printf "  SBOM Attestation:     %s\n" "$([ "$sbom_ok" = true ] && echo "PASS" || echo "WARN")"
    printf "  SLSA Provenance:      %s\n" "$([ "$provenance_ok" = true ] && echo "PASS" || echo "FAIL")"
    echo ""
    echo "Achieved SLSA Level: $slsa_level"
    echo ""

    if [ "$slsa_level" -ge "$SLSA_MIN_LEVEL" ]; then
        log_success "Image meets SLSA Level $SLSA_MIN_LEVEL requirements"
        return 0
    else
        log_error "Image does NOT meet SLSA Level $SLSA_MIN_LEVEL requirements (achieved: Level $slsa_level)"
        return 1
    fi
}

# Main function
main() {
    local image="${1:-}"

    if [ -z "$image" ]; then
        echo "Usage: $0 <image-reference>"
        echo ""
        echo "Examples:"
        echo "  $0 ghcr.io/org/repo:tag"
        echo "  $0 ghcr.io/org/repo@sha256:abc123..."
        echo ""
        echo "Environment variables:"
        echo "  EXPECTED_REPO     - Expected repository pattern for identity verification"
        echo "  SLSA_MIN_LEVEL    - Minimum required SLSA level (default: 3)"
        exit 1
    fi

    echo ""
    echo "=============================================="
    echo "    SLSA L3 Compliance Verification"
    echo "=============================================="
    echo ""

    # Check dependencies
    check_dependencies

    # Determine repo pattern for identity verification
    local repo_pattern="$EXPECTED_REPO"
    if [ -z "$repo_pattern" ]; then
        # Try to extract from image name
        repo_pattern=$(echo "$image" | sed -E 's|^[^/]+/||; s|[@:].*$||')
        log_info "Using inferred repository pattern: $repo_pattern"
    fi

    echo ""

    # Run verifications
    local signature_ok=false
    local sbom_ok=false
    local provenance_ok=false

    if verify_signature "$image" "$repo_pattern"; then
        signature_ok=true
    fi

    echo ""

    if verify_sbom "$image" "$repo_pattern"; then
        sbom_ok=true
    fi

    echo ""

    if verify_provenance "$image" "$repo_pattern"; then
        provenance_ok=true
        show_provenance_details "$image"
    fi

    # Determine SLSA level
    local slsa_level
    slsa_level=$(determine_slsa_level "$signature_ok" "$sbom_ok" "$provenance_ok")

    # Generate report
    generate_report "$image" "$signature_ok" "$sbom_ok" "$provenance_ok" "$slsa_level"
}

main "$@"
