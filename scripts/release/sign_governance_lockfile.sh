#!/usr/bin/env bash
#
# sign_governance_lockfile.sh - Sign or verify governance lockfile using Sigstore/cosign
#
# Provides cryptographic authenticity for governance configuration using GitHub OIDC.
# Signs governance_SHA256SUMS (covering lockfile + all snapshot files) for complete
# governance binding.
#
# Usage:
#   ./sign_governance_lockfile.sh --mode sign --subject ./governance/governance_SHA256SUMS --out-dir ./governance/signatures
#   ./sign_governance_lockfile.sh --mode verify --subject ./governance/governance_SHA256SUMS --out-dir ./governance/signatures
#
# Options:
#   --mode MODE         Operation mode: sign|verify (required)
#   --subject PATH      Path to file to sign (default: governance_SHA256SUMS in bundle)
#   --out-dir DIR       Output directory for signature artifacts
#   --identity-policy   Path to identity policy YAML (optional, for verify)
#   --tag TAG           Release tag (for metadata)
#   --sha SHA           Git SHA (for metadata)
#   --verbose           Enable verbose output
#   --help              Show this help message
#
# Identity Pinning (verification):
#   OIDC Issuer: https://token.actions.githubusercontent.com
#   Identity:    https://github.com/<owner>/<repo>/.github/workflows/*
#
# Authority: docs/ci/GOVERNANCE_SIGNING.md

set -euo pipefail

SCRIPT_VERSION="1.0.0"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(git rev-parse --show-toplevel 2>/dev/null || echo ".")"

# Configuration
MODE=""
SUBJECT=""
OUT_DIR=""
IDENTITY_POLICY=""
TAG=""
SHA=""
VERBOSE=false

# Identity pinning defaults (GitHub Actions OIDC)
OIDC_ISSUER="https://token.actions.githubusercontent.com"
# Allow any workflow from this repository
IDENTITY_REGEXP="https://github.com/.*/summit/.github/workflows/.*"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1" >&2
}

log_verbose() {
    if [[ "$VERBOSE" == "true" ]]; then
        echo -e "${BLUE}[VERBOSE]${NC} $1"
    fi
}

show_help() {
    cat << EOF
sign_governance_lockfile.sh v${SCRIPT_VERSION}

Sign or verify governance lockfile using Sigstore/cosign OIDC.

Usage:
  $(basename "$0") --mode sign|verify --subject PATH [options]

Options:
  --mode MODE           Operation mode: sign or verify (required)
  --subject PATH        Path to governance_SHA256SUMS file (required)
  --out-dir DIR         Output directory for signatures (default: <subject_dir>/signatures)
  --identity-policy     Path to identity policy YAML (for custom constraints)
  --tag TAG             Release tag (for metadata)
  --sha SHA             Git SHA (for metadata)
  --verbose             Enable verbose output
  --help                Show this help message

Sign Mode:
  Creates signature and certificate for the subject file using GitHub OIDC identity.
  Outputs:
    - <out-dir>/<subject>.sig        Detached signature
    - <out-dir>/<subject>.cert       Certificate with OIDC identity
    - <out-dir>/metadata.json        Signing metadata

Verify Mode:
  Verifies signature against the subject with identity pinning.
  Enforces:
    - OIDC Issuer: ${OIDC_ISSUER}
    - Identity Pattern: ${IDENTITY_REGEXP}

Examples:
  # Sign governance checksums in CI
  $(basename "$0") --mode sign \\
    --subject ./governance/governance_SHA256SUMS \\
    --out-dir ./governance/signatures \\
    --tag v4.1.2 --sha abc123

  # Verify governance signatures
  $(basename "$0") --mode verify \\
    --subject ./governance/governance_SHA256SUMS \\
    --out-dir ./governance/signatures

Requirements:
  - cosign installed (will attempt to install if missing)
  - GitHub Actions OIDC token (id-token: write permission) for signing
EOF
}

# Check/install cosign
ensure_cosign() {
    if command -v cosign &>/dev/null; then
        log_verbose "cosign found: $(which cosign)"
        return 0
    fi

    log_info "cosign not found, attempting to install..."

    # Detect OS
    local os=""
    local arch=""
    case "$(uname -s)" in
        Linux)  os="linux" ;;
        Darwin) os="darwin" ;;
        *)
            log_error "Unsupported OS: $(uname -s)"
            return 1
            ;;
    esac

    case "$(uname -m)" in
        x86_64)  arch="amd64" ;;
        aarch64|arm64) arch="arm64" ;;
        *)
            log_error "Unsupported architecture: $(uname -m)"
            return 1
            ;;
    esac

    local cosign_url="https://github.com/sigstore/cosign/releases/latest/download/cosign-${os}-${arch}"
    local install_path="/tmp/cosign"

    if curl -sSfL "$cosign_url" -o "$install_path"; then
        chmod +x "$install_path"
        if [[ -w /usr/local/bin ]]; then
            mv "$install_path" /usr/local/bin/cosign
        else
            # Keep in /tmp if we can't install globally
            export PATH="/tmp:$PATH"
            log_warn "Installed cosign to /tmp (no write access to /usr/local/bin)"
        fi
        log_success "cosign installed"
        return 0
    else
        log_error "Failed to download cosign"
        return 1
    fi
}

