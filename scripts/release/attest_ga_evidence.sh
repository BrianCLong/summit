#!/usr/bin/env bash
#
# attest_ga_evidence.sh - Generate OIDC attestations for GA Evidence Pack
#
# Creates cryptographically signed attestations using Sigstore/cosign
# with GitHub OIDC keyless signing. Generates:
#   - Provenance attestation for evidence pack
#   - SBOM attestations (CycloneDX and SPDX)
#
# IMPORTANT: This script requires:
#   - cosign CLI installed
#   - OIDC token available (GitHub Actions with id-token: write)
#   - Evidence pack already generated
#
# Usage:
#   ./attest_ga_evidence.sh --evidence-dir <dir> [OPTIONS]
#
# Options:
#   --evidence-dir <dir>     Evidence pack directory (required)
#   --output-dir <dir>       Attestations output (default: <evidence-dir>/attestations)
#   --dry-run                Show what would be attested without signing
#   --verbose                Enable verbose output
#   --help                   Show this help message
#
# Output:
#   <output-dir>/
#   ├── provenance.intoto.jsonl          # Provenance attestation
#   ├── sbom-cdx.intoto.jsonl            # CycloneDX SBOM attestation
#   ├── sbom-spdx.intoto.jsonl           # SPDX SBOM attestation
#   ├── attestation-manifest.json        # Attestation metadata
#   └── verify.md                        # Verification instructions
#
# See docs/releases/GA_EVIDENCE_PACK.md for full documentation.

set -euo pipefail

SCRIPT_VERSION="1.0.0"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Configuration
EVIDENCE_DIR=""
OUTPUT_DIR=""
DRY_RUN=false
VERBOSE=false

# Expected OIDC identity constraints (GitHub Actions)
EXPECTED_ISSUER="https://token.actions.githubusercontent.com"
EXPECTED_REPO="${GITHUB_REPOSITORY:-}"
EXPECTED_WORKFLOW_REF="${GITHUB_WORKFLOW_REF:-}"

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
    echo -e "${GREEN}[SUCCESS]${NC} $1" >&2
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1" >&2
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1" >&2
}

log_verbose() {
    if [[ "$VERBOSE" == "true" ]]; then
        echo -e "${BLUE}[VERBOSE]${NC} $1" >&2
    fi
}

show_help() {
    head -35 "$0" | tail -30
    exit 0
}

# Parse arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --evidence-dir)
            EVIDENCE_DIR="$2"
            shift 2
            ;;
        --output-dir)
            OUTPUT_DIR="$2"
            shift 2
            ;;
        --dry-run)
            DRY_RUN=true
            shift
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
    exit 1
fi

# Set default output directory
if [[ -z "$OUTPUT_DIR" ]]; then
    OUTPUT_DIR="${EVIDENCE_DIR}/attestations"
fi

# Resolve absolute paths
EVIDENCE_DIR="$(cd "$EVIDENCE_DIR" && pwd)"
OUTPUT_DIR="$(mkdir -p "$OUTPUT_DIR" && cd "$OUTPUT_DIR" && pwd)"

log_info "Generating attestations for GA Evidence Pack"
log_info "Evidence: ${EVIDENCE_DIR}"
log_info "Output:   ${OUTPUT_DIR}"

# Check cosign availability
if ! command -v cosign &> /dev/null; then
    log_error "cosign not found. Please install cosign:"
    log_error "  https://docs.sigstore.dev/cosign/installation/"
    exit 1
fi

COSIGN_VERSION=$(cosign version 2>&1 | head -n1 || echo "unknown")
log_verbose "cosign version: ${COSIGN_VERSION}"

# Verify evidence pack structure
REQUIRED_FILES=(
    "evidence.sha256"
    "sbom.cdx.json"
    "sbom.spdx.json"
    "manifest.json"
)

for file in "${REQUIRED_FILES[@]}"; do
    if [[ ! -f "${EVIDENCE_DIR}/${file}" ]]; then
        log_error "Missing required file: ${file}"
        log_error "Evidence pack appears incomplete. Run generate_ga_evidence_pack.sh first."
        exit 1
    fi
done

log_success "Evidence pack structure validated"

