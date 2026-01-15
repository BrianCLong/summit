#!/usr/bin/env bash
# generate_bundle_sbom.sh v1.0.0
# Generates a CycloneDX 1.5 SBOM describing the release bundle contents
#
# Usage: ./generate_bundle_sbom.sh --bundle <dir> --tag v4.1.2 --sha <commit>
#
# This SBOM describes the bundle itself (files + hashes), not source dependencies.
# It provides a standards-friendly inventory for auditors and security tooling.

set -euo pipefail

# --- Configuration ---
SCRIPT_VERSION="1.0.0"
CYCLONEDX_SPEC_VERSION="1.5"
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
Usage: $0 --bundle <dir> --tag <tag> --sha <commit> [OPTIONS]

Generates a CycloneDX 1.5 SBOM describing the release bundle contents.

OPTIONS:
    --bundle DIR        Path to the release bundle directory
    --tag TAG           Release tag (e.g., v4.1.2)
    --sha SHA           Commit SHA
    --out DIR           Output directory (default: bundle dir)
    --kind KIND         Bundle kind: ga|rc (default: inferred from tag)
    --help              Show this help message

OUTPUT:
    <out>/sbom/bundle.cdx.json  - CycloneDX 1.5 bundle SBOM

EXAMPLES:
    $0 --bundle artifacts/release/v4.1.2 --tag v4.1.2 --sha a8b1963
    $0 --bundle ./bundle --tag v4.1.2-rc.1 --sha a8b1963 --kind rc
EOF
}

# --- Role mapping from filename ---
get_role_for_file() {
    local filename="$1"
    case "${filename}" in
        provenance.json)           echo "provenance" ;;
        SHA256SUMS)                echo "hashes" ;;
        bundle_index.json)         echo "bundle_index" ;;
        SBOM_MANIFEST.json)        echo "metadata" ;;
        github_release.md)         echo "release_notes" ;;
        PROMOTION_CHECKLIST.md)    echo "release_notes" ;;
        promote_to_ga.sh)          echo "promotion_commands" ;;
        REQUIRED_CHECKS.txt)       echo "required_checks" ;;
        WORKFLOW_METADATA.txt)     echo "metadata" ;;
        sbom/source.cdx.json)      echo "sbom_source" ;;
        sbom/container.cdx.json)   echo "sbom_container" ;;
        sbom/bundle.cdx.json)      echo "sbom_bundle" ;;
        vuln/source-summary.json)  echo "vuln_source" ;;
        vuln/container-summary.json) echo "vuln_container" ;;
        image_digests.json)        echo "image_digests" ;;
        image_digests.txt)         echo "image_digests" ;;
        *)                         echo "metadata" ;;
    esac
}

# --- Check if file is required for GA ---
is_required_for_ga() {
    local role="$1"
    case "${role}" in
        provenance|hashes|release_notes|sbom_source|required_checks)
            echo "true" ;;
        *)
            echo "false" ;;
    esac
}

# --- Get description for role ---
get_description_for_role() {
    local role="$1"
    case "${role}" in
        provenance)         echo "Master provenance manifest with SBOM references" ;;
        hashes)             echo "Checksums for bundle integrity verification" ;;
        bundle_index)       echo "Bundle inventory index" ;;
        release_notes)      echo "Release notes and documentation" ;;
        sbom_source)        echo "CycloneDX source code dependencies SBOM" ;;
        sbom_container)     echo "CycloneDX container image SBOM" ;;
        sbom_bundle)        echo "CycloneDX bundle contents SBOM (this file)" ;;
        vuln_source)        echo "Source code vulnerability scan results" ;;
        vuln_container)     echo "Container image vulnerability scan results" ;;
        image_digests)      echo "Container image digest information" ;;
        required_checks)    echo "CI required checks verification snapshot" ;;
        promotion_commands) echo "RC to GA promotion commands" ;;
        metadata)           echo "Bundle metadata" ;;
        *)                  echo "Bundle file" ;;
    esac
}

