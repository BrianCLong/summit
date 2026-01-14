#!/usr/bin/env bash
# generate_provenance_manifest.sh v1.0.0
# Generates provenance.json manifest for GA Release Bundle
#
# This manifest provides cryptographic linkage between:
# - Build artifacts (tarballs, binaries)
# - SBOMs (source and container)
# - Vulnerability summaries
# - CI/CD metadata
#
# Usage: ./generate_provenance_manifest.sh --tag v4.1.2 --sha <commit> --bundle-dir <path>

set -euo pipefail

# --- Configuration ---
SCRIPT_VERSION="1.0.0"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

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
Usage: $0 --tag <tag> --sha <commit> --bundle-dir <path> [OPTIONS]

Generates provenance.json manifest for GA Release Bundle.

OPTIONS:
    --tag TAG              Release tag (e.g., v4.1.2)
    --sha SHA              Commit SHA the tag points to
    --bundle-dir DIR       Path to the release bundle directory
    --image-digest DIGEST  Container image digest (optional)
    --workflow-run ID      CI workflow run ID (optional)
    --help                 Show this help message

OUTPUT:
    <bundle-dir>/provenance.json  - Provenance manifest
    <bundle-dir>/SHA256SUMS       - Updated checksums file

EXAMPLES:
    $0 --tag v4.1.2 --sha a8b1963 --bundle-dir artifacts/release/v4.1.2
    $0 --tag v4.1.2 --sha a8b1963 --bundle-dir ./bundle --image-digest sha256:abc123
EOF
}

# --- SHA256 calculation ---
sha256_of_file() {
    local file="$1"
    if [[ -f "${file}" ]]; then
        sha256sum "${file}" | cut -d' ' -f1
    else
        echo ""
    fi
}

# --- File size ---
size_of_file() {
    local file="$1"
    if [[ -f "${file}" ]]; then
        wc -c < "${file}" | tr -d ' '
    else
        echo "0"
    fi
}