# Capture metadata
GIT_SHA="${GITHUB_SHA:-$(git rev-parse HEAD 2>/dev/null || echo 'unknown')}"
GIT_REF="${GITHUB_REF:-$(git symbolic-ref HEAD 2>/dev/null || echo 'unknown')}"
RUN_ID="${GITHUB_RUN_ID:-local}"
RUN_NUMBER="${GITHUB_RUN_NUMBER:-0}"
WORKFLOW="${GITHUB_WORKFLOW:-manual}"
TIMESTAMP=$(date -u +"%Y-%m-%dT%H:%M:%SZ")

# Create output directory
mkdir -p "${OUTPUT_DIR}"

# Dry run mode
if [[ "$DRY_RUN" == "true" ]]; then
    log_warn "DRY RUN MODE - No attestations will be generated"
    echo "" >&2
    echo "Would attest the following artifacts:" >&2
    echo "  1. ${EVIDENCE_DIR}/evidence.sha256 (provenance)" >&2
    echo "  2. ${EVIDENCE_DIR}/sbom.cdx.json (CycloneDX SBOM)" >&2
    echo "  3. ${EVIDENCE_DIR}/sbom.spdx.json (SPDX SBOM)" >&2
    echo "" >&2
    echo "Expected OIDC identity:" >&2
    echo "  Issuer: ${EXPECTED_ISSUER}" >&2
    echo "  Repo:   ${EXPECTED_REPO:-<not set>}" >&2
    echo "" >&2
    exit 0
fi

# Check OIDC token availability (GitHub Actions)
if [[ -z "${ACTIONS_ID_TOKEN_REQUEST_URL:-}" ]]; then
    log_warn "ACTIONS_ID_TOKEN_REQUEST_URL not set"
    log_warn "Keyless signing requires GitHub Actions OIDC token"
    log_warn "Ensure workflow has 'id-token: write' permission"
fi

# Generate SLSA provenance predicate for evidence.sha256
log_info "Generating provenance attestation..."

PROVENANCE_PREDICATE=$(cat <<EOF
{
  "@type": "https://slsa.dev/provenance/v1",
  "buildType": "https://github.com/${GITHUB_REPOSITORY:-local}/ga-evidence-pack@v1",
  "builder": {
    "id": "${GITHUB_SERVER_URL:-https://github.com}/${GITHUB_REPOSITORY:-local}/.github/workflows/ga-evidence-attest.yml@${GITHUB_REF:-unknown}"
  },
  "invocation": {
    "configSource": {
      "uri": "${GITHUB_SERVER_URL:-https://github.com}/${GITHUB_REPOSITORY:-local}",
      "digest": {
        "sha1": "${GIT_SHA}"
      },
      "entryPoint": "${WORKFLOW}"
    },
    "parameters": {
      "workflow_run_id": "${RUN_ID}",
      "workflow_run_number": "${RUN_NUMBER}"
    }
  },
  "metadata": {
    "buildStartedOn": "${TIMESTAMP}",
    "buildFinishedOn": "${TIMESTAMP}",
    "completeness": {
      "parameters": true,
      "environment": false,
      "materials": true
    },
    "reproducible": true
  },
  "materials": [
    {
      "uri": "git+${GITHUB_SERVER_URL:-https://github.com}/${GITHUB_REPOSITORY:-local}@${GIT_REF}",
      "digest": {
        "sha1": "${GIT_SHA}"
      }
    }
  ],
  "subject": [
    {
      "name": "evidence.sha256",
      "digest": {
        "sha256": "$(sha256sum "${EVIDENCE_DIR}/evidence.sha256" | cut -d' ' -f1)"
      }
    }
  ]
}
EOF
)

echo "$PROVENANCE_PREDICATE" > "${OUTPUT_DIR}/provenance-predicate.json"
log_verbose "Provenance predicate: ${OUTPUT_DIR}/provenance-predicate.json"

# Attest evidence.sha256 with provenance
log_info "Attesting evidence.sha256 with SLSA provenance..."

cosign attest-blob \
    --predicate "${OUTPUT_DIR}/provenance-predicate.json" \
    --type slsaprovenance \
    --yes \
    "${EVIDENCE_DIR}/evidence.sha256" \
    --output-file "${OUTPUT_DIR}/provenance.intoto.jsonl" 2>&1 | tee -a "${OUTPUT_DIR}/attestation.log" >&2 || {
    log_error "Provenance attestation failed"
    exit 1
}

