#!/usr/bin/env bash
# should_run_task.sh v1.0.0
# Cadence-aware task gating for the Release Ops Orchestrator
#
# Determines if a task (digest/handoff) should run based on:
# - Current UTC time vs configured window
# - Time since last execution vs configured cadence
# - Force override environment variables
#
# Exit codes:
#   0 = Task should run
#   1 = Task should be skipped (outside window or already ran)
#   2 = Invalid arguments or configuration
#
# Authority: docs/ci/RELEASE_OPS_ORCHESTRATOR.md

set -euo pipefail

# --- Configuration ---
SCRIPT_VERSION="1.0.0"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(git rev-parse --show-toplevel 2>/dev/null || echo ".")"

# Default policy paths
DEFAULT_DIGEST_POLICY="${REPO_ROOT}/docs/ci/RELEASE_OPS_DIGEST_POLICY.yml"
DEFAULT_HANDOFF_POLICY="${REPO_ROOT}/docs/ci/ONCALL_HANDOFF_POLICY.yml"

# --- Logging ---
log_info() {
    echo "[INFO] $*" >&2
}

log_skip() {
    echo "[SKIP] $*" >&2
}

log_run() {
    echo "[RUN] $*" >&2
}

log_error() {
    echo "[ERROR] $*" >&2
}

# --- Helper functions ---
print_usage() {
    cat <<EOF
Usage: $0 [OPTIONS]

Determines if a task should run based on cadence windows and last execution time.

OPTIONS:
    --task TASK        Task to check: digest|handoff (required)
    --policy FILE      Policy file path (optional, uses default for task)
    --state FILE       State file path (optional)
    --now TIMESTAMP    Current time as ISO8601 or epoch (default: current UTC)
    --verbose          Enable verbose output
    --help             Show this help message

ENVIRONMENT VARIABLES:
    FORCE_RUN_DIGEST=true    Force digest to run regardless of window
    FORCE_RUN_HANDOFF=true   Force handoff to run regardless of window

EXIT CODES:
    0  Task should run
    1  Task should be skipped (outside window or recently ran)
    2  Invalid arguments or configuration error

EXAMPLES:
    # Check if digest should run now
    $0 --task digest

    # Check if handoff should run at a specific time
    $0 --task handoff --now "2026-01-08T09:15:00Z"

    # Force digest to run
    FORCE_RUN_DIGEST=true $0 --task digest
EOF
}

# Parse ISO8601 or epoch to epoch seconds
parse_timestamp() {
    local input="$1"

    if [[ "${input}" =~ ^[0-9]+$ ]]; then
        # Already epoch
        echo "${input}"
    else
        # ISO8601 format
        date -u -j -f "%Y-%m-%dT%H:%M:%SZ" "${input}" "+%s" 2>/dev/null || \
        date -u -d "${input}" "+%s" 2>/dev/null || \
        echo "0"
    fi
}

# Get current UTC time components
get_utc_time_parts() {
    local epoch="$1"

    # Hour (00-23)
    local hour
    hour=$(date -u -r "${epoch}" "+%H" 2>/dev/null || date -u -d "@${epoch}" "+%H" 2>/dev/null)

    # Minute (00-59)
    local minute
    minute=$(date -u -r "${epoch}" "+%M" 2>/dev/null || date -u -d "@${epoch}" "+%M" 2>/dev/null)

    echo "${hour}:${minute}"
}

