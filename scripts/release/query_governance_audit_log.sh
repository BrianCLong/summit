#!/usr/bin/env bash
# query_governance_audit_log.sh v1.0.0
# Queries and displays the governance audit log
#
# This script provides various views of the governance audit log:
# - Recent entries
# - Filter by event type
# - Filter by status
# - Filter by date range
# - Statistics and summaries
#
# Authority: docs/ci/GOVERNANCE_LOCKFILE.md

set -euo pipefail

# --- Configuration ---
SCRIPT_VERSION="1.0.0"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(git rev-parse --show-toplevel 2>/dev/null || echo ".")"

DEFAULT_AUDIT_LOG="${REPO_ROOT}/docs/releases/_state/governance_audit_log.json"

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

Queries and displays the governance audit log.

OPTIONS:
    --log-file FILE       Audit log file (default: docs/releases/_state/governance_audit_log.json)
    --limit N             Number of entries to show (default: 20)
    --event-type TYPE     Filter by event type
    --status STATUS       Filter by status
    --since DATE          Filter entries since date (YYYY-MM-DD)
    --until DATE          Filter entries until date (YYYY-MM-DD)
    --format FORMAT       Output format: table, json, summary (default: table)
    --stats               Show statistics only
    --verbose             Enable verbose logging
    --help                Show this help message

EXAMPLES:
    # Show recent entries
    $0

    # Show last 50 entries
    $0 --limit 50

    # Show only drift events
    $0 --event-type drift

    # Show failures only
    $0 --status failure

    # Show entries from last week
    $0 --since 2026-01-01

    # Show statistics
    $0 --stats

    # JSON output
    $0 --format json --limit 10
EOF
}

# --- Query Functions ---

query_entries() {
    local log_file="$1"
    local limit="$2"
    local event_type="$3"
    local status="$4"
    local since="$5"
    local until_date="$6"

    if [[ ! -f "${log_file}" ]]; then
        echo "[]"
        return
    fi

    # Build jq filter dynamically
    jq --argjson limit "${limit}" \
       --arg event_type "${event_type}" \
       --arg status "${status}" \
       --arg since "${since}" \
       --arg until_date "${until_date}" \
       '[.entries[] |
         select(($event_type == "") or (.event_type == $event_type)) |
         select(($status == "") or (.status == $status)) |
         select(($since == "") or (.timestamp >= $since)) |
         select(($until_date == "") or (.timestamp <= $until_date))
       ] | .[:$limit]' "${log_file}"
}

format_table() {
    local entries="$1"

    echo ""
    printf "%-20s %-12s %-10s %-50s\n" "TIMESTAMP" "EVENT TYPE" "STATUS" "MESSAGE"
    printf "%-20s %-12s %-10s %-50s\n" "--------------------" "------------" "----------" "--------------------------------------------------"

    echo "${entries}" | jq -r '.[] | "\(.timestamp[:19]) \(.event_type) \(.status) \(.message[:50])"' | \
    while read -r line; do
        timestamp=$(echo "${line}" | cut -d' ' -f1)
        event_type=$(echo "${line}" | cut -d' ' -f2)
        status=$(echo "${line}" | cut -d' ' -f3)
        message=$(echo "${line}" | cut -d' ' -f4-)

        # Color code status
        case "${status}" in
            success) status_display="\033[32m${status}\033[0m" ;;
            failure) status_display="\033[31m${status}\033[0m" ;;
            warning) status_display="\033[33m${status}\033[0m" ;;
            *) status_display="${status}" ;;
        esac

        printf "%-20s %-12s %-10b %-50s\n" "${timestamp}" "${event_type}" "${status_display}" "${message}"
    done

    echo ""
}

compute_stats() {
    local log_file="$1"

    if [[ ! -f "${log_file}" ]]; then
        echo "No audit log found"
        return
    fi

    jq '{
        total_entries: (.entries | length),
        by_event_type: (.entries | group_by(.event_type) | map({
            type: .[0].event_type,
            count: length
        })),
        by_status: (.entries | group_by(.status) | map({
            status: .[0].status,
            count: length
        })),
        first_entry: (.entries | last | .timestamp // "N/A"),
        last_entry: (.entries | first | .timestamp // "N/A"),
        recent_failures: ([.entries[:50][] | select(.status == "failure")] | length),
        governance_hashes_seen: ([.entries[].governance_hash | select(. != null)] | unique | length)
    }' "${log_file}"
}

format_stats() {
    local stats="$1"

    echo ""
    echo "=== Governance Audit Log Statistics ==="
    echo ""

    local total first_entry last_entry recent_failures
    total=$(echo "${stats}" | jq -r '.total_entries')
    first_entry=$(echo "${stats}" | jq -r '.first_entry')
    last_entry=$(echo "${stats}" | jq -r '.last_entry')
    recent_failures=$(echo "${stats}" | jq -r '.recent_failures')

    echo "Total entries: ${total}"
    echo "Date range: ${first_entry} to ${last_entry}"
    echo "Recent failures (last 50): ${recent_failures}"
    echo ""

    echo "By Event Type:"
    echo "${stats}" | jq -r '.by_event_type[] | "  \(.type): \(.count)"'
    echo ""

    echo "By Status:"
    echo "${stats}" | jq -r '.by_status[] | "  \(.status): \(.count)"'
    echo ""

    local unique_hashes
    unique_hashes=$(echo "${stats}" | jq -r '.governance_hashes_seen')
    echo "Unique governance hashes: ${unique_hashes}"
    echo ""
}

# --- Main ---
main() {
    local log_file="${DEFAULT_AUDIT_LOG}"
    local limit=20
    local event_type=""
    local status=""
    local since=""
    local until_date=""
    local format="table"
    local show_stats=false
    local verbose=false

    # Parse arguments
    while [[ $# -gt 0 ]]; do
        case $1 in
            --log-file)
                log_file="$2"
                shift 2
                ;;
            --limit)
                limit="$2"
                shift 2
                ;;
            --event-type)
                event_type="$2"
                shift 2
                ;;
            --status)
                status="$2"
                shift 2
                ;;
            --since)
                since="$2"
                shift 2
                ;;
            --until)
                until_date="$2"
                shift 2
                ;;
            --format)
                format="$2"
                shift 2
                ;;
            --stats)
                show_stats=true
                shift
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

    [[ "${verbose}" == "true" ]] && log_info "Querying audit log: ${log_file}"

    # Check if log exists
    if [[ ! -f "${log_file}" ]]; then
        echo "Audit log not found: ${log_file}"
        echo "Initialize with: ./scripts/release/update_governance_audit_log.sh --event-type manual --message 'Log initialized'"
        exit 0
    fi

    # Show stats if requested
    if [[ "${show_stats}" == "true" ]]; then
        local stats
        stats=$(compute_stats "${log_file}")
        format_stats "${stats}"
        exit 0
    fi

    # Query entries
    local entries
    entries=$(query_entries "${log_file}" "${limit}" "${event_type}" "${status}" "${since}" "${until_date}")

    # Output based on format
    case "${format}" in
        json)
            echo "${entries}" | jq .
            ;;
        summary)
            local count
            count=$(echo "${entries}" | jq 'length')
            echo "Found ${count} entries"
            echo "${entries}" | jq -r '.[] | "[\(.timestamp[:10])] \(.event_type): \(.message[:60])"'
            ;;
        table|*)
            format_table "${entries}"
            ;;
    esac
}

main "$@"