log_success "Provenance attestation: provenance.intoto.jsonl"

# Attest sbom.cdx.json
log_info "Attesting sbom.cdx.json (CycloneDX)..."

cosign attest-blob \
    --predicate "${EVIDENCE_DIR}/sbom.cdx.json" \
    --type cyclonedx \
    --yes \
    "${EVIDENCE_DIR}/sbom.cdx.json" \
    --output-file "${OUTPUT_DIR}/sbom-cdx.intoto.jsonl" 2>&1 | tee -a "${OUTPUT_DIR}/attestation.log" >&2 || {
    log_error "CycloneDX SBOM attestation failed"
    exit 1
}

log_success "CycloneDX attestation: sbom-cdx.intoto.jsonl"

# Attest sbom.spdx.json
log_info "Attesting sbom.spdx.json (SPDX)..."

cosign attest-blob \
    --predicate "${EVIDENCE_DIR}/sbom.spdx.json" \
    --type spdx \
    --yes \
    "${EVIDENCE_DIR}/sbom.spdx.json" \
    --output-file "${OUTPUT_DIR}/sbom-spdx.intoto.jsonl" 2>&1 | tee -a "${OUTPUT_DIR}/attestation.log" >&2 || {
    log_error "SPDX SBOM attestation failed"
    exit 1
}

log_success "SPDX attestation: sbom-spdx.intoto.jsonl"

# Generate attestation manifest
log_info "Generating attestation manifest..."

cat > "${OUTPUT_DIR}/attestation-manifest.json" << EOF
{
  "version": "1.0.0",
  "generated_at": "${TIMESTAMP}",
  "generated_by": "attest_ga_evidence.sh v${SCRIPT_VERSION}",
  "git": {
    "commit_sha": "${GIT_SHA}",
    "ref": "${GIT_REF}"
  },
  "workflow": {
    "run_id": "${RUN_ID}",
    "run_number": "${RUN_NUMBER}",
    "workflow": "${WORKFLOW}"
  },
  "oidc_identity": {
    "issuer": "${EXPECTED_ISSUER}",
    "repository": "${EXPECTED_REPO}",
    "workflow_ref": "${EXPECTED_WORKFLOW_REF}"
  },
  "attestations": [
    {
      "name": "provenance",
      "file": "provenance.intoto.jsonl",
      "subject": "evidence.sha256",
      "type": "slsaprovenance",
      "digest_sha256": "$(sha256sum "${EVIDENCE_DIR}/evidence.sha256" | cut -d' ' -f1)"
    },
    {
      "name": "sbom-cyclonedx",
      "file": "sbom-cdx.intoto.jsonl",
      "subject": "sbom.cdx.json",
      "type": "cyclonedx",
      "digest_sha256": "$(sha256sum "${EVIDENCE_DIR}/sbom.cdx.json" | cut -d' ' -f1)"
    },
    {
      "name": "sbom-spdx",
      "file": "sbom-spdx.intoto.jsonl",
      "subject": "sbom.spdx.json",
      "type": "spdx",
      "digest_sha256": "$(sha256sum "${EVIDENCE_DIR}/sbom.spdx.json" | cut -d' ' -f1)"
    }
  ],
  "verification": {
    "script": "verify_ga_evidence_attestations.sh",
    "instructions": "verify.md"
  }
}
EOF

log_success "Attestation manifest: attestation-manifest.json"

# Generate verification instructions
log_info "Generating verification instructions..."

cat > "${OUTPUT_DIR}/verify.md" << 'VERIFYEOF'
# GA Evidence Pack - Attestation Verification

This document provides instructions for verifying the cryptographic attestations
of the GA Evidence Pack using cosign.

## Prerequisites

Install cosign (v2.0+):
```bash
# macOS
brew install cosign

# Linux
wget https://github.com/sigstore/cosign/releases/download/v2.2.4/cosign-linux-amd64
chmod +x cosign-linux-amd64
sudo mv cosign-linux-amd64 /usr/local/bin/cosign
```

## Verification Steps

