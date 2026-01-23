#!/usr/bin/env bash
# update_governance_audit_log.sh v1.0.0
# Maintains a governance audit log for tracking policy changes and events
#
# This script appends entries to a governance audit log, tracking:
# - Policy validation results
# - Lockfile generation events
# - Drift detection events
# - State flag changes
# - Release gate decisions
#
# Authority: docs/ci/GOVERNANCE_LOCKFILE.md

set -euo pipefail

# --- Configuration ---
SCRIPT_VERSION="1.0.0"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(git rev-parse --show-toplevel 2>/dev/null || echo ".")"

DEFAULT_AUDIT_LOG="${REPO_ROOT}/docs/releases/_state/governance_audit_log.json"
MAX_ENTRIES=1000  # Maximum entries to keep in log

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
Usage: $0 [OPTIONS] --event-type TYPE

Appends an entry to the governance audit log.

OPTIONS:
    --event-type TYPE     Event type (required): validation, lockfile, drift, state_change, gate, manual
    --status STATUS       Event status: success, failure, warning, info (default: info)
    --message MSG         Event message/description
    --actor ACTOR         Actor (user, workflow, system)
    --metadata JSON       Additional metadata as JSON string
    --log-file FILE       Audit log file (default: docs/releases/_state/governance_audit_log.json)
    --governance-hash H   Current governance hash
    --git-sha SHA         Git commit SHA
    --run-id ID           Workflow run ID
    --verbose             Enable verbose logging
    --help                Show this help message

EVENT TYPES:
    validation    - Policy validation event
    lockfile      - Lockfile generation/verification
    drift         - Drift detection event
    state_change  - State flag change (freeze, tight mode, etc.)
    gate          - Release gate decision
    manual        - Manual intervention/override

EXAMPLES:
    # Log validation success
    $0 --event-type validation --status success --message "All policies valid"

    # Log drift detection
    $0 --event-type drift --status warning --message "2 transitions detected" --metadata '{"transitions":2}'

    # Log state change
    $0 --event-type state_change --status info --message "Freeze mode enabled" --actor "release-manager"

    # Log gate decision
    $0 --event-type gate --status success --message "Governance gate passed" --run-id 12345
EOF
}

# --- Audit Functions ---

init_audit_log() {
    local log_file="$1"

    if [[ ! -f "${log_file}" ]]; then
        mkdir -p "$(dirname "${log_file}")"
        cat > "${log_file}" <<EOF
{
  "version": "1.0",
  "description": "Governance audit log",
  "created_at": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "entries": []
}
EOF
        log_info "Initialized audit log: ${log_file}"
    fi
}

create_entry() {
    local event_type="$1"
    local status="$2"
    local message="$3"
    local actor="$4"
    local metadata="$5"
    local governance_hash="$6"
    local git_sha="$7"
    local run_id="$8"

    # Get current timestamp
    local timestamp
    timestamp=$(date -u +%Y-%m-%dT%H:%M:%SZ)

    # Generate entry ID
    local entry_id
    entry_id=$(echo "${timestamp}-${event_type}-${RANDOM}" | sha256sum | cut -c1-16)

    # Build metadata object
    local meta_json="{}"
    if [[ -n "${metadata}" ]]; then
        meta_json="${metadata}"
    fi

    # Build entry JSON
    jq -n \
        --arg id "${entry_id}" \
        --arg timestamp "${timestamp}" \
        --arg event_type "${event_type}" \
        --arg status "${status}" \
        --arg message "${message}" \
        --arg actor "${actor}" \
        --arg governance_hash "${governance_hash}" \
        --arg git_sha "${git_sha}" \
        --arg run_id "${run_id}" \
        --argjson metadata "${meta_json}" \
        '{
            id: $id,
            timestamp: $timestamp,
            event_type: $event_type,
            status: $status,
            message: $message,
            actor: (if $actor != "" then $actor else "system" end),
            governance_hash: (if $governance_hash != "" then $governance_hash else null end),
            git_sha: (if $git_sha != "" then $git_sha else null end),
            run_id: (if $run_id != "" then $run_id else null end),
            metadata: $metadata
        }'
}