# Sign mode
do_sign() {
    local subject="$1"
    local out_dir="$2"

    log_info "Signing governance lockfile..."
    log_info "Subject: ${subject}"
    log_info "Output:  ${out_dir}"

    # Validate subject exists
    if [[ ! -f "$subject" ]]; then
        log_error "Subject file not found: ${subject}"
        return 1
    fi

    # Create output directory
    mkdir -p "$out_dir"

    local subject_basename
    subject_basename=$(basename "$subject")
    local sig_path="${out_dir}/${subject_basename}.sig"
    local cert_path="${out_dir}/${subject_basename}.cert"
    local metadata_path="${out_dir}/metadata.json"

    # Enable experimental features for OIDC
    export COSIGN_EXPERIMENTAL=1

    # Check if we have OIDC token (GitHub Actions)
    if [[ -z "${ACTIONS_ID_TOKEN_REQUEST_TOKEN:-}" ]]; then
        log_warn "No GitHub OIDC token available (ACTIONS_ID_TOKEN_REQUEST_TOKEN not set)"
        log_warn "Signing requires 'id-token: write' permission in workflow"
        log_warn "Generating unsigned metadata..."

        # Write unsigned metadata
        cat > "$metadata_path" << EOF
{
  "version": "${SCRIPT_VERSION}",
  "method": "unsigned",
  "reason": "no_oidc_token",
  "subject": "${subject_basename}",
  "subject_sha256": "$(sha256sum "$subject" | cut -d' ' -f1)",
  "tag": "${TAG:-null}",
  "git_sha": "${SHA:-null}",
  "timestamp": "$(date -u +%Y-%m-%dT%H:%M:%SZ)"
}
EOF
        log_warn "Bundle will be marked as unsigned"
        return 0
    fi

    log_info "OIDC token available, signing with Sigstore..."

    # Sign the subject
    if cosign sign-blob --yes \
        "$subject" \
        --output-signature "$sig_path" \
        --output-certificate "$cert_path" 2>&1; then

        log_success "Signature created: ${sig_path}"
        log_success "Certificate created: ${cert_path}"

        # Extract identity from certificate
        local identity=""
        local issuer=""
        if command -v openssl &>/dev/null; then
            # Extract subject alternative name (contains OIDC identity)
            identity=$(openssl x509 -in "$cert_path" -noout -ext subjectAltName 2>/dev/null | grep -oP 'URI:\K[^,]+' || echo "")
            # Issuer is in the certificate extension
            issuer=$(openssl x509 -in "$cert_path" -noout -text 2>/dev/null | grep -A1 "OIDC Issuer" | tail -1 | xargs || echo "$OIDC_ISSUER")
        fi

        # Write metadata
        cat > "$metadata_path" << EOF
{
  "version": "${SCRIPT_VERSION}",
  "method": "sigstore-cosign-oidc",
  "subject": "${subject_basename}",
  "subject_sha256": "$(sha256sum "$subject" | cut -d' ' -f1)",
  "signature_file": "${subject_basename}.sig",
  "certificate_file": "${subject_basename}.cert",
  "identity": {
    "oidc_issuer": "${issuer:-${OIDC_ISSUER}}",
    "subject": "${identity:-unknown}"
  },
  "tag": "${TAG:-null}",
  "git_sha": "${SHA:-null}",
  "timestamp": "$(date -u +%Y-%m-%dT%H:%M:%SZ)"
}
EOF

        log_success "Metadata written: ${metadata_path}"

        # Verify immediately after signing
        log_verbose "Verifying signature..."
        if cosign verify-blob \
            --signature "$sig_path" \
            --certificate "$cert_path" \
            --certificate-oidc-issuer "$OIDC_ISSUER" \
            --certificate-identity-regexp "$IDENTITY_REGEXP" \
            "$subject" &>/dev/null; then
            log_success "Signature verification passed"
        else
            log_warn "Immediate verification check failed (may succeed later with transparency log)"
        fi

        return 0
    else
        log_error "Signing failed"
        return 1
    fi
}