### 1. Verify Provenance Attestation

Verify that the evidence checksums file was attested by the authorized GitHub workflow:

```bash
cosign verify-blob-attestation \
  --certificate-identity-regexp "https://github.com/.*/summit/.github/workflows/.*" \
  --certificate-oidc-issuer "https://token.actions.githubusercontent.com" \
  --type slsaprovenance \
  --bundle provenance.intoto.jsonl \
  ../evidence.sha256
```

**What this verifies:**
- The attestation was signed with GitHub OIDC (keyless)
- The signer was the summit repository's GitHub Actions workflow
- The attestation is bound to the specific evidence.sha256 file

### 2. Verify CycloneDX SBOM Attestation

```bash
cosign verify-blob-attestation \
  --certificate-identity-regexp "https://github.com/.*/summit/.github/workflows/.*" \
  --certificate-oidc-issuer "https://token.actions.githubusercontent.com" \
  --type cyclonedx \
  --bundle sbom-cdx.intoto.jsonl \
  ../sbom.cdx.json
```

### 3. Verify SPDX SBOM Attestation

```bash
cosign verify-blob-attestation \
  --certificate-identity-regexp "https://github.com/.*/summit/.github/workflows/.*" \
  --certificate-oidc-issuer "https://token.actions.githubusercontent.com" \
  --type spdx \
  --bundle sbom-spdx.intoto.jsonl \
  ../sbom.spdx.json
```

### 4. Verify Evidence Checksums

After verifying attestations, verify the integrity of all evidence files:

```bash
cd ..
sha256sum -c evidence.sha256
```

## What is NOT Guaranteed

This attestation system provides:
- ✅ Cryptographic proof that artifacts were generated by authorized GitHub workflow
- ✅ Binding between attestation and artifact digest
- ✅ Transparency log (Rekor) entry for audit trail

This attestation system does NOT provide:
- ❌ Guarantee that the workflow itself is correct
- ❌ Guarantee that evidence collection is complete
- ❌ Enforcement of security policies (requires admission controller)
- ❌ Protection against compromised workflow or repository

## Trust Model

The trust anchor is:
1. **GitHub OIDC issuer**: `https://token.actions.githubusercontent.com`
2. **Repository**: Must match expected repository pattern
3. **Workflow**: Must be from `.github/workflows/` in the repository
4. **Transparency**: All signatures logged to Rekor (public ledger)

## Troubleshooting

### "Error: verifying bundle: invalid bundle: no matching certificate found"

Check that the certificate identity matches:
```bash
# Extract certificate from attestation
cosign verify-blob-attestation --insecure-ignore-tlog \
  --certificate-identity-regexp ".*" \
  --certificate-oidc-issuer "https://token.actions.githubusercontent.com" \
  --type slsaprovenance \
  --bundle provenance.intoto.jsonl \
  ../evidence.sha256 2>&1 | grep "certificate identity"
```

### "Error: verifying bundle: signature verification failed"

The attestation or artifact may have been modified. Verify:
1. Files were not modified after attestation
2. You're using the correct attestation file
3. The artifact digest matches

## References

- [Sigstore Documentation](https://docs.sigstore.dev/)
- [SLSA Provenance Spec](https://slsa.dev/provenance/v1)
- [GitHub OIDC Token](https://docs.github.com/en/actions/deployment/security-hardening-your-deployments/about-security-hardening-with-openid-connect)

VERIFYEOF

log_success "Verification instructions: verify.md"

# Summary
echo "" >&2
echo "==============================================================" >&2
echo "  GA Evidence Pack Attestation Complete" >&2
echo "==============================================================" >&2
echo "" >&2
echo "  Attestations:  ${OUTPUT_DIR}" >&2
echo "  Provenance:    provenance.intoto.jsonl" >&2
echo "  SBOM (CDX):    sbom-cdx.intoto.jsonl" >&2
echo "  SBOM (SPDX):   sbom-spdx.intoto.jsonl" >&2
echo "  Manifest:      attestation-manifest.json" >&2
echo "  Instructions:  verify.md" >&2
echo "" >&2
echo "Verification:" >&2
echo "  cd ${OUTPUT_DIR} && cat verify.md" >&2
echo "" >&2
