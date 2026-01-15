#!/usr/bin/env bash
# collect_sbom_artifacts.sh v1.0.0
# Collects and normalizes SBOM/vulnerability artifacts for GA Release Bundle
#
# Usage: ./collect_sbom_artifacts.sh --tag v4.1.2 --sha <commit> --out artifacts/release/<tag>/
#
# This script:
# 1. Downloads existing SBOM artifacts from supply-chain-integrity workflow (if available)
# 2. Falls back to local generation with Syft/Grype if not available
# 3. Normalizes filenames to canonical structure
#
# Canonical layout:
#   sbom/source.cdx.json         - CycloneDX source SBOM
#   sbom/container.cdx.json      - CycloneDX container SBOM (if available)
#   vuln/source-summary.json     - Vulnerability summary for source
#   vuln/container-summary.json  - Vulnerability summary for container (if available)

set -euo pipefail

# --- Configuration ---
SCRIPT_VERSION="1.0.0"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(git rev-parse --show-toplevel)"

# --- Color output ---
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log_info() { echo -e "${BLUE}[INFO]${NC} $*" >&2; }
log_success() { echo -e "${GREEN}[SUCCESS]${NC} $*"; }
log_warn() { echo -e "${YELLOW}[WARN]${NC} $*" >&2; }
log_error() { echo -e "${RED}[ERROR]${NC} $*" >&2; }

print_usage() {
    cat <<EOF
Usage: $0 --tag <tag> --sha <commit> --out <output-dir> [OPTIONS]

Collects and normalizes SBOM/vulnerability artifacts for GA Release Bundle.

OPTIONS:
    --tag TAG                    Release tag (e.g., v4.1.2)
    --sha SHA                    Commit SHA the tag points to
    --out DIR                    Output directory (e.g., artifacts/release/v4.1.2)
    --allow-missing-container    Allow missing container SBOM (default: false)
    --generate-local             Force local generation (skip CI artifact download)
    --help                       Show this help message

CANONICAL OUTPUT STRUCTURE:
    <out>/sbom/source.cdx.json         - CycloneDX source SBOM
    <out>/sbom/container.cdx.json      - CycloneDX container SBOM
    <out>/vuln/source-summary.json     - Source vulnerability summary
    <out>/vuln/container-summary.json  - Container vulnerability summary

EXAMPLES:
    $0 --tag v4.1.2 --sha a8b1963 --out artifacts/release/v4.1.2
    $0 --tag v4.1.2 --sha a8b1963 --out ./bundle --allow-missing-container
    $0 --tag v4.1.2 --sha a8b1963 --out ./bundle --generate-local
EOF
}

# --- Version extraction ---
extract_version_from_tag() {
    local tag="$1"
    echo "${tag}" | sed -E 's/^v//'
}

# --- CI Artifact Download ---
download_ci_artifacts() {
    local sha="$1"
    local version="$2"
    local temp_dir="$3"

    log_info "Attempting to download SBOM artifacts from CI..."

    # Check if gh CLI is available and authenticated
    if ! command -v gh &> /dev/null; then
        log_warn "gh CLI not available - cannot download CI artifacts"
        return 1
    fi

    # Find workflow runs for this commit
    local run_id
    run_id=$(gh run list --commit "${sha}" --workflow "supply-chain-integrity.yml" \
        --json databaseId,conclusion \
        --jq '.[] | select(.conclusion == "success") | .databaseId' \
        2>/dev/null | head -1)

    if [[ -z "${run_id}" ]]; then
        log_warn "No successful supply-chain-integrity workflow found for commit ${sha}"
        return 1
    fi

    log_info "Found workflow run: ${run_id}"

    # Download source SBOMs
    local source_artifact="sboms-source-${version}"
    if gh run download "${run_id}" --name "${source_artifact}" --dir "${temp_dir}/source" 2>/dev/null; then
        log_success "Downloaded source SBOM artifact: ${source_artifact}"
        SOURCE_SBOM_DOWNLOADED=true
    else
        log_warn "Could not download ${source_artifact}"
        SOURCE_SBOM_DOWNLOADED=false
    fi

    # Download container SBOMs
    local container_artifact="sboms-container-${version}"
    if gh run download "${run_id}" --name "${container_artifact}" --dir "${temp_dir}/container" 2>/dev/null; then
        log_success "Downloaded container SBOM artifact: ${container_artifact}"
        CONTAINER_SBOM_DOWNLOADED=true
    else
        log_warn "Could not download ${container_artifact}"
        CONTAINER_SBOM_DOWNLOADED=false
    fi

    # Download source vulnerability reports
    local source_vuln_artifact="vulnerability-reports-source-${version}"
    if gh run download "${run_id}" --name "${source_vuln_artifact}" --dir "${temp_dir}/vuln-source" 2>/dev/null; then
        log_success "Downloaded source vulnerability report: ${source_vuln_artifact}"
        SOURCE_VULN_DOWNLOADED=true
    else
        log_warn "Could not download ${source_vuln_artifact}"
        SOURCE_VULN_DOWNLOADED=false
    fi

    # Download container vulnerability reports
    local container_vuln_artifact="vulnerability-reports-container-${version}"
    if gh run download "${run_id}" --name "${container_vuln_artifact}" --dir "${temp_dir}/vuln-container" 2>/dev/null; then
        log_success "Downloaded container vulnerability report: ${container_vuln_artifact}"
        CONTAINER_VULN_DOWNLOADED=true
    else
        log_warn "Could not download ${container_vuln_artifact}"
        CONTAINER_VULN_DOWNLOADED=false
    fi

    # Return success if we got at least source SBOM
    [[ "${SOURCE_SBOM_DOWNLOADED}" == "true" ]]
}

