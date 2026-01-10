#!/usr/bin/env bash
# check_governance_drift.sh v1.0.0
# Detects governance policy drift by comparing hashes across deployments
#
# This script analyzes the time series to detect when governance policies
# changed between publish cycles. This helps identify:
# - Unexpected policy changes
# - Policy drift during stabilization
# - Correlation between policy changes and incidents
#
# Authority: docs/ci/GOVERNANCE_LOCKFILE.md

set -euo pipefail

# --- Configuration ---
SCRIPT_VERSION="1.0.0"

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

Detects governance policy drift by comparing hashes across deployments.

OPTIONS:
    --timeseries FILE     Time series JSON file (required)
    --current-hash HASH   Current governance hash to compare against
    --window N            Number of recent entries to analyze (default: 30)
    --alert-on-change     Exit non-zero if governance changed
    --json                Output in JSON format
    --verbose             Enable verbose logging
    --help                Show this help message

OUTPUT:
    Reports governance hash changes detected in the time series,
    including dates and associated health levels.

EXAMPLES:
    # Check for drift in last 30 entries
    $0 --timeseries site/release-ops/redaction_metrics_timeseries.json

    # Check if current hash differs from recent history
    $0 --timeseries timeseries.json --current-hash abc123...

    # Alert mode (for CI)
    $0 --timeseries timeseries.json --alert-on-change

    # JSON output for automation
    $0 --timeseries timeseries.json --json
EOF
}

# --- Analysis Functions ---

analyze_governance_drift() {
    local timeseries_file="$1"
    local window="$2"
    local current_hash="$3"

    jq --argjson window "${window}" --arg current_hash "${current_hash}" '
        # Get entries with governance hash
        [.series[:$window][] | select(.governance_hash != null)] as $entries |

        # Get unique hashes in order of appearance
        [$entries[].governance_hash] | unique as $unique_hashes |

        # Count entries per hash
        ($entries | group_by(.governance_hash) | map({
            hash: .[0].governance_hash,
            count: length,
            first_seen: (. | sort_by(.timestamp_utc) | .[0].timestamp_utc),
            last_seen: (. | sort_by(.timestamp_utc) | reverse | .[0].timestamp_utc),
            health_levels: [.[].health_level] | unique
        })) as $hash_stats |

        # Find transitions (where hash changed)
        (
            $entries |
            . as $all |
            [range(1; length)] |
            map(
                if $all[.].governance_hash != $all[. - 1].governance_hash then
                    {
                        date: $all[.].date_utc,
                        timestamp: $all[.].timestamp_utc,
                        from_hash: $all[. - 1].governance_hash,
                        to_hash: $all[.].governance_hash,
                        run_id: $all[.].run_id,
                        health_after: $all[.].health_level,
                        deployment_status: $all[.].deployment_status
                    }
                else empty end
            )
        ) as $transitions |

        # Check current hash status
        (
            if $current_hash != "" then
                if ($entries | length) > 0 then
                    if $entries[0].governance_hash == $current_hash then
                        "CURRENT"
                    else
                        "CHANGED"
                    end
                else
                    "NO_HISTORY"
                end
            else
                "NOT_PROVIDED"
            end
        ) as $current_status |

        # Most recent hash
        (if ($entries | length) > 0 then $entries[0].governance_hash else null end) as $latest_hash |

        # Build output
        {
            version: "1.0",
            analyzed_at: (now | strftime("%Y-%m-%dT%H:%M:%SZ")),
            window_size: $window,
            entries_analyzed: ($entries | length),
            entries_with_hash: ($entries | length),
            unique_hashes: ($unique_hashes | length),
            latest_hash: $latest_hash,
            current_hash_provided: ($current_hash != ""),
            current_hash_status: $current_status,
            drift_detected: (($transitions | length) > 0),
            transitions_count: ($transitions | length),
            hash_statistics: $hash_stats,
            transitions: $transitions,
            summary: {
                stable: (($transitions | length) == 0),
                changes_in_window: ($transitions | length),
                latest_change: (if ($transitions | length) > 0 then $transitions[0] else null end)
            }
        }
    ' "${timeseries_file}"
}

