#!/usr/bin/env bash
# update_redaction_metrics_timeseries.sh v1.1.0
# Maintains a counts-only time series of redaction metrics
#
# This script:
# 1. Reads current metrics from redaction_health.json and deployment_marker.json
# 2. Appends to historical time series
# 3. Maintains a capped history (default 60 entries)
#
# Authority: docs/ci/REDACTION_METRICS_TRENDS.md

set -euo pipefail

# --- Configuration ---
SCRIPT_VERSION="1.0.0"
DEFAULT_MAX_ENTRIES=60

# --- Logging ---
log_info() {
    echo "[INFO] $*" >&2
}

log_warn() {
    echo "[WARN] $*" >&2
}

log_error() {
    echo "[ERROR] $*" >&2
}

# --- Usage ---
print_usage() {
    cat <<EOF
Usage: $0 [OPTIONS]

Maintains a counts-only time series of redaction metrics.

OPTIONS:
    --site-dir DIR        Site directory containing source files
                          (default: site/release-ops)
    --max-entries N       Maximum history entries to keep (default: ${DEFAULT_MAX_ENTRIES})
    --run-id ID           GitHub workflow run ID
    --git-sha SHA         Git commit SHA
    --governance-hash H   SHA256 of governance lockfile (optional, auto-detected)
    --verbose             Enable verbose logging
    --help                Show this help message

SOURCE FILES (in site-dir):
    redaction_health.json     Health level and redaction counts
    deployment_marker.json    Deployment status and rollback info

OUTPUT FILE:
    redaction_metrics_timeseries.json (in site-dir)

EXAMPLES:
    # Update time series from site directory
    $0 --site-dir site/release-ops

    # With run metadata
    $0 --site-dir site/release-ops --run-id 12345678 --git-sha abc1234

    # Custom history limit
    $0 --site-dir site/release-ops --max-entries 30
EOF
}

# --- JSON Helpers ---

# Extract a field from JSON with fallback
json_get() {
    local file="$1"
    local field="$2"
    local default="${3:-}"

    if [[ -f "${file}" ]] && command -v jq &>/dev/null; then
        local value
        value=$(jq -r "${field} // empty" "${file}" 2>/dev/null || echo "")
        if [[ -n "${value}" && "${value}" != "null" ]]; then
            echo "${value}"
        else
            echo "${default}"
        fi
    else
        echo "${default}"
    fi
}

json_get_number() {
    local file="$1"
    local field="$2"
    local default="${3:-0}"

    if [[ -f "${file}" ]] && command -v jq &>/dev/null; then
        local value
        value=$(jq -r "${field} // ${default}" "${file}" 2>/dev/null || echo "${default}")
        # Ensure it's a number
        if [[ "${value}" =~ ^[0-9]+$ ]]; then
            echo "${value}"
        else
            echo "${default}"
        fi
    else
        echo "${default}"
    fi
}

# --- Main Functions ---

init_timeseries() {
    local output_file="$1"

    if [[ ! -f "${output_file}" ]]; then
        cat > "${output_file}" <<EOF
{
  "version": "1.0",
  "series": []
}
EOF
        log_info "Initialized new time series file"
    fi
}

collect_metrics() {
    local site_dir="$1"
    local run_id="$2"
    local git_sha="$3"
    local governance_hash="$4"
    local verbose="$5"

    local health_file="${site_dir}/redaction_health.json"
    local marker_file="${site_dir}/deployment_marker.json"

    # Current timestamp
    local date_utc
    local timestamp_utc
    date_utc=$(date -u +%Y-%m-%d)
    timestamp_utc=$(date -u +"%Y-%m-%dT%H:%M:%SZ")

    # Read from health file
    local health_level="UNKNOWN"
    local forbidden_hits=0
    local tokens_redacted=0
    local internal_domains_redacted=0
    local issue_links_redacted=0
    local pr_links_redacted=0
    local state_refs_redacted=0
    local run_ids_redacted=0

    if [[ -f "${health_file}" ]]; then
        [[ "${verbose}" == "true" ]] && log_info "Reading health from: ${health_file}"
        health_level=$(json_get "${health_file}" ".level" "UNKNOWN")
        forbidden_hits=$(json_get_number "${health_file}" ".counts.forbidden_hits" 0)
        tokens_redacted=$(json_get_number "${health_file}" ".counts.tokens_redacted" 0)
        internal_domains_redacted=$(json_get_number "${health_file}" ".counts.domains_redacted" 0)
        issue_links_redacted=$(json_get_number "${health_file}" ".counts.issue_links_redacted" 0)
        pr_links_redacted=$(json_get_number "${health_file}" ".counts.pr_links_redacted" 0)
        state_refs_redacted=$(json_get_number "${health_file}" ".counts.state_refs_redacted" 0)
        run_ids_redacted=$(json_get_number "${health_file}" ".counts.run_ids_redacted" 0)
    else
        [[ "${verbose}" == "true" ]] && log_warn "Health file not found: ${health_file}"
    fi

    # Read from deployment marker
    local deployment_status="UNKNOWN"
    local rollback_reason="none"

    if [[ -f "${marker_file}" ]]; then
        [[ "${verbose}" == "true" ]] && log_info "Reading marker from: ${marker_file}"
        deployment_status=$(json_get "${marker_file}" ".status" "UNKNOWN")
        rollback_reason=$(json_get "${marker_file}" ".rollback_reason" "none")

        # Override run_id and git_sha from marker if not provided
        if [[ -z "${run_id}" ]]; then
            run_id=$(json_get "${marker_file}" ".run_id" "")
        fi
        if [[ -z "${git_sha}" ]]; then
            git_sha=$(json_get "${marker_file}" ".git_sha" "")
        fi
    else
        [[ "${verbose}" == "true" ]] && log_warn "Marker file not found: ${marker_file}"
    fi

    # Get short SHA
    local git_sha_short=""
    if [[ -n "${git_sha}" && "${git_sha}" != "unknown" ]]; then
        git_sha_short="${git_sha:0:7}"
    fi

    # Build entry JSON
    local run_id_json="null"
    if [[ -n "${run_id}" && "${run_id}" != "null" ]]; then
        run_id_json="${run_id}"
    fi

    local gov_hash_json="null"
    if [[ -n "${governance_hash}" ]]; then
        gov_hash_json="\"${governance_hash}\""
    fi

    cat <<EOF
{
  "date_utc": "${date_utc}",
  "timestamp_utc": "${timestamp_utc}",
  "run_id": ${run_id_json},
  "git_sha_short": "${git_sha_short}",
  "governance_hash": ${gov_hash_json},
  "health_level": "${health_level}",
  "deployment_status": "${deployment_status}",
  "rollback_reason": "${rollback_reason}",
  "tokens_redacted": ${tokens_redacted},
  "internal_domains_redacted": ${internal_domains_redacted},
  "issue_links_redacted": ${issue_links_redacted},
  "pr_links_redacted": ${pr_links_redacted},
  "state_refs_redacted": ${state_refs_redacted},
  "run_ids_redacted": ${run_ids_redacted},
  "forbidden_hits": ${forbidden_hits}
}
EOF
}

