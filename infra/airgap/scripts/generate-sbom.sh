#!/bin/bash
# SBOM Generation Script for Air-Gapped Deployment
# Generates CycloneDX and SPDX SBOMs with cosign attestations
# Part of Air-Gapped Deployment for Summit IntelGraph

set -euo pipefail

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
OUTPUT_DIR="${SCRIPT_DIR}/../sbom/generated"
COSIGN_KEY="${COSIGN_PRIVATE_KEY:-/keys/cosign.key}"
IMAGE_REGISTRY="${ECR_REGISTRY:-}"
DATE_TAG=$(date +%Y%m%d-%H%M%S)

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

log_info() { echo -e "${GREEN}[INFO]${NC} $1"; }
log_warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }

usage() {
    cat << EOF
Usage: $(basename "$0") [OPTIONS] IMAGE

Generate SBOM for container image with cosign attestation.

Options:
    -o, --output DIR       Output directory (default: ${OUTPUT_DIR})
    -k, --key FILE         Cosign private key (default: ${COSIGN_KEY})
    -f, --format FORMAT    SBOM format: cyclonedx, spdx, or both (default: both)
    -a, --attest           Create and attach attestation
    -s, --sign             Sign the SBOM file
    -v, --verbose          Verbose output
    -h, --help             Show this help message

Examples:
    $(basename "$0") myregistry/myimage:v1.0.0
    $(basename "$0") -f cyclonedx -a myregistry/myimage:v1.0.0
    $(basename "$0") -o /path/to/output -k /path/to/key.pem myimage:latest
EOF
}

# Parse arguments
SBOM_FORMAT="both"
CREATE_ATTESTATION=false
SIGN_SBOM=false
VERBOSE=false
IMAGE=""

while [[ $# -gt 0 ]]; do
    case $1 in
        -o|--output)
            OUTPUT_DIR="$2"
            shift 2
            ;;
        -k|--key)
            COSIGN_KEY="$2"
            shift 2
            ;;
        -f|--format)
            SBOM_FORMAT="$2"
            shift 2
            ;;
        -a|--attest)
            CREATE_ATTESTATION=true
            shift
            ;;
        -s|--sign)
            SIGN_SBOM=true
            shift
            ;;
        -v|--verbose)
            VERBOSE=true
            shift
            ;;
        -h|--help)
            usage
            exit 0
            ;;
        -*)
            log_error "Unknown option: $1"
            usage
            exit 1
            ;;
        *)
            IMAGE="$1"
            shift
            ;;
    esac
done

if [[ -z "${IMAGE}" ]]; then
    log_error "Image is required"
    usage
    exit 1
fi

# Create output directory
mkdir -p "${OUTPUT_DIR}"

# Extract image name for file naming
IMAGE_NAME=$(echo "${IMAGE}" | sed 's|.*/||' | sed 's/:/-/g' | sed 's/@/-/g')
SBOM_BASE="${OUTPUT_DIR}/${IMAGE_NAME}-${DATE_TAG}"

log_info "Generating SBOM for image: ${IMAGE}"
log_info "Output directory: ${OUTPUT_DIR}"

# Generate CycloneDX SBOM
generate_cyclonedx() {
    local output_file="${SBOM_BASE}-cyclonedx.json"
    log_info "Generating CycloneDX SBOM..."

    # Use syft for SBOM generation
    syft "${IMAGE}" \
        -o cyclonedx-json="${output_file}" \
        --source-name "intelgraph" \
        --source-version "$(date +%Y.%m.%d)"

    # Add additional metadata
    jq --arg ts "$(date -u +%Y-%m-%dT%H:%M:%SZ)" \
       --arg serial "urn:uuid:$(uuidgen)" \
       '.metadata.timestamp = $ts | .serialNumber = $serial' \
       "${output_file}" > "${output_file}.tmp" && mv "${output_file}.tmp" "${output_file}"

    log_info "CycloneDX SBOM saved to: ${output_file}"

    # Generate hash
    sha256sum "${output_file}" > "${output_file}.sha256"

    if ${SIGN_SBOM}; then
        sign_file "${output_file}"
    fi

    if ${CREATE_ATTESTATION}; then
        create_attestation "${output_file}" "https://cyclonedx.org/bom"
    fi

    echo "${output_file}"
}

