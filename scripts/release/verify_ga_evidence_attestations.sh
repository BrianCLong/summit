#!/usr/bin/env bash
#
# verify_ga_evidence_attestations.sh - Verify GA Evidence Pack attestations
#
# Verifies OIDC attestations for GA Evidence Pack using cosign.
# Can be run locally or in CI to validate attestation signatures.
#
# Usage:
#   ./verify_ga_evidence_attestations.sh --evidence-dir <dir> [OPTIONS]
#
# Options:
#   --evidence-dir <dir>        Evidence pack directory (required)
#   --expected-repo <repo>      Expected GitHub repository (default: from attestation)
#   --expected-workflow <name>  Expected workflow pattern (default: .github/workflows/.*)
#   --verbose                   Enable verbose output
#   --help                      Show this help message
#
# Exit codes:
#   0 - All verifications passed
#   1 - Verification failed
#   2 - Invalid arguments or setup issue
#
# See docs/releases/GA_EVIDENCE_PACK.md for full documentation.

set -euo pipefail

SCRIPT_VERSION="1.0.0"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Configuration
EVIDENCE_DIR=""
EXPECTED_REPO=""
EXPECTED_WORKFLOW_PATTERN=".github/workflows/.*"
VERBOSE=false

# OIDC constants
EXPECTED_ISSUER="https://token.actions.githubusercontent.com"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log_info() {
    echo -e "${BLUE}[INFO]${NC} $1" >&2
}

log_success() {
    echo -e "${GREEN}[✓]${NC} $1" >&2
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1" >&2
}

log_error() {
    echo -e "${RED}[✗]${NC} $1" >&2
}

log_verbose() {
    if [[ "$VERBOSE" == "true" ]]; then
        echo -e "${BLUE}[VERBOSE]${NC} $1" >&2
    fi
}

show_help() {
    head -25 "$0" | tail -20
    exit 0
}

# Parse arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --evidence-dir)
            EVIDENCE_DIR="$2"
            shift 2
            ;;
        --expected-repo)
            EXPECTED_REPO="$2"
            shift 2
            ;;
        --expected-workflow)
            EXPECTED_WORKFLOW_PATTERN="$2"
            shift 2
            ;;
        --verbose)
            VERBOSE=true
            shift
            ;;
        --help)
            show_help
            ;;
        *)
            log_error "Unknown option: $1"
            show_help
            ;;
    esac
done

# Validate required arguments
if [[ -z "$EVIDENCE_DIR" ]]; then
    log_error "Missing required argument: --evidence-dir"
    exit 2
fi

if [[ ! -d "$EVIDENCE_DIR" ]]; then
    log_error "Evidence directory does not exist: ${EVIDENCE_DIR}"
    exit 2
fi

# Resolve absolute path
EVIDENCE_DIR="$(cd "$EVIDENCE_DIR" && pwd)"
ATTESTATION_DIR="${EVIDENCE_DIR}/attestations"

log_info "Verifying GA Evidence Pack attestations"
log_info "Evidence: ${EVIDENCE_DIR}"

# Check cosign availability
if ! command -v cosign &> /dev/null; then
    log_error "cosign not found. Please install cosign:"
    log_error "  https://docs.sigstore.dev/cosign/installation/"
    log_error ""
    log_error "Quick install:"
    log_error "  # macOS"
    log_error "  brew install cosign"
    log_error ""
    log_error "  # Linux"
    log_error "  wget https://github.com/sigstore/cosign/releases/download/v2.2.4/cosign-linux-amd64"
    log_error "  chmod +x cosign-linux-amd64 && sudo mv cosign-linux-amd64 /usr/local/bin/cosign"
    exit 2
fi

COSIGN_VERSION=$(cosign version 2>&1 | head -n1 || echo "unknown")
log_verbose "cosign version: ${COSIGN_VERSION}"

# Verify attestation directory exists
if [[ ! -d "$ATTESTATION_DIR" ]]; then
    log_error "Attestation directory not found: ${ATTESTATION_DIR}"
    log_error "Evidence pack may not have been attested yet."
    exit 1
fi

# Load attestation manifest
MANIFEST_FILE="${ATTESTATION_DIR}/attestation-manifest.json"
if [[ ! -f "$MANIFEST_FILE" ]]; then
    log_error "Attestation manifest not found: ${MANIFEST_FILE}"
    exit 1
fi

# Extract expected repo from manifest if not provided
if [[ -z "$EXPECTED_REPO" ]]; then
    EXPECTED_REPO=$(jq -r '.oidc_identity.repository // "unknown"' "$MANIFEST_FILE" 2>/dev/null || echo "unknown")
    if [[ "$EXPECTED_REPO" == "unknown" || "$EXPECTED_REPO" == "null" ]]; then
        log_warn "Could not determine expected repository from manifest"
        log_warn "Specify --expected-repo for stricter verification"
        EXPECTED_REPO=""
    else
        log_verbose "Expected repository from manifest: ${EXPECTED_REPO}"
    fi
fi

# Build certificate identity regex
if [[ -n "$EXPECTED_REPO" ]]; then
    CERT_IDENTITY_REGEXP="https://github.com/${EXPECTED_REPO}/${EXPECTED_WORKFLOW_PATTERN}"