# --- JSON escape helper ---
json_escape() {
    local str="$1"
    # Escape backslashes, double quotes, and control characters
    printf '%s' "$str" | sed 's/\\/\\\\/g; s/"/\\"/g; s/\t/\\t/g'
}

# --- Generate serial number ---
generate_serial_number() {
    local tag="$1"
    local sha="$2"
    local sha_prefix="${sha:0:8}"
    echo "urn:uuid:summit-bundle-${tag}-${sha_prefix}"
}

# --- Generate component JSON ---
generate_component_json() {
    local filepath="$1"
    local sha256="$2"
    local role="$3"
    local required="$4"
    local description="$5"
    local bomref="file:${filepath}"

    cat <<EOF
    {
      "type": "file",
      "bom-ref": "$(json_escape "${bomref}")",
      "name": "$(json_escape "${filepath}")",
      "description": "$(json_escape "${description}")",
      "hashes": [
        {
          "alg": "SHA-256",
          "content": "${sha256}"
        }
      ],
      "properties": [
        { "name": "bundle:role", "value": "${role}" },
        { "name": "bundle:required", "value": "${required}" }
      ]
    }
EOF
}

# --- Main generation ---
generate_bundle_sbom() {
    local bundle_dir="$1"
    local tag="$2"
    local sha="$3"
    local kind="$4"
    local out_dir="$5"

    local serial_number
    serial_number=$(generate_serial_number "${tag}" "${sha}")

    local output_file="${out_dir}/sbom/bundle.cdx.json"
    mkdir -p "$(dirname "${output_file}")"

    log_info "Generating bundle SBOM..."
    log_info "  Tag: ${tag}"
    log_info "  Commit: ${sha}"
    log_info "  Kind: ${kind}"
    log_info "  Serial: ${serial_number}"

    # Collect all files in the bundle (excluding the bundle SBOM itself initially)
    local files=()
    local roles=()
    local sha256s=()

    # Find all files in the bundle, sort by path for determinism
    while IFS= read -r file; do
        local relpath="${file#${bundle_dir}/}"

        # Skip the bundle SBOM itself (we're generating it)
        [[ "${relpath}" == "sbom/bundle.cdx.json" ]] && continue

        # Skip hidden files
        [[ "${relpath}" == .* ]] && continue

        local sha256
        sha256=$(sha256sum "${file}" | cut -d' ' -f1)
        local role
        role=$(get_role_for_file "${relpath}")

        files+=("${relpath}")
        roles+=("${role}")
        sha256s+=("${sha256}")
    done < <(find "${bundle_dir}" -type f | sort)

    # Start building JSON
    {
        cat <<EOF
{
  "bomFormat": "CycloneDX",
  "specVersion": "${CYCLONEDX_SPEC_VERSION}",
  "serialNumber": "${serial_number}",
  "version": 1,
  "metadata": {
    "component": {
      "type": "application",
      "bom-ref": "summit-release-bundle",
      "name": "summit-release-bundle",
      "version": "${tag}",
      "description": "Summit Platform ${kind^^} Release Bundle",
      "purl": "pkg:generic/summit-release-bundle@${tag}"
    },
    "properties": [
      { "name": "bundle:tag", "value": "${tag}" },
      { "name": "bundle:commit", "value": "${sha}" },
      { "name": "bundle:kind", "value": "${kind}" },
      { "name": "bundle:format_version", "value": "1.0" },
      { "name": "bundle:generator", "value": "generate_bundle_sbom.sh v${SCRIPT_VERSION}" }
    ]
  },
  "components": [
EOF

        # Generate components
        local first=true
        local count=0
        for i in "${!files[@]}"; do
            local file="${files[$i]}"
            local role="${roles[$i]}"
            local sha256="${sha256s[$i]}"
            local required
            required=$(is_required_for_ga "${role}")
            local description
            description=$(get_description_for_role "${role}")

            if [[ "${first}" != "true" ]]; then
                echo ","
            fi
            first=false

            generate_component_json "${file}" "${sha256}" "${role}" "${required}" "${description}"
            ((count++))
        done

        # Close components array and add external references
        cat <<EOF

  ],
  "externalReferences": [
EOF

        # Add external references for SBOMs if they exist
        local ext_first=true
        if [[ -f "${bundle_dir}/sbom/source.cdx.json" ]]; then
            echo '    {'
            echo '      "type": "bom",'
            echo '      "url": "sbom/source.cdx.json",'
            echo '      "comment": "Source code dependencies SBOM"'
            echo '    }'
            ext_first=false
        fi

        if [[ -f "${bundle_dir}/sbom/container.cdx.json" ]]; then
            [[ "${ext_first}" != "true" ]] && echo ","
            echo '    {'
            echo '      "type": "bom",'
            echo '      "url": "sbom/container.cdx.json",'
            echo '      "comment": "Container image SBOM"'
            echo '    }'
        fi

        cat <<EOF

  ]
}
EOF
    } > "${output_file}"

    # Verify valid JSON
    if command -v jq &> /dev/null; then
        if ! jq empty "${output_file}" 2>/dev/null; then
            log_error "Generated invalid JSON"
            return 1
        fi
    fi

    log_success "Generated ${output_file}"
    log_info "  Components: ${#files[@]} files"
}