# --- Local SBOM Generation ---
generate_local_sbom() {
    local output_dir="$1"

    log_info "Generating source SBOM locally with Syft..."

    if ! command -v syft &> /dev/null; then
        log_error "syft is required for local SBOM generation"
        log_error "Install: curl -sSfL https://raw.githubusercontent.com/anchore/syft/main/install.sh | sh -s -- -b /usr/local/bin"
        return 1
    fi

    mkdir -p "${output_dir}/sbom"

    # Generate source SBOM
    syft packages dir:"${REPO_ROOT}" \
        -o cyclonedx-json \
        --file "${output_dir}/sbom/source.cdx.json" \
        2>/dev/null

    log_success "Generated source.cdx.json"

    # Generate vulnerability report if grype is available
    if command -v grype &> /dev/null; then
        log_info "Generating vulnerability report with Grype..."
        mkdir -p "${output_dir}/vuln"

        grype dir:"${REPO_ROOT}" \
            -o json \
            --file "${output_dir}/vuln/source-summary.json" \
            2>/dev/null || true

        log_success "Generated source-summary.json"
    else
        log_warn "grype not available - skipping vulnerability report"
    fi
}

# --- Normalize Downloaded Artifacts ---
normalize_artifacts() {
    local temp_dir="$1"
    local output_dir="$2"
    local version="$3"

    log_info "Normalizing artifacts to canonical structure..."

    mkdir -p "${output_dir}/sbom"
    mkdir -p "${output_dir}/vuln"

    # Normalize source SBOM
    if [[ -d "${temp_dir}/source" ]]; then
        # Find CycloneDX file (prefer .cdx.json)
        local source_sbom
        source_sbom=$(find "${temp_dir}/source" -name "*.cdx.json" -type f 2>/dev/null | head -1)

        if [[ -z "${source_sbom}" ]]; then
            # Fall back to any JSON SBOM
            source_sbom=$(find "${temp_dir}/source" -name "*.json" -type f 2>/dev/null | head -1)
        fi

        if [[ -n "${source_sbom}" ]]; then
            cp "${source_sbom}" "${output_dir}/sbom/source.cdx.json"
            log_success "Normalized source SBOM: sbom/source.cdx.json"
        fi
    fi

    # Normalize container SBOM
    if [[ -d "${temp_dir}/container" ]]; then
        local container_sbom
        container_sbom=$(find "${temp_dir}/container" -name "*container*.cdx.json" -type f 2>/dev/null | head -1)

        if [[ -z "${container_sbom}" ]]; then
            container_sbom=$(find "${temp_dir}/container" -name "*.cdx.json" -type f 2>/dev/null | head -1)
        fi

        if [[ -z "${container_sbom}" ]]; then
            container_sbom=$(find "${temp_dir}/container" -name "*.json" -type f 2>/dev/null | head -1)
        fi

        if [[ -n "${container_sbom}" ]]; then
            cp "${container_sbom}" "${output_dir}/sbom/container.cdx.json"
            log_success "Normalized container SBOM: sbom/container.cdx.json"
        fi
    fi

    # Normalize source vulnerability report
    if [[ -d "${temp_dir}/vuln-source" ]]; then
        local source_vuln
        source_vuln=$(find "${temp_dir}/vuln-source" -name "*.json" -type f 2>/dev/null | head -1)

        if [[ -n "${source_vuln}" ]]; then
            cp "${source_vuln}" "${output_dir}/vuln/source-summary.json"
            log_success "Normalized source vulnerability report: vuln/source-summary.json"
        fi
    fi

    # Normalize container vulnerability report
    if [[ -d "${temp_dir}/vuln-container" ]]; then
        local container_vuln
        container_vuln=$(find "${temp_dir}/vuln-container" -name "*.json" -type f 2>/dev/null | head -1)

        if [[ -n "${container_vuln}" ]]; then
            cp "${container_vuln}" "${output_dir}/vuln/container-summary.json"
            log_success "Normalized container vulnerability report: vuln/container-summary.json"
        fi
    fi
}