# Generate SPDX SBOM
generate_spdx() {
    local output_file="${SBOM_BASE}-spdx.json"
    log_info "Generating SPDX SBOM..."

    syft "${IMAGE}" \
        -o spdx-json="${output_file}" \
        --source-name "intelgraph" \
        --source-version "$(date +%Y.%m.%d)"

    log_info "SPDX SBOM saved to: ${output_file}"

    # Generate hash
    sha256sum "${output_file}" > "${output_file}.sha256"

    if ${SIGN_SBOM}; then
        sign_file "${output_file}"
    fi

    echo "${output_file}"
}

# Sign file with cosign
sign_file() {
    local file="$1"
    local sig_file="${file}.sig"

    log_info "Signing file: ${file}"

    if [[ ! -f "${COSIGN_KEY}" ]]; then
        log_error "Cosign key not found: ${COSIGN_KEY}"
        return 1
    fi

    cosign sign-blob \
        --key "${COSIGN_KEY}" \
        --output-signature "${sig_file}" \
        --tlog-upload=false \
        "${file}"

    log_info "Signature saved to: ${sig_file}"
}

# Create and attach attestation
create_attestation() {
    local sbom_file="$1"
    local predicate_type="$2"

    log_info "Creating attestation for: ${sbom_file}"

    if [[ ! -f "${COSIGN_KEY}" ]]; then
        log_error "Cosign key not found: ${COSIGN_KEY}"
        return 1
    fi

    # Create attestation
    cosign attest \
        --key "${COSIGN_KEY}" \
        --type "${predicate_type}" \
        --predicate "${sbom_file}" \
        --tlog-upload=false \
        "${IMAGE}"

    log_info "Attestation attached to image: ${IMAGE}"
}

# Generate vulnerability report
generate_vuln_report() {
    local sbom_file="$1"
    local vuln_file="${sbom_file%.json}-vulns.json"

    log_info "Scanning for vulnerabilities..."

    grype "sbom:${sbom_file}" \
        -o json \
        --file "${vuln_file}"

    # Check for critical/high vulnerabilities
    local critical_count=$(jq '[.matches[] | select(.vulnerability.severity == "Critical")] | length' "${vuln_file}")
    local high_count=$(jq '[.matches[] | select(.vulnerability.severity == "High")] | length' "${vuln_file}")

    log_info "Vulnerability scan complete:"
    log_info "  Critical: ${critical_count}"
    log_info "  High: ${high_count}"

    if [[ ${critical_count} -gt 0 ]] || [[ ${high_count} -gt 0 ]]; then
        log_warn "Critical/High vulnerabilities found!"
    fi

    echo "${vuln_file}"
}

# Main execution
main() {
    log_info "=== SBOM Generation Started ==="
    log_info "Image: ${IMAGE}"
    log_info "Format: ${SBOM_FORMAT}"

    # Check dependencies
    for cmd in syft cosign grype jq; do
        if ! command -v "${cmd}" &> /dev/null; then
            log_error "Required command not found: ${cmd}"
            exit 1
        fi
    done

    # Generate SBOMs based on format
    case "${SBOM_FORMAT}" in
        cyclonedx)
            sbom_file=$(generate_cyclonedx)
            generate_vuln_report "${sbom_file}"
            ;;
        spdx)
            sbom_file=$(generate_spdx)
            generate_vuln_report "${sbom_file}"
            ;;
        both)
            cyclonedx_file=$(generate_cyclonedx)
            spdx_file=$(generate_spdx)
            generate_vuln_report "${cyclonedx_file}"
            ;;
        *)
            log_error "Unknown SBOM format: ${SBOM_FORMAT}"
            exit 1
            ;;
    esac

    # Generate manifest file
    manifest_file="${SBOM_BASE}-manifest.json"
    cat > "${manifest_file}" << EOF
{
    "version": "1.0",
    "generated": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
    "image": "${IMAGE}",
    "artifacts": {
        "cyclonedx": "${SBOM_BASE}-cyclonedx.json",
        "spdx": "${SBOM_BASE}-spdx.json",
        "vulnerabilities": "${SBOM_BASE}-cyclonedx-vulns.json"
    },
    "verification": {
        "signatureKey": "cosign-public-key",
        "slsaLevel": 3,
        "sbomFormat": "CycloneDX 1.5"
    }
}
EOF

    log_info "=== SBOM Generation Complete ==="
    log_info "Manifest: ${manifest_file}"
}

main "$@"