# Convert HH:MM to minutes since midnight
time_to_minutes() {
    local time_str="$1"
    local hour="${time_str%%:*}"
    local minute="${time_str##*:}"

    # Remove leading zeros for arithmetic
    hour=$((10#${hour}))
    minute=$((10#${minute}))

    echo $((hour * 60 + minute))
}

# Check if current time is within a window
is_in_window() {
    local current_time="$1"  # HH:MM format
    local window_start="$2"  # HH:MM format
    local window_end="$3"    # HH:MM format

    local current_mins
    local start_mins
    local end_mins

    current_mins=$(time_to_minutes "${current_time}")
    start_mins=$(time_to_minutes "${window_start}")
    end_mins=$(time_to_minutes "${window_end}")

    if [[ ${current_mins} -ge ${start_mins} ]] && [[ ${current_mins} -lt ${end_mins} ]]; then
        return 0  # In window
    else
        return 1  # Outside window
    fi
}

# Load policy value using yq or fallback
get_policy_value() {
    local policy_file="$1"
    local key_path="$2"
    local default_value="${3:-}"

    if [[ ! -f "${policy_file}" ]]; then
        echo "${default_value}"
        return
    fi

    local value
    if command -v yq &> /dev/null; then
        value=$(yq -r "${key_path} // \"\"" "${policy_file}" 2>/dev/null)
    else
        # Fallback: basic grep for simple keys
        value=""
    fi

    if [[ -z "${value}" ]] || [[ "${value}" == "null" ]]; then
        echo "${default_value}"
    else
        echo "${value}"
    fi
}

# Get last run timestamp from state file
get_last_run_timestamp() {
    local state_file="$1"
    local key="$2"

    if [[ ! -f "${state_file}" ]]; then
        echo "0"
        return
    fi

    local timestamp
    timestamp=$(jq -r ".${key} // \"1970-01-01T00:00:00Z\"" "${state_file}" 2>/dev/null)

    if [[ -z "${timestamp}" ]] || [[ "${timestamp}" == "null" ]]; then
        echo "0"
    else
        parse_timestamp "${timestamp}"
    fi
}

# --- Task-specific checks ---
check_digest() {
    local policy_file="$1"
    local state_file="$2"
    local now_epoch="$3"
    local verbose="$4"

    # Check force override
    if [[ "${FORCE_RUN_DIGEST:-}" == "true" ]]; then
        log_run "Digest: forced via FORCE_RUN_DIGEST=true"
        return 0
    fi

    # Get current UTC time
    local current_time
    current_time=$(get_utc_time_parts "${now_epoch}")

    # Get window from policy (default: 08:00-09:00 UTC)
    local window_start
    local window_end
    window_start=$(get_policy_value "${policy_file}" ".run_window_utc.start" "08:00")
    window_end=$(get_policy_value "${policy_file}" ".run_window_utc.end" "09:00")

    [[ "${verbose}" == "true" ]] && log_info "Digest window: ${window_start}-${window_end} UTC, current: ${current_time}"

    # Check if within window
    if ! is_in_window "${current_time}" "${window_start}" "${window_end}"; then
        log_skip "Digest: outside window (${current_time} not in ${window_start}-${window_end})"
        return 1
    fi

    # Get cadence (default: 24 hours)
    local cadence_hours
    cadence_hours=$(get_policy_value "${policy_file}" ".cadence_hours" "24")
    local cadence_seconds=$((cadence_hours * 3600))

    # Get last run timestamp
    local last_run_epoch
    if [[ -n "${state_file}" ]] && [[ -f "${state_file}" ]]; then
        last_run_epoch=$(get_last_run_timestamp "${state_file}" "last_digest_at")
    else
        last_run_epoch=0
    fi

    # Calculate time since last run
    local elapsed=$((now_epoch - last_run_epoch))

    [[ "${verbose}" == "true" ]] && log_info "Digest: last run ${elapsed}s ago, cadence ${cadence_seconds}s"

    # Check if enough time has passed
    if [[ ${elapsed} -lt ${cadence_seconds} ]]; then
        local hours_ago=$((elapsed / 3600))
        log_skip "Digest: already ran ${hours_ago}h ago (cadence: ${cadence_hours}h)"
        return 1
    fi

    log_run "Digest: in window and cadence elapsed"
    return 0
}

check_handoff() {
    local policy_file="$1"
    local state_file="$2"
    local now_epoch="$3"
    local verbose="$4"

    # Check force override
    if [[ "${FORCE_RUN_HANDOFF:-}" == "true" ]]; then
        log_run "Handoff: forced via FORCE_RUN_HANDOFF=true"
        return 0
    fi

    # Get current UTC time
    local current_time
    current_time=$(get_utc_time_parts "${now_epoch}")

    # Get windows from policy (default: 09:00-09:30, 17:00-17:30 UTC)
    local in_any_window=false

    # Check default windows if yq not available or policy missing
    local windows_count
    if command -v yq &> /dev/null && [[ -f "${policy_file}" ]]; then
        windows_count=$(yq '.run_windows_utc | length // 0' "${policy_file}" 2>/dev/null || echo "0")
    else
        windows_count=0
    fi

    if [[ "${windows_count}" -gt 0 ]]; then
        # Read windows from policy
        for i in $(seq 0 $((windows_count - 1))); do
            local win_start
            local win_end
            win_start=$(yq ".run_windows_utc[${i}].start" "${policy_file}" 2>/dev/null)
            win_end=$(yq ".run_windows_utc[${i}].end" "${policy_file}" 2>/dev/null)

            if is_in_window "${current_time}" "${win_start}" "${win_end}"; then
                in_any_window=true
                [[ "${verbose}" == "true" ]] && log_info "Handoff: in window ${win_start}-${win_end}"
                break
            fi
        done
    else
        # Use default windows
        local default_windows=("09:00:09:30" "17:00:17:30")
        for window in "${default_windows[@]}"; do
            local win_start="${window%%:*:*}"
            local win_end="${window##*:}"
            # Parse properly
            win_start="${window:0:5}"
            win_end="${window:6:5}"

            if is_in_window "${current_time}" "${win_start}" "${win_end}"; then
                in_any_window=true
                [[ "${verbose}" == "true" ]] && log_info "Handoff: in default window ${win_start}-${win_end}"
                break
            fi
        done
    fi

    if [[ "${in_any_window}" != "true" ]]; then
        log_skip "Handoff: outside all shift windows (current: ${current_time})"
        return 1
    fi

    # Get cadence (default: 8 hours - roughly one shift)
    local cadence_hours
    cadence_hours=$(get_policy_value "${policy_file}" ".cadence_hours" "8")
    local cadence_seconds=$((cadence_hours * 3600))

    # Get last run timestamp
    local last_run_epoch
    if [[ -n "${state_file}" ]] && [[ -f "${state_file}" ]]; then
        last_run_epoch=$(get_last_run_timestamp "${state_file}" "last_handoff_at")
    else
        last_run_epoch=0
    fi

    # Calculate time since last run
    local elapsed=$((now_epoch - last_run_epoch))

    [[ "${verbose}" == "true" ]] && log_info "Handoff: last run ${elapsed}s ago, cadence ${cadence_seconds}s"

    # Check if enough time has passed
    if [[ ${elapsed} -lt ${cadence_seconds} ]]; then
        local hours_ago=$((elapsed / 3600))
        log_skip "Handoff: already ran ${hours_ago}h ago (cadence: ${cadence_hours}h)"
        return 1
    fi

    log_run "Handoff: in shift window and cadence elapsed"
    return 0
}

# --- Main ---
main() {
    local task=""
    local policy_file=""
    local state_file=""
    local now_timestamp=""
    local verbose=false

    # Parse arguments
    while [[ $# -gt 0 ]]; do
        case $1 in
            --task)
                task="$2"
                shift 2
                ;;
            --policy)
                policy_file="$2"
                shift 2
                ;;
            --state)
                state_file="$2"
                shift 2
                ;;
            --now)
                now_timestamp="$2"
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
                exit 2
                ;;
        esac
    done

    # Validate task
    if [[ -z "${task}" ]]; then
        log_error "Missing required argument: --task"
        print_usage
        exit 2
    fi

    if [[ "${task}" != "digest" ]] && [[ "${task}" != "handoff" ]]; then
        log_error "Invalid task: ${task} (must be digest or handoff)"
        exit 2
    fi

    # Set defaults
    if [[ -z "${now_timestamp}" ]]; then
        now_timestamp=$(date -u "+%s")
    else
        now_timestamp=$(parse_timestamp "${now_timestamp}")
    fi

    if [[ -z "${policy_file}" ]]; then
        case "${task}" in
            digest)
                policy_file="${DEFAULT_DIGEST_POLICY}"
                ;;
            handoff)
                policy_file="${DEFAULT_HANDOFF_POLICY}"
                ;;
        esac
    fi

    [[ "${verbose}" == "true" ]] && log_info "Task: ${task}, Policy: ${policy_file}, Now: ${now_timestamp}"

    # Run task-specific check
    case "${task}" in
        digest)
            check_digest "${policy_file}" "${state_file}" "${now_timestamp}" "${verbose}"
            ;;
        handoff)
            check_handoff "${policy_file}" "${state_file}" "${now_timestamp}" "${verbose}"
            ;;
    esac
}

main "$@"
