#!/usr/bin/env bash
#
# generate_ga_evidence_pack.sh - Generate deterministic GA Evidence Pack
#
# Creates a cryptographically verifiable evidence pack for GA releases,
# including all verification evidence, SBOM, checksums, and manifest.
# Designed for attestation with OIDC signing (Sigstore/cosign).
#
# Usage:
#   ./generate_ga_evidence_pack.sh [OPTIONS]
#
# Options:
#   --output <dir>           Output directory (default: dist/ga-evidence)
#   --check-determinism      Verify deterministic build by running twice
#   --tarball                Create tarball after generation
#   --verbose                Enable verbose output
#   --help                   Show this help message
#
# Output Structure:
#   dist/ga-evidence/
#   ├── evidence-bundle/       # All evidence files
#   ├── sbom.cdx.json          # CycloneDX SBOM
#   ├── sbom.spdx.json         # SPDX SBOM
#   ├── evidence.sha256        # Checksums of all artifacts
#   ├── manifest.json          # Pack manifest with metadata
#   └── ga-evidence.tgz        # (optional) Tarball of entire pack
#
# See docs/releases/GA_EVIDENCE_PACK.md for full documentation.

set -euo pipefail

SCRIPT_VERSION="1.0.0"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "${SCRIPT_DIR}/../.." && pwd)"

# Configuration
OUTPUT_DIR="dist/ga-evidence"
CHECK_DETERMINISM=false
CREATE_TARBALL=false
VERBOSE=false

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
    head -30 "$0" | tail -25
    exit 0
}

# Parse arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --output)
            OUTPUT_DIR="$2"
            shift 2
            ;;
        --check-determinism)
            CHECK_DETERMINISM=true
            shift
            ;;
        --tarball)
            CREATE_TARBALL=true
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

# Resolve absolute path
OUTPUT_DIR="$(cd "$(dirname "$OUTPUT_DIR")" 2>/dev/null && pwd)/$(basename "$OUTPUT_DIR")" || OUTPUT_DIR="${PROJECT_ROOT}/${OUTPUT_DIR}"

log_info "Generating GA Evidence Pack v${SCRIPT_VERSION}"
log_info "Output: ${OUTPUT_DIR}"

# Create output directory
mkdir -p "${OUTPUT_DIR}"

# Generate timestamp (deterministic if SOURCE_DATE_EPOCH is set)
if [[ -n "${SOURCE_DATE_EPOCH:-}" ]]; then
    TIMESTAMP=$(date -u -d "@${SOURCE_DATE_EPOCH}" +"%Y-%m-%dT%H:%M:%SZ" 2>/dev/null || date -u -r "${SOURCE_DATE_EPOCH}" +"%Y-%m-%dT%H:%M:%SZ")
    log_verbose "Using SOURCE_DATE_EPOCH for deterministic timestamp: ${TIMESTAMP}"
else
    TIMESTAMP=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
fi

# Capture git metadata
GIT_SHA=$(git rev-parse HEAD 2>/dev/null || echo "unknown")
GIT_TAG=$(git describe --tags --exact-match 2>/dev/null || echo "untagged")
GIT_BRANCH=$(git rev-parse --abbrev-ref HEAD 2>/dev/null || echo "unknown")
GITHUB_RUN_ID="${GITHUB_RUN_ID:-local}"
GITHUB_RUN_NUMBER="${GITHUB_RUN_NUMBER:-0}"
GITHUB_WORKFLOW="${GITHUB_WORKFLOW:-manual}"

log_info "Commit: ${GIT_SHA:0:8}"
log_info "Branch: ${GIT_BRANCH}"
log_info "Tag: ${GIT_TAG}"

# Step 1: Collect evidence
log_info "Step 1/5: Collecting evidence..."

EVIDENCE_DIR="${OUTPUT_DIR}/evidence-bundle"
mkdir -p "${EVIDENCE_DIR}"

if [[ -x "${SCRIPT_DIR}/generate_evidence_bundle.sh" ]]; then
    "${SCRIPT_DIR}/generate_evidence_bundle.sh" \
        --category all \
        --output "${EVIDENCE_DIR}" \
        ${VERBOSE:+--verbose} 2>&1 | tee "${OUTPUT_DIR}/evidence-collection.log" >&2 || {
        log_warn "Evidence collection completed with warnings"
    }