append_to_timeseries() {
    local timeseries_file="$1"
    local new_entry="$2"
    local max_entries="$3"

    # Use jq to append and trim
    local updated
    updated=$(jq --argjson entry "${new_entry}" --argjson max "${max_entries}" '
        # Add new entry at the beginning
        .series = ([$entry] + .series) |
        # Keep only max entries, sorted by timestamp (newest first)
        .series = (.series | sort_by(.timestamp_utc) | reverse | .[:$max])
    ' "${timeseries_file}")

    echo "${updated}" | jq -S . > "${timeseries_file}.tmp"
    mv "${timeseries_file}.tmp" "${timeseries_file}"
}

# --- Main ---
main() {
    local site_dir="site/release-ops"
    local max_entries="${DEFAULT_MAX_ENTRIES}"
    local run_id=""
    local git_sha=""
    local governance_hash=""
    local verbose=false

    # Parse arguments
    while [[ $# -gt 0 ]]; do
        case $1 in
            --site-dir)
                site_dir="$2"
                shift 2
                ;;
            --max-entries)
                max_entries="$2"
                shift 2
                ;;
            --run-id)
                run_id="$2"
                shift 2
                ;;
            --git-sha)
                git_sha="$2"
                shift 2
                ;;
            --governance-hash)
                governance_hash="$2"
                shift 2
                ;;
            --verbose)
                verbose=true
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

    # Check for jq
    if ! command -v jq &>/dev/null; then
        log_error "jq is required but not found"
        exit 1
    fi

    # Validate site directory
    if [[ ! -d "${site_dir}" ]]; then
        log_error "Site directory not found: ${site_dir}"
        exit 1
    fi

    local timeseries_file="${site_dir}/redaction_metrics_timeseries.json"

    log_info "Updating redaction metrics time series..."
    log_info "  Site dir: ${site_dir}"
    log_info "  Max entries: ${max_entries}"

    # Auto-detect governance hash if not provided
    if [[ -z "${governance_hash}" ]]; then
        local repo_root
        repo_root=$(git rev-parse --show-toplevel 2>/dev/null || echo "")
        if [[ -n "${repo_root}" && -f "${repo_root}/docs/releases/_state/governance_lockfile.json" ]]; then
            governance_hash=$(sha256sum "${repo_root}/docs/releases/_state/governance_lockfile.json" 2>/dev/null | cut -d' ' -f1 || echo "")
            [[ "${verbose}" == "true" && -n "${governance_hash}" ]] && log_info "Auto-detected governance hash: ${governance_hash:0:12}..."
        fi
    fi

    # Initialize if needed
    init_timeseries "${timeseries_file}"

    # Collect current metrics
    local entry
    entry=$(collect_metrics "${site_dir}" "${run_id}" "${git_sha}" "${governance_hash}" "${verbose}")

    [[ "${verbose}" == "true" ]] && log_info "New entry: $(echo "${entry}" | jq -c .)"

    # Append to time series
    append_to_timeseries "${timeseries_file}" "${entry}" "${max_entries}"

    # Summary
    local entry_count
    entry_count=$(jq '.series | length' "${timeseries_file}")

    log_info "=== Time Series Updated ==="
    log_info "  Entries: ${entry_count}"
    log_info "  File: ${timeseries_file}"

    # Output path for scripting
    echo "${timeseries_file}"
}

main "$@"