format_text_output() {
    local json="$1"
    local verbose="$2"

    local entries_analyzed unique_hashes drift_detected transitions_count current_status latest_hash
    entries_analyzed=$(echo "${json}" | jq -r '.entries_analyzed')
    unique_hashes=$(echo "${json}" | jq -r '.unique_hashes')
    drift_detected=$(echo "${json}" | jq -r '.drift_detected')
    transitions_count=$(echo "${json}" | jq -r '.transitions_count')
    current_status=$(echo "${json}" | jq -r '.current_hash_status')
    latest_hash=$(echo "${json}" | jq -r '.latest_hash // "none"')

    echo ""
    echo "=== Governance Drift Analysis ==="
    echo ""
    echo "Entries analyzed: ${entries_analyzed}"
    echo "Unique hashes: ${unique_hashes}"
    echo "Latest hash: ${latest_hash:0:16}..."
    echo ""

    if [[ "${drift_detected}" == "true" ]]; then
        echo "DRIFT DETECTED: ${transitions_count} governance change(s) found"
        echo ""
        echo "Transitions:"
        echo "${json}" | jq -r '.transitions[] | "  \(.date): \(.from_hash[:12])... -> \(.to_hash[:12])... (health: \(.health_after))"'
    else
        echo "NO DRIFT: Governance hash stable across window"
    fi

    if [[ "${current_status}" == "CHANGED" ]]; then
        echo ""
        echo "WARNING: Current governance hash differs from latest in time series!"
    fi

    if [[ "${verbose}" == "true" ]]; then
        echo ""
        echo "Hash Statistics:"
        echo "${json}" | jq -r '.hash_statistics[] | "  \(.hash[:12])...: \(.count) entries, \(.first_seen) to \(.last_seen)"'
    fi

    echo ""
}

# --- Main ---
main() {
    local timeseries_file=""
    local current_hash=""
    local window=30
    local alert_on_change=false
    local json_output=false
    local verbose=false

    # Parse arguments
    while [[ $# -gt 0 ]]; do
        case $1 in
            --timeseries)
                timeseries_file="$2"
                shift 2
                ;;
            --current-hash)
                current_hash="$2"
                shift 2
                ;;
            --window)
                window="$2"
                shift 2
                ;;
            --alert-on-change)
                alert_on_change=true
                shift
                ;;
            --json)
                json_output=true
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

    # Validate required inputs
    if [[ -z "${timeseries_file}" ]]; then
        log_error "Missing required --timeseries"
        print_usage
        exit 1
    fi

    if [[ ! -f "${timeseries_file}" ]]; then
        log_error "Time series file not found: ${timeseries_file}"
        exit 1
    fi

    # Check for jq
    if ! command -v jq &>/dev/null; then
        log_error "jq is required but not found"
        exit 1
    fi

    [[ "${verbose}" == "true" ]] && log_info "Analyzing governance drift..."
    [[ "${verbose}" == "true" ]] && log_info "  Time series: ${timeseries_file}"
    [[ "${verbose}" == "true" ]] && log_info "  Window: ${window}"

    # Auto-detect current hash if not provided
    if [[ -z "${current_hash}" ]]; then
        local repo_root
        repo_root=$(git rev-parse --show-toplevel 2>/dev/null || echo "")
        if [[ -n "${repo_root}" && -f "${repo_root}/docs/releases/_state/governance_lockfile.json" ]]; then
            current_hash=$(sha256sum "${repo_root}/docs/releases/_state/governance_lockfile.json" 2>/dev/null | cut -d' ' -f1 || echo "")
            [[ "${verbose}" == "true" && -n "${current_hash}" ]] && log_info "Auto-detected current hash: ${current_hash:0:12}..."
        fi
    fi

    # Analyze drift
    local result
    result=$(analyze_governance_drift "${timeseries_file}" "${window}" "${current_hash}")

    # Output
    if [[ "${json_output}" == "true" ]]; then
        echo "${result}" | jq -S .
    else
        format_text_output "${result}" "${verbose}"
    fi

    # Alert mode
    if [[ "${alert_on_change}" == "true" ]]; then
        local drift_detected current_status
        drift_detected=$(echo "${result}" | jq -r '.drift_detected')
        current_status=$(echo "${result}" | jq -r '.current_hash_status')

        if [[ "${drift_detected}" == "true" ]]; then
            log_warn "Governance drift detected in time series window"
            exit 1
        fi

        if [[ "${current_status}" == "CHANGED" ]]; then
            log_warn "Current governance hash differs from time series"
            exit 1
        fi
    fi

    exit 0
}

main "$@"