# --- Main ---
main() {
    local bundle_dir=""
    local tag=""
    local sha=""
    local out_dir=""
    local kind=""

    # Parse arguments
    while [[ $# -gt 0 ]]; do
        case $1 in
            --bundle)
                bundle_dir="$2"
                shift 2
                ;;
            --tag)
                tag="$2"
                shift 2
                ;;
            --sha)
                sha="$2"
                shift 2
                ;;
            --out)
                out_dir="$2"
                shift 2
                ;;
            --kind)
                kind="$2"
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
    if [[ -z "${bundle_dir}" ]]; then
        log_error "Missing required argument: --bundle"
        print_usage
        exit 2
    fi
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

    # Validate bundle directory exists
    if [[ ! -d "${bundle_dir}" ]]; then
        log_error "Bundle directory does not exist: ${bundle_dir}"
        exit 2
    fi

    # Set defaults
    [[ -z "${out_dir}" ]] && out_dir="${bundle_dir}"

    # Infer kind from tag if not specified
    if [[ -z "${kind}" ]]; then
        if [[ "${tag}" == *"-rc"* ]]; then
            kind="rc"
        else
            kind="ga"
        fi
    fi

    echo ""
    log_info "═══════════════════════════════════════════════════════════════"
    log_info "  Bundle SBOM Generator"
    log_info "═══════════════════════════════════════════════════════════════"
    log_info "Script version: ${SCRIPT_VERSION}"
    log_info "CycloneDX version: ${CYCLONEDX_SPEC_VERSION}"
    log_info "Bundle: ${bundle_dir}"
    log_info "Tag: ${tag}"
    log_info "Commit: ${sha}"
    log_info "Kind: ${kind}"
    log_info "Output: ${out_dir}"
    echo ""

    # Generate the bundle SBOM
    generate_bundle_sbom "${bundle_dir}" "${tag}" "${sha}" "${kind}" "${out_dir}"

    # Summary
    echo ""
    log_success "═══════════════════════════════════════════════════════════════"
    log_success "  Bundle SBOM Generation Complete"
    log_success "═══════════════════════════════════════════════════════════════"
    echo ""
    log_info "Output: ${out_dir}/sbom/bundle.cdx.json"
    echo ""
    log_info "To verify:"
    echo "  jq empty ${out_dir}/sbom/bundle.cdx.json"
    echo "  jq '.components | length' ${out_dir}/sbom/bundle.cdx.json"
    echo ""
}

main "$@"