# Verify mode
do_verify() {
    local subject="$1"
    local out_dir="$2"

    log_info "Verifying governance signature..."
    log_info "Subject: ${subject}"
    log_info "Signatures: ${out_dir}"

    # Validate subject exists
    if [[ ! -f "$subject" ]]; then
        log_error "Subject file not found: ${subject}"
        return 1
    fi

    local subject_basename
    subject_basename=$(basename "$subject")
    local sig_path="${out_dir}/${subject_basename}.sig"
    local cert_path="${out_dir}/${subject_basename}.cert"
    local metadata_path="${out_dir}/metadata.json"

    # Check for unsigned bundle
    if [[ -f "$metadata_path" ]]; then
        local method
        method=$(jq -r '.method // "unknown"' "$metadata_path" 2>/dev/null || echo "unknown")
        if [[ "$method" == "unsigned" ]]; then
            log_warn "Bundle is marked as unsigned"
            local reason
            reason=$(jq -r '.reason // "unknown"' "$metadata_path" 2>/dev/null || echo "unknown")
            log_warn "Reason: ${reason}"
            return 2  # Special exit code for unsigned
        fi
    fi

    # Check signature files exist
    if [[ ! -f "$sig_path" ]]; then
        log_error "Signature file not found: ${sig_path}"
        return 1
    fi

    if [[ ! -f "$cert_path" ]]; then
        log_error "Certificate file not found: ${cert_path}"
        return 1
    fi

    # Load custom identity constraints from policy if provided
    local oidc_issuer="$OIDC_ISSUER"
    local identity_regexp="$IDENTITY_REGEXP"

    if [[ -n "$IDENTITY_POLICY" && -f "$IDENTITY_POLICY" ]]; then
        log_verbose "Loading identity policy from: ${IDENTITY_POLICY}"
        if command -v yq &>/dev/null; then
            local policy_issuer
            policy_issuer=$(yq -r '.governance_signing.oidc_issuer // ""' "$IDENTITY_POLICY" 2>/dev/null || echo "")
            local policy_identity
            policy_identity=$(yq -r '.governance_signing.identity_regexp // ""' "$IDENTITY_POLICY" 2>/dev/null || echo "")

            if [[ -n "$policy_issuer" ]]; then
                oidc_issuer="$policy_issuer"
                log_verbose "Using policy OIDC issuer: ${oidc_issuer}"
            fi
            if [[ -n "$policy_identity" ]]; then
                identity_regexp="$policy_identity"
                log_verbose "Using policy identity regexp: ${identity_regexp}"
            fi
        else
            log_warn "yq not available, using default identity constraints"
        fi
    fi

    log_info "Identity constraints:"
    log_info "  OIDC Issuer: ${oidc_issuer}"
    log_info "  Identity:    ${identity_regexp}"

    # Enable experimental features
    export COSIGN_EXPERIMENTAL=1

    # Verify signature with identity pinning
    if cosign verify-blob \
        --signature "$sig_path" \
        --certificate "$cert_path" \
        --certificate-oidc-issuer "$oidc_issuer" \
        --certificate-identity-regexp "$identity_regexp" \
        "$subject" 2>&1; then

        log_success "Governance signature VERIFIED"
        log_success "Identity pinning enforced"

        # Display metadata if available
        if [[ -f "$metadata_path" ]]; then
            log_verbose "Signature metadata:"
            log_verbose "  Tag: $(jq -r '.tag // "null"' "$metadata_path")"
            log_verbose "  SHA: $(jq -r '.git_sha // "null"' "$metadata_path")"
            log_verbose "  Signed at: $(jq -r '.timestamp // "unknown"' "$metadata_path")"
        fi

        return 0
    else
        log_error "Governance signature verification FAILED"
        log_error "The signature does not match or identity constraints were not met"
        return 1
    fi
}

# Parse arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --mode)
            MODE="$2"
            shift 2
            ;;
        --subject)
            SUBJECT="$2"
            shift 2
            ;;
        --out-dir)
            OUT_DIR="$2"
            shift 2
            ;;
        --identity-policy)
            IDENTITY_POLICY="$2"
            shift 2
            ;;
        --tag)
            TAG="$2"
            shift 2
            ;;
        --sha)
            SHA="$2"
            shift 2
            ;;
        --verbose)
            VERBOSE=true
            shift
            ;;
        --help)
            show_help
            exit 0
            ;;
        *)
            log_error "Unknown option: $1"
            show_help
            exit 2
            ;;
    esac
done

# Validate required arguments
if [[ -z "$MODE" ]]; then
    log_error "Missing required argument: --mode"
    show_help
    exit 2
fi

if [[ "$MODE" != "sign" && "$MODE" != "verify" ]]; then
    log_error "Invalid mode: ${MODE}. Must be 'sign' or 'verify'"
    exit 2
fi

if [[ -z "$SUBJECT" ]]; then
    log_error "Missing required argument: --subject"
    show_help
    exit 2
fi

# Set default output directory
if [[ -z "$OUT_DIR" ]]; then
    OUT_DIR="$(dirname "$SUBJECT")/signatures"
fi

# Ensure cosign is available
if ! ensure_cosign; then
    log_error "cosign is required but could not be installed"
    log_error "Install manually: https://docs.sigstore.dev/cosign/installation/"
    exit 1
fi

# Execute mode
case "$MODE" in
    sign)
        do_sign "$SUBJECT" "$OUT_DIR"
        ;;
    verify)
        do_verify "$SUBJECT" "$OUT_DIR"
        ;;
esac