# --- Generate Collection Manifest ---
generate_manifest() {
    local output_dir="$1"
    local tag="$2"
    local sha="$3"
    local timestamp
    timestamp=$(date -u +"%Y-%m-%dT%H:%M:%SZ")

    log_info "Generating SBOM collection manifest..."

    local source_sbom_exists="false"
    local container_sbom_exists="false"
    local source_vuln_exists="false"
    local container_vuln_exists="false"
    local source_sbom_sha256=""
    local container_sbom_sha256=""
    local source_vuln_sha256=""
    local container_vuln_sha256=""

    if [[ -f "${output_dir}/sbom/source.cdx.json" ]]; then
        source_sbom_exists="true"
        source_sbom_sha256=$(sha256sum "${output_dir}/sbom/source.cdx.json" | cut -d' ' -f1)
    fi

    if [[ -f "${output_dir}/sbom/container.cdx.json" ]]; then
        container_sbom_exists="true"
        container_sbom_sha256=$(sha256sum "${output_dir}/sbom/container.cdx.json" | cut -d' ' -f1)
    fi

    if [[ -f "${output_dir}/vuln/source-summary.json" ]]; then
        source_vuln_exists="true"
        source_vuln_sha256=$(sha256sum "${output_dir}/vuln/source-summary.json" | cut -d' ' -f1)
    fi

    if [[ -f "${output_dir}/vuln/container-summary.json" ]]; then
        container_vuln_exists="true"
        container_vuln_sha256=$(sha256sum "${output_dir}/vuln/container-summary.json" | cut -d' ' -f1)
    fi

    cat > "${output_dir}/SBOM_MANIFEST.json" <<EOF
{
  "version": "1.0.0",
  "tag": "${tag}",
  "commit": "${sha}",
  "timestamp": "${timestamp}",
  "generator": "collect_sbom_artifacts.sh v${SCRIPT_VERSION}",
  "sbom": {
    "source": {
      "path": "sbom/source.cdx.json",
      "format": "CycloneDX",
      "exists": ${source_sbom_exists},
      "sha256": "${source_sbom_sha256}"
    },
    "container": {
      "path": "sbom/container.cdx.json",
      "format": "CycloneDX",
      "exists": ${container_sbom_exists},
      "sha256": "${container_sbom_sha256}"
    }
  },
  "vulnerability_summaries": {
    "source": {
      "path": "vuln/source-summary.json",
      "exists": ${source_vuln_exists},
      "sha256": "${source_vuln_sha256}"
    },
    "container": {
      "path": "vuln/container-summary.json",
      "exists": ${container_vuln_exists},
      "sha256": "${container_vuln_sha256}"
    }
  }
}
EOF

    log_success "Generated SBOM_MANIFEST.json"
}