else
    log_warn "Evidence collection script not found, creating placeholder"
    echo "Evidence collection skipped - script not available" > "${EVIDENCE_DIR}/placeholder.txt"
fi

log_success "Evidence collected"

# Step 2: Generate SBOM
log_info "Step 2/5: Generating SBOM..."

# Check if syft is available
if command -v syft &> /dev/null; then
    cd "${PROJECT_ROOT}"

    # CycloneDX format
    syft . -o cyclonedx-json="${OUTPUT_DIR}/sbom.cdx.json" --quiet 2>&1 | tee -a "${OUTPUT_DIR}/sbom-generation.log" >&2 || {
        log_warn "CycloneDX SBOM generation failed"
        echo '{"bomFormat":"CycloneDX","specVersion":"1.4","version":1,"components":[]}' > "${OUTPUT_DIR}/sbom.cdx.json"
    }

    # SPDX format
    syft . -o spdx-json="${OUTPUT_DIR}/sbom.spdx.json" --quiet 2>&1 | tee -a "${OUTPUT_DIR}/sbom-generation.log" >&2 || {
        log_warn "SPDX SBOM generation failed"
        echo '{"spdxVersion":"SPDX-2.3","dataLicense":"CC0-1.0","SPDXID":"SPDXRef-DOCUMENT","name":"summit","packages":[]}' > "${OUTPUT_DIR}/sbom.spdx.json"
    }

    log_success "SBOM generated"
else
    log_warn "syft not found, generating placeholder SBOM"
    echo '{"bomFormat":"CycloneDX","specVersion":"1.4","version":1,"components":[],"metadata":{"component":{"type":"application","name":"summit"}}}' > "${OUTPUT_DIR}/sbom.cdx.json"
    echo '{"spdxVersion":"SPDX-2.3","dataLicense":"CC0-1.0","SPDXID":"SPDXRef-DOCUMENT","name":"summit","packages":[]}' > "${OUTPUT_DIR}/sbom.spdx.json"
fi

# Step 3: Generate manifest
log_info "Step 3/5: Generating manifest..."

cat > "${OUTPUT_DIR}/manifest.json" << EOF
{
  "version": "1.0.0",
  "pack_type": "ga-evidence",
  "generated_at": "${TIMESTAMP}",
  "generated_by": "generate_ga_evidence_pack.sh v${SCRIPT_VERSION}",
  "git": {
    "commit_sha": "${GIT_SHA}",
    "tag": "${GIT_TAG}",
    "branch": "${GIT_BRANCH}"
  },
  "workflow": {
    "run_id": "${GITHUB_RUN_ID}",
    "run_number": "${GITHUB_RUN_NUMBER}",
    "workflow": "${GITHUB_WORKFLOW}"
  },
  "artifacts": {
    "evidence_bundle": "evidence-bundle/",
    "sbom_cyclonedx": "sbom.cdx.json",
    "sbom_spdx": "sbom.spdx.json",
    "checksums": "evidence.sha256",
    "manifest": "manifest.json"
  },
  "attestation_targets": [
    {
      "name": "evidence-checksums",
      "file": "evidence.sha256",
      "purpose": "Attestable hash ledger of all evidence artifacts"
    },
    {
      "name": "sbom-cyclonedx",
      "file": "sbom.cdx.json",
      "purpose": "Software Bill of Materials (CycloneDX)"
    },
    {
      "name": "sbom-spdx",
      "file": "sbom.spdx.json",
      "purpose": "Software Bill of Materials (SPDX)"
    }
  ]
}
EOF

log_success "Manifest generated"

# Step 4: Generate checksums (deterministic hash ledger)
log_info "Step 4/5: Generating checksums..."

cd "${OUTPUT_DIR}"

# Generate checksums for all files except evidence.sha256 itself
# Use sorted, deterministic order
{
    find evidence-bundle -type f 2>/dev/null | sort | xargs sha256sum 2>/dev/null || true
    sha256sum sbom.cdx.json 2>/dev/null || true
    sha256sum sbom.spdx.json 2>/dev/null || true
    sha256sum manifest.json 2>/dev/null || true
} > evidence.sha256