else
    CERT_IDENTITY_REGEXP="https://github.com/.*/${EXPECTED_WORKFLOW_PATTERN}"
fi

log_verbose "Certificate identity pattern: ${CERT_IDENTITY_REGEXP}"
log_verbose "Expected OIDC issuer: ${EXPECTED_ISSUER}"

# Track verification results
TOTAL_CHECKS=0
PASSED_CHECKS=0
FAILED_CHECKS=0

# Function to verify an attestation
verify_attestation() {
    local name="$1"
    local bundle_file="$2"
    local subject_file="$3"
    local attestation_type="$4"

    TOTAL_CHECKS=$((TOTAL_CHECKS + 1))

    log_info "Verifying ${name}..."
    log_verbose "  Bundle:  ${bundle_file}"
    log_verbose "  Subject: ${subject_file}"
    log_verbose "  Type:    ${attestation_type}"

    if [[ ! -f "$bundle_file" ]]; then
        log_error "Attestation bundle not found: ${bundle_file}"
        FAILED_CHECKS=$((FAILED_CHECKS + 1))
        return 1
    fi

    if [[ ! -f "$subject_file" ]]; then
        log_error "Subject file not found: ${subject_file}"
        FAILED_CHECKS=$((FAILED_CHECKS + 1))
        return 1
    fi

    # Verify the attestation
    local verify_output
    if verify_output=$(cosign verify-blob-attestation \
        --certificate-identity-regexp "$CERT_IDENTITY_REGEXP" \
        --certificate-oidc-issuer "$EXPECTED_ISSUER" \
        --type "$attestation_type" \
        --bundle "$bundle_file" \
        "$subject_file" 2>&1); then

        log_success "${name} attestation verified"
        PASSED_CHECKS=$((PASSED_CHECKS + 1))

        if [[ "$VERBOSE" == "true" ]]; then
            echo "$verify_output" | grep -i "certificate\|subject\|issuer" >&2 || true
        fi

        return 0
    else
        log_error "${name} attestation verification FAILED"
        log_error "Output: ${verify_output}"
        FAILED_CHECKS=$((FAILED_CHECKS + 1))
        return 1
    fi
}

# Verify evidence checksums integrity
log_info "Verifying evidence checksums integrity..."
TOTAL_CHECKS=$((TOTAL_CHECKS + 1))

cd "$EVIDENCE_DIR"
if sha256sum -c evidence.sha256 > /dev/null 2>&1; then
    CHECKSUM_COUNT=$(wc -l < evidence.sha256)
    log_success "Evidence checksums verified (${CHECKSUM_COUNT} files)"
    PASSED_CHECKS=$((PASSED_CHECKS + 1))
else
    log_error "Evidence checksums verification FAILED"
    log_error "One or more evidence files have been modified"
    FAILED_CHECKS=$((FAILED_CHECKS + 1))
fi
cd - > /dev/null

# Verify provenance attestation
verify_attestation \
    "Provenance" \
    "${ATTESTATION_DIR}/provenance.intoto.jsonl" \
    "${EVIDENCE_DIR}/evidence.sha256" \
    "slsaprovenance"

# Verify CycloneDX SBOM attestation
verify_attestation \
    "CycloneDX SBOM" \
    "${ATTESTATION_DIR}/sbom-cdx.intoto.jsonl" \
    "${EVIDENCE_DIR}/sbom.cdx.json" \
    "cyclonedx"

# Verify SPDX SBOM attestation
verify_attestation \
    "SPDX SBOM" \
    "${ATTESTATION_DIR}/sbom-spdx.intoto.jsonl" \
    "${EVIDENCE_DIR}/sbom.spdx.json" \
    "spdx"

# Summary
echo "" >&2
echo "==============================================================" >&2
echo "  GA Evidence Pack Attestation Verification Summary" >&2
echo "==============================================================" >&2
echo "" >&2
echo "  Total checks:   ${TOTAL_CHECKS}" >&2
echo "  Passed:         ${PASSED_CHECKS}" >&2
echo "  Failed:         ${FAILED_CHECKS}" >&2
echo "" >&2

if [[ $FAILED_CHECKS -eq 0 ]]; then
    log_success "All attestations verified successfully"
    echo "" >&2
    echo "Trust established:" >&2
    echo "  ✓ Attestations signed with GitHub OIDC (keyless)" >&2
    echo "  ✓ Signatures bound to artifact digests" >&2
    echo "  ✓ Evidence integrity confirmed" >&2
    if [[ -n "$EXPECTED_REPO" ]]; then
        echo "  ✓ Repository identity confirmed: ${EXPECTED_REPO}" >&2
    fi
    echo "" >&2
    exit 0
else
    log_error "Attestation verification FAILED"
    echo "" >&2
    echo "Possible causes:" >&2
    echo "  - Artifacts modified after attestation" >&2
    echo "  - Incorrect attestation files" >&2
    echo "  - Repository/workflow mismatch" >&2
    echo "" >&2
    echo "Review attestation manifest:" >&2
    echo "  cat ${MANIFEST_FILE}" >&2
    echo "" >&2
    exit 1
fi
