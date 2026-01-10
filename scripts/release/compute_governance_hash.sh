#!/usr/bin/env bash
# compute_governance_hash.sh v1.0.0
# Computes deterministic governance hash for release stamping
#
# The governance hash provides cryptographic binding between releases
# and the exact governance configuration in effect at release time.
#
# Usage:
#   ./compute_governance_hash.sh [--lockfile PATH] [--output PATH] [--json]
#
# Authority: docs/ci/GOVERNANCE_STAMPING.md

set -euo pipefail

# --- Configuration ---
SCRIPT_VERSION="1.0.0"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(git rev-parse --show-toplevel 2>/dev/null || echo ".")"

DEFAULT_LOCKFILE="${REPO_ROOT}/docs/releases/_state/governance_lockfile.json"
DEFAULT_OUTPUT_DIR="${REPO_ROOT}/artifacts/release-train"

# --- Logging ---
log_info() {
    echo "[INFO] $*" >&2
}

log_error() {
    echo "[ERROR] $*" >&2
}

# --- Usage ---
print_usage() {
    cat <<EOF
Usage: $0 [OPTIONS]

Computes deterministic governance hash for release stamping.

The governance hash is the SHA256 of the governance_lockfile.json file.
This hash cryptographically binds releases to the exact governance
configuration in effect at release time.

OPTIONS:
    --lockfile PATH       Path to governance lockfile (default: docs/releases/_state/governance_lockfile.json)
    --output PATH         Write JSON output to this file (optional)
    --json                Output full JSON instead of just hash
    --quiet               Only output the hash, no logging
    --help                Show this help message

OUTPUT:
    Default: Prints the governance hash (64-char hex string)
    --json:  Prints JSON with hash, source, commit, timestamp

EXAMPLES:
    # Get governance hash for current lockfile
    $0

    # Get hash for specific lockfile
    $0 --lockfile ./bundle/governance/governance_lockfile.json

    # Write JSON to artifacts
    $0 --output artifacts/release-train/governance_hash.json

    # JSON output to stdout
    $0 --json
EOF
}

# --- Main ---
main() {
    local lockfile="${DEFAULT_LOCKFILE}"
    local output_file=""
    local json_output=false
    local quiet=false

    # Parse arguments
    while [[ $# -gt 0 ]]; do
        case $1 in
            --lockfile)
                lockfile="$2"
                shift 2
                ;;
            --output)
                output_file="$2"
                shift 2
                ;;
            --json)
                json_output=true
                shift
                ;;
            --quiet)
                quiet=true
                shift
                ;;
            --help)
                print_usage
                exit 0
                ;;
            *)
                log_error "Unknown option: $1"
                print_usage
                exit 1
                ;;
        esac
    done

    # Validate lockfile exists
    if [[ ! -f "${lockfile}" ]]; then
        log_error "Governance lockfile not found: ${lockfile}"
        log_error "Generate one with: ./scripts/release/generate_governance_lockfile.sh --sha \$(git rev-parse HEAD)"
        exit 1
    fi

    # Compute hash
    local governance_hash
    governance_hash=$(sha256sum "${lockfile}" | cut -d' ' -f1)

    if [[ -z "${governance_hash}" ]]; then
        log_error "Failed to compute hash for: ${lockfile}"
        exit 1
    fi

    # Get commit SHA if available
    local git_sha=""
    if command -v git &>/dev/null && git rev-parse HEAD &>/dev/null; then
        git_sha=$(git rev-parse HEAD)
    fi

    # Get lockfile metadata if it's valid JSON
    local lockfile_sha=""
    local lockfile_tag=""
    if jq empty "${lockfile}" 2>/dev/null; then
        lockfile_sha=$(jq -r '.sha // empty' "${lockfile}" 2>/dev/null || echo "")
        lockfile_tag=$(jq -r '.tag // empty' "${lockfile}" 2>/dev/null || echo "")
    fi

    # Build JSON output
    local json_result
    json_result=$(jq -n \
        --arg version "${SCRIPT_VERSION}" \
        --arg governance_hash "${governance_hash}" \
        --arg source "$(basename "${lockfile}")" \
        --arg source_path "${lockfile}" \
        --arg lockfile_sha "${lockfile_sha}" \
        --arg lockfile_tag "${lockfile_tag}" \
        --arg git_sha "${git_sha}" \
        --arg computed_at "$(date -u +%Y-%m-%dT%H:%M:%SZ)" \
        '{
            version: $version,
            governance_hash: $governance_hash,
            source: $source,
            source_path: $source_path,
            lockfile_sha: (if $lockfile_sha != "" then $lockfile_sha else null end),
            lockfile_tag: (if $lockfile_tag != "" then $lockfile_tag else null end),
            git_sha: (if $git_sha != "" then $git_sha else null end),
            computed_at: $computed_at
        }')

    # Write to output file if specified
    if [[ -n "${output_file}" ]]; then
        mkdir -p "$(dirname "${output_file}")"
        echo "${json_result}" > "${output_file}"
        [[ "${quiet}" != "true" ]] && log_info "Governance hash written to: ${output_file}"
    fi

    # Output based on mode
    if [[ "${json_output}" == "true" ]]; then
        echo "${json_result}"
    else
        if [[ "${quiet}" != "true" ]]; then
            log_info "Governance hash: ${governance_hash}"
            log_info "Source: ${lockfile}"
            [[ -n "${lockfile_tag}" ]] && log_info "Tag: ${lockfile_tag}"
        fi
        echo "${governance_hash}"
    fi
}

main "$@"