# --- Validation ---
validate_output() {
    local output_dir="$1"
    local allow_missing_container="$2"

    log_info "Validating collected artifacts..."

    local errors=0

    # Source SBOM is always required
    if [[ ! -f "${output_dir}/sbom/source.cdx.json" ]]; then
        log_error "MISSING: sbom/source.cdx.json (required)"
        ((errors++))
    else
        log_success "FOUND: sbom/source.cdx.json"
    fi

    # Container SBOM (required unless --allow-missing-container)
    if [[ ! -f "${output_dir}/sbom/container.cdx.json" ]]; then
        if [[ "${allow_missing_container}" == "true" ]]; then
            log_warn "MISSING: sbom/container.cdx.json (allowed by --allow-missing-container)"
        else
            log_error "MISSING: sbom/container.cdx.json (required)"
            ((errors++))
        fi
    else
        log_success "FOUND: sbom/container.cdx.json"
    fi

    # Source vulnerability summary (optional but recommended)
    if [[ -f "${output_dir}/vuln/source-summary.json" ]]; then
        log_success "FOUND: vuln/source-summary.json"
    else
        log_warn "MISSING: vuln/source-summary.json (optional)"
    fi

    # Container vulnerability summary (optional)
    if [[ -f "${output_dir}/vuln/container-summary.json" ]]; then
        log_success "FOUND: vuln/container-summary.json"
    else
        log_warn "MISSING: vuln/container-summary.json (optional)"
    fi

    return "${errors}"
}

# --- Main ---
main() {
    local tag=""
    local sha=""
    local output_dir=""
    local allow_missing_container="false"
    local generate_local="false"

    # Parse arguments
    while [[ $# -gt 0 ]]; do
        case $1 in
            --tag)
                tag="$2"
                shift 2
                ;;
            --sha)
                sha="$2"
                shift 2
                ;;
            --out)
                output_dir="$2"
                shift 2
                ;;
            --allow-missing-container)
                allow_missing_container="true"
                shift
                ;;
            --generate-local)
                generate_local="true"
                shift
                ;;
            --help)
                print_usage
                exit 0
                ;;
            *)
                log_error "Unknown option: $1"
                print_usage
                exit 2
                ;;
        esac
    done

    # Validate required arguments
    if [[ -z "${tag}" ]]; then
        log_error "Missing required argument: --tag"
        print_usage
        exit 2
    fi
    if [[ -z "${sha}" ]]; then
        log_error "Missing required argument: --sha"
        print_usage
        exit 2
    fi
    if [[ -z "${output_dir}" ]]; then
        log_error "Missing required argument: --out"
        print_usage
        exit 2
    fi

    local version
    version=$(extract_version_from_tag "${tag}")

    echo ""
    log_info "═══════════════════════════════════════════════════════════════"
    log_info "  SBOM Artifact Collection"
    log_info "═══════════════════════════════════════════════════════════════"
    log_info "Script version: ${SCRIPT_VERSION}"
    log_info "Tag: ${tag}"
    log_info "Version: ${version}"
    log_info "Commit: ${sha}"
    log_info "Output: ${output_dir}"
    log_info "Allow missing container: ${allow_missing_container}"
    log_info "Force local generation: ${generate_local}"
    echo ""

    # Create output directory
    mkdir -p "${output_dir}"

    # Create temp directory for downloads
    local temp_dir
    temp_dir=$(mktemp -d)
    trap 'rm -rf "${temp_dir}"' EXIT

    # Try CI download first (unless --generate-local)
    local ci_success="false"
    if [[ "${generate_local}" != "true" ]]; then
        if download_ci_artifacts "${sha}" "${version}" "${temp_dir}"; then
            ci_success="true"
            normalize_artifacts "${temp_dir}" "${output_dir}" "${version}"
        fi
    fi

    # Fall back to local generation if CI download failed
    if [[ "${ci_success}" != "true" ]]; then
        log_info "Falling back to local SBOM generation..."
        generate_local_sbom "${output_dir}"
    fi

    # Generate manifest
    generate_manifest "${output_dir}" "${tag}" "${sha}"

    # Validate
    echo ""
    if ! validate_output "${output_dir}" "${allow_missing_container}"; then
        log_error "Validation failed - required artifacts missing"
        exit 1
    fi

    # Summary
    echo ""
    log_success "═══════════════════════════════════════════════════════════════"
    log_success "  SBOM Collection Complete"
    log_success "═══════════════════════════════════════════════════════════════"
    echo ""
    log_info "Collected artifacts:"
    find "${output_dir}" -type f -name "*.json" | while read -r file; do
        local relpath="${file#${output_dir}/}"
        local size
        size=$(wc -c < "${file}" | tr -d ' ')
        echo "  ${relpath} (${size} bytes)"
    done
    echo ""
}

main "$@"