# --- Generate provenance manifest ---
generate_provenance() {
    local tag="$1"
    local sha="$2"
    local bundle_dir="$3"
    local image_digest="${4:-}"
    local workflow_run="${5:-}"
    local timestamp
    timestamp=$(date -u +"%Y-%m-%dT%H:%M:%SZ")

    log_info "Generating provenance manifest..."

    # Collect file hashes
    local source_sbom_path="${bundle_dir}/sbom/source.cdx.json"
    local container_sbom_path="${bundle_dir}/sbom/container.cdx.json"
    local source_vuln_path="${bundle_dir}/vuln/source-summary.json"
    local container_vuln_path="${bundle_dir}/vuln/container-summary.json"
    local release_inventory_path="${bundle_dir}/release-artifacts/inventory.json"
    local release_sums_path="${bundle_dir}/release-artifacts/SHA256SUMS"

    # Calculate SHA256 for each file
    local source_sbom_sha256
    source_sbom_sha256=$(sha256_of_file "${source_sbom_path}")
    local container_sbom_sha256
    container_sbom_sha256=$(sha256_of_file "${container_sbom_path}")
    local source_vuln_sha256
    source_vuln_sha256=$(sha256_of_file "${source_vuln_path}")
    local container_vuln_sha256
    container_vuln_sha256=$(sha256_of_file "${container_vuln_path}")
    local release_inventory_sha256
    release_inventory_sha256=$(sha256_of_file "${release_inventory_path}")
    local release_sums_sha256
    release_sums_sha256=$(sha256_of_file "${release_sums_path}")

    # Determine what exists
    local source_sbom_exists="false"
    local container_sbom_exists="false"
    local bundle_sbom_exists="false"
    local source_vuln_exists="false"
    local container_vuln_exists="false"
    local release_inventory_exists="false"
    local release_sums_exists="false"

    [[ -f "${source_sbom_path}" ]] && source_sbom_exists="true"
    [[ -f "${container_sbom_path}" ]] && container_sbom_exists="true"
    [[ -f "${bundle_dir}/sbom/bundle.cdx.json" ]] && bundle_sbom_exists="true"
    [[ -f "${source_vuln_path}" ]] && source_vuln_exists="true"
    [[ -f "${container_vuln_path}" ]] && container_vuln_exists="true"
    [[ -f "${release_inventory_path}" ]] && release_inventory_exists="true"
    [[ -f "${release_sums_path}" ]] && release_sums_exists="true"

    # Calculate size
    local source_sbom_size
    source_sbom_size=$(size_of_file "${source_sbom_path}")
    local container_sbom_size
    container_sbom_size=$(size_of_file "${container_sbom_path}")
    local bundle_sbom_size
    bundle_sbom_size=$(size_of_file "${bundle_dir}/sbom/bundle.cdx.json")
    local source_vuln_size
    source_vuln_size=$(size_of_file "${source_vuln_path}")
    local container_vuln_size
    container_vuln_size=$(size_of_file "${container_vuln_path}")
    local release_inventory_size
    release_inventory_size=$(size_of_file "${release_inventory_path}")
    local release_sums_size
    release_sums_size=$(size_of_file "${release_sums_path}")

    # Calculate bundle SBOM hash
    local bundle_sbom_sha256=""
    if [[ -f "${bundle_dir}/sbom/bundle.cdx.json" ]]; then
        bundle_sbom_sha256=$(sha256sum "${bundle_dir}/sbom/bundle.cdx.json" | cut -d' ' -f1)
    fi

    # Get version without 'v' prefix
    local version="${tag#v}"

    # Build the provenance JSON
    cat > "${bundle_dir}/provenance.json" <<EOF
{
  "_type": "https://summit.dev/provenance/v1",
  "version": "1.0.0",
  "generator": {
    "tool": "generate_provenance_manifest.sh",
    "version": "${SCRIPT_VERSION}"
  },
  "build": {
    "tag": "${tag}",
    "version": "${version}",
    "commit": "${sha}",
    "timestamp": "${timestamp}",
    "workflow_run": "${workflow_run:-unknown}"
  },
  "sbom": {
    "source": {
      "path": "sbom/source.cdx.json",
      "format": "CycloneDX 1.4",
      "exists": ${source_sbom_exists},
      "sha256": "${source_sbom_sha256}",
      "size_bytes": ${source_sbom_size}
    },
    "container": {
      "path": "sbom/container.cdx.json",
      "format": "CycloneDX 1.4",
      "exists": ${container_sbom_exists},
      "sha256": "${container_sbom_sha256}",
      "size_bytes": ${container_sbom_size},
      "image_digest": "${image_digest:-not_available}"
    },
    "bundle": {
      "path": "sbom/bundle.cdx.json",
      "format": "CycloneDX 1.5",
      "exists": ${bundle_sbom_exists},
      "sha256": "${bundle_sbom_sha256}",
      "size_bytes": ${bundle_sbom_size},
      "description": "Bundle contents inventory SBOM"
    }
  },
  "vulnerability_summaries": {
    "source": {
      "path": "vuln/source-summary.json",
      "exists": ${source_vuln_exists},
      "sha256": "${source_vuln_sha256}",
      "size_bytes": ${source_vuln_size}
    },
    "container": {
      "path": "vuln/container-summary.json",
      "exists": ${container_vuln_exists},
      "sha256": "${container_vuln_sha256}",
      "size_bytes": ${container_vuln_size}
    }
  },
  "release_artifacts": {
    "inventory": {
      "path": "release-artifacts/inventory.json",
      "exists": ${release_inventory_exists},
      "sha256": "${release_inventory_sha256}",
      "size_bytes": ${release_inventory_size}
    },
    "checksums": {
      "path": "release-artifacts/SHA256SUMS",
      "exists": ${release_sums_exists},
      "sha256": "${release_sums_sha256}",
      "size_bytes": ${release_sums_size}
    }
  },
  "verification": {
    "checksum_file": "SHA256SUMS",
    "signature_file": "provenance.json.sig",
    "instructions": "Verify with: sha256sum -c SHA256SUMS && cosign verify-blob --signature provenance.json.sig provenance.json"
  },
  "attestation_metadata": {
    "generated_at": "${timestamp}",
    "generator_commit": "$(git -C "$(dirname "$0")" rev-parse --short HEAD 2>/dev/null || echo 'unknown')",
    "runner_os": "${RUNNER_OS:-local}",
    "runner_arch": "${RUNNER_ARCH:-$(uname -m)}",
    "github_repository": "${GITHUB_REPOSITORY:-local}",
    "github_run_id": "${GITHUB_RUN_ID:-local}",
    "github_run_url": "${GITHUB_SERVER_URL:-https://github.com}/${GITHUB_REPOSITORY:-local}/actions/runs/${GITHUB_RUN_ID:-0}"
  }
}
EOF

    log_success "Generated provenance.json"
}