# Verify checksums were generated
if [[ ! -s evidence.sha256 ]]; then
    log_error "Failed to generate checksums"
    exit 1
fi

CHECKSUM_COUNT=$(wc -l < evidence.sha256)
log_success "Generated ${CHECKSUM_COUNT} checksums"

cd - > /dev/null

# Step 5: Create tarball (optional, deterministic)
if [[ "$CREATE_TARBALL" == "true" ]]; then
    log_info "Step 5/5: Creating deterministic tarball..."

    cd "${OUTPUT_DIR}"

    # Create tarball with deterministic settings
    # - Sort files
    # - Use fixed mtime if SOURCE_DATE_EPOCH is set
    # - Reproducible gzip settings

    TAR_OPTS=(
        --create
        --gzip
        --file ga-evidence.tgz
        --sort=name
    )

    if [[ -n "${SOURCE_DATE_EPOCH:-}" ]]; then
        TAR_OPTS+=(--mtime="@${SOURCE_DATE_EPOCH}")
        log_verbose "Using SOURCE_DATE_EPOCH for deterministic mtime"
    fi

    tar "${TAR_OPTS[@]}" \
        evidence-bundle \
        sbom.cdx.json \
        sbom.spdx.json \
        manifest.json \
        evidence.sha256 \
        2>&1 | tee -a tarball-creation.log >&2

    TARBALL_HASH=$(sha256sum ga-evidence.tgz | cut -d' ' -f1)
    log_success "Tarball created: ga-evidence.tgz"
    log_info "Tarball SHA256: ${TARBALL_HASH}"

    cd - > /dev/null
else
    log_info "Step 5/5: Skipping tarball creation (use --tarball to create)"
fi

# Determinism check
if [[ "$CHECK_DETERMINISM" == "true" ]]; then
    log_info "Checking determinism..."

    TEMP_DIR=$(mktemp -d)
    FIRST_HASH=$(sha256sum "${OUTPUT_DIR}/evidence.sha256" | cut -d' ' -f1)

    log_verbose "First hash: ${FIRST_HASH}"
    log_verbose "Running second generation..."

    # Run generation again with same settings
    "$0" --output "${TEMP_DIR}" ${VERBOSE:+--verbose} ${CREATE_TARBALL:+--tarball} 2>&1 | grep -v "Checking determinism" >&2 || true

    SECOND_HASH=$(sha256sum "${TEMP_DIR}/evidence.sha256" | cut -d' ' -f1)
    log_verbose "Second hash: ${SECOND_HASH}"

    if [[ "$FIRST_HASH" == "$SECOND_HASH" ]]; then
        log_success "Determinism check PASSED: Hashes match"
    else
        log_error "Determinism check FAILED: Hashes differ"
        log_error "  First:  ${FIRST_HASH}"
        log_error "  Second: ${SECOND_HASH}"
        rm -rf "${TEMP_DIR}"
        exit 1
    fi

    rm -rf "${TEMP_DIR}"
fi

# Summary
echo "" >&2
echo "==============================================================" >&2
echo "  GA Evidence Pack Generation Complete" >&2
echo "==============================================================" >&2
echo "" >&2
echo "  Output:      ${OUTPUT_DIR}" >&2
echo "  Manifest:    manifest.json" >&2
echo "  Checksums:   evidence.sha256 (${CHECKSUM_COUNT} entries)" >&2
echo "  SBOM:        sbom.cdx.json, sbom.spdx.json" >&2

if [[ "$CREATE_TARBALL" == "true" ]]; then
    echo "  Tarball:     ga-evidence.tgz (${TARBALL_HASH:0:16}...)" >&2
fi

echo "" >&2
echo "Next steps:" >&2
echo "  1. Review: cat ${OUTPUT_DIR}/manifest.json" >&2
echo "  2. Verify:  sha256sum -c ${OUTPUT_DIR}/evidence.sha256" >&2
echo "  3. Attest:  Use workflow to generate OIDC attestations" >&2
echo "" >&2