append_entry() {
    local log_file="$1"
    local entry="$2"
    local max_entries="$3"

    # Read current log
    local current_log
    current_log=$(cat "${log_file}")

    # Append entry and trim to max
    local updated_log
    updated_log=$(echo "${current_log}" | jq \
        --argjson entry "${entry}" \
        --argjson max "${max_entries}" \
        '.entries = ([$entry] + .entries) | .entries = .entries[:$max] | .last_updated = (now | strftime("%Y-%m-%dT%H:%M:%SZ"))')

    # Write back
    echo "${updated_log}" > "${log_file}"
}

get_governance_hash() {
    local lockfile="${REPO_ROOT}/docs/releases/_state/governance_lockfile.json"
    if [[ -f "${lockfile}" ]]; then
        sha256sum "${lockfile}" 2>/dev/null | cut -d' ' -f1
    else
        echo ""
    fi
}

get_git_sha() {
    git rev-parse HEAD 2>/dev/null || echo ""
}

# --- Main ---
main() {
    local log_file="${DEFAULT_AUDIT_LOG}"
    local event_type=""
    local status="info"
    local message=""
    local actor=""
    local metadata="{}"
    local governance_hash=""
    local git_sha=""
    local run_id=""
    local verbose=false

    # Parse arguments
    while [[ $# -gt 0 ]]; do
        case $1 in
            --event-type)
                event_type="$2"
                shift 2
                ;;
            --status)
                status="$2"
                shift 2
                ;;
            --message)
                message="$2"
                shift 2
                ;;
            --actor)
                actor="$2"
                shift 2
                ;;
            --metadata)
                metadata="$2"
                shift 2
                ;;
            --log-file)
                log_file="$2"
                shift 2
                ;;
            --governance-hash)
                governance_hash="$2"
                shift 2
                ;;
            --git-sha)
                git_sha="$2"
                shift 2
                ;;
            --run-id)
                run_id="$2"
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

    # Validate required arguments
    if [[ -z "${event_type}" ]]; then
        log_error "Missing required --event-type"
        print_usage
        exit 1
    fi

    # Validate event type
    case "${event_type}" in
        validation|lockfile|drift|state_change|gate|manual) ;;
        *)
            log_error "Invalid event type: ${event_type}"
            print_usage
            exit 1
            ;;
    esac

    # Validate status
    case "${status}" in
        success|failure|warning|info) ;;
        *)
            log_error "Invalid status: ${status}"
            print_usage
            exit 1
            ;;
    esac

    # Auto-detect governance hash if not provided
    if [[ -z "${governance_hash}" ]]; then
        governance_hash=$(get_governance_hash)
    fi

    # Auto-detect git SHA if not provided
    if [[ -z "${git_sha}" ]]; then
        git_sha=$(get_git_sha)
    fi

    [[ "${verbose}" == "true" ]] && log_info "Appending to audit log..."
    [[ "${verbose}" == "true" ]] && log_info "  Event type: ${event_type}"
    [[ "${verbose}" == "true" ]] && log_info "  Status: ${status}"
    [[ "${verbose}" == "true" ]] && log_info "  Log file: ${log_file}"

    # Initialize log if needed
    init_audit_log "${log_file}"

    # Create entry
    local entry
    entry=$(create_entry \
        "${event_type}" \
        "${status}" \
        "${message}" \
        "${actor}" \
        "${metadata}" \
        "${governance_hash}" \
        "${git_sha}" \
        "${run_id}")

    # Append entry
    append_entry "${log_file}" "${entry}" "${MAX_ENTRIES}"

    [[ "${verbose}" == "true" ]] && log_info "Entry added to audit log"

    # Output entry for caller
    echo "${entry}"
}

main "$@"