# --- Update SHA256SUMS ---
update_sha256sums() {
    local bundle_dir="$1"

    log_info "Updating SHA256SUMS..."

    # Generate checksums for all JSON files
    {
        find "${bundle_dir}" -type f \( -name "*.json" -o -name "*.cdx.json" \) | while read -r file; do
            local relpath="${file#${bundle_dir}/}"
            local checksum
            checksum=$(sha256_of_file "${file}")
            echo "${checksum}  ${relpath}"
        done
    } > "${bundle_dir}/SHA256SUMS"

    log_success "Updated SHA256SUMS with $(wc -l < "${bundle_dir}/SHA256SUMS" | tr -d ' ') entries"
}

# --- Main ---
main() {
    local tag=""
    local sha=""
    local bundle_dir=""
    local image_digest=""
    local workflow_run=""

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
            --bundle-dir)
                bundle_dir="$2"
                shift 2
                ;;
            --image-digest)
                image_digest="$2"
                shift 2
                ;;
            --workflow-run)
                workflow_run="$2"
                shift 2
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
    if [[ -z "${bundle_dir}" ]]; then
        log_error "Missing required argument: --bundle-dir"
        print_usage
        exit 2
    fi

    if [[ ! -d "${bundle_dir}" ]]; then
        log_error "Bundle directory does not exist: ${bundle_dir}"
        exit 2
    fi

    echo ""
    log_info "═══════════════════════════════════════════════════════════════"
    log_info "  Provenance Manifest Generation"
    log_info "═══════════════════════════════════════════════════════════════"
    log_info "Script version: ${SCRIPT_VERSION}"
    log_info "Tag: ${tag}"
    log_info "Commit: ${sha}"
    log_info "Bundle directory: ${bundle_dir}"
    [[ -n "${image_digest}" ]] && log_info "Image digest: ${image_digest}"
    [[ -n "${workflow_run}" ]] && log_info "Workflow run: ${workflow_run}"
    echo ""

    # Generate provenance manifest
    generate_provenance "${tag}" "${sha}" "${bundle_dir}" "${image_digest}" "${workflow_run}"

    # Update SHA256SUMS
    update_sha256sums "${bundle_dir}"

    # Summary
    echo ""
    log_success "═══════════════════════════════════════════════════════════════"
    log_success "  Provenance Manifest Complete"
    log_success "═══════════════════════════════════════════════════════════════"
    echo ""
    log_info "Generated files:"
    echo "  ${bundle_dir}/provenance.json"
    echo "  ${bundle_dir}/SHA256SUMS"
    echo ""
    log_info "To verify offline:"
    echo "  cd ${bundle_dir}"
    echo "  sha256sum -c SHA256SUMS"
    echo ""
}

main "$@"
