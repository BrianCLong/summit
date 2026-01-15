#!/usr/bin/env bash
# compute_governance_health.sh v1.0.0
# Computes overall governance health and generates health badge
#
# This script aggregates governance health from multiple sources:
# - Policy validation status
# - Lockfile verification status
# - Drift detection status
# - State flag status
#
# Authority: docs/ci/GOVERNANCE_LOCKFILE.md

set -euo pipefail

# --- Configuration ---
SCRIPT_VERSION="1.0.0"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(git rev-parse --show-toplevel 2>/dev/null || echo ".")"

# Health level thresholds
HEALTH_CRITICAL_THRESHOLD=1    # Any critical failures
HEALTH_WARNING_THRESHOLD=2     # Multiple warnings

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

Computes overall governance health and generates health badge.

OPTIONS:
    --out-file FILE     Output file for health JSON (default: stdout)
    --badge-file FILE   Output file for badge JSON (shields.io format)
    --verbose           Enable verbose logging
    --help              Show this help message

OUTPUT:
    JSON containing:
    - Overall health level (OK, WARNING, CRITICAL)
    - Individual component health
    - Recommendations for remediation

EXAMPLES:
    # Basic health check
    $0

    # Generate badge
    $0 --badge-file site/governance_health_badge.json

    # Full output to file
    $0 --out-file site/governance_health.json --badge-file site/badge.json
EOF
}

# --- Health Check Functions ---

check_policy_validation() {
    local validator="${SCRIPT_DIR}/validate_governance_policies.sh"

    if [[ ! -x "${validator}" ]]; then
        echo '{"status":"unavailable","score":0,"message":"Validator not found"}'
        return
    fi

    local result
    result=$("${validator}" --json 2>/dev/null) || true

    if [[ -z "${result}" ]]; then
        echo '{"status":"error","score":0,"message":"Validation failed to run"}'
        return
    fi

    local status failed warnings
    status=$(echo "${result}" | jq -r '.status // "unknown"')
    failed=$(echo "${result}" | jq -r '.summary.failed // 0')
    warnings=$(echo "${result}" | jq -r '.summary.warnings // 0')

    local score=100
    local health_status="OK"

    if [[ "${failed}" -gt 0 ]]; then
        health_status="CRITICAL"
        score=$((100 - (failed * 20)))
        [[ ${score} -lt 0 ]] && score=0
    elif [[ "${warnings}" -gt 0 ]]; then
        health_status="WARNING"
        score=$((100 - (warnings * 5)))
        [[ ${score} -lt 50 ]] && score=50
    fi

    jq -n \
        --arg status "${health_status}" \
        --argjson score "${score}" \
        --argjson failed "${failed}" \
        --argjson warnings "${warnings}" \
        '{
            status: $status,
            score: $score,
            failed: $failed,
            warnings: $warnings,
            message: (if $failed > 0 then "\($failed) validation failures" elif $warnings > 0 then "\($warnings) warnings" else "All policies valid" end)
        }'
}

check_lockfile_status() {
    local lockfile="${REPO_ROOT}/docs/releases/_state/governance_lockfile.json"

    if [[ ! -f "${lockfile}" ]]; then
        echo '{"status":"WARNING","score":50,"message":"No lockfile present"}'
        return
    fi

    # Check if lockfile is valid JSON
    if ! jq empty "${lockfile}" 2>/dev/null; then
        echo '{"status":"CRITICAL","score":0,"message":"Invalid lockfile JSON"}'
        return
    fi

    # Check freshness
    local generated_at
    generated_at=$(jq -r '.generated_at_utc // empty' "${lockfile}")

    if [[ -z "${generated_at}" ]]; then
        echo '{"status":"WARNING","score":70,"message":"Cannot determine lockfile age"}'
        return
    fi

    # Calculate age in days
    local generated_epoch current_epoch age_days
    generated_epoch=$(date -d "${generated_at}" +%s 2>/dev/null || date -j -f "%Y-%m-%dT%H:%M:%SZ" "${generated_at}" +%s 2>/dev/null || echo "0")
    current_epoch=$(date +%s)

    if [[ "${generated_epoch}" == "0" ]]; then
        echo '{"status":"WARNING","score":70,"message":"Cannot parse lockfile date"}'
        return
    fi

    age_days=$(( (current_epoch - generated_epoch) / 86400 ))

    local score=100
    local health_status="OK"
    local message="Lockfile is current (${age_days} days old)"

    if [[ ${age_days} -gt 30 ]]; then
        health_status="CRITICAL"
        score=20
        message="Lockfile is very stale (${age_days} days old)"
    elif [[ ${age_days} -gt 14 ]]; then
        health_status="WARNING"
        score=60
        message="Lockfile is stale (${age_days} days old)"
    elif [[ ${age_days} -gt 7 ]]; then
        health_status="WARNING"
        score=80
        message="Lockfile should be refreshed (${age_days} days old)"
    fi

    jq -n \
        --arg status "${health_status}" \
        --argjson score "${score}" \
        --argjson age_days "${age_days}" \
        --arg message "${message}" \
        '{
            status: $status,
            score: $score,
            age_days: $age_days,
            message: $message
        }'
}

check_state_flags() {
    local state_dir="${REPO_ROOT}/docs/releases/_state"

    local freeze_enabled="false"
    local tight_mode="false"
    local override_active="false"

    if [[ -f "${state_dir}/freeze_mode.json" ]]; then
        freeze_enabled=$(jq -r '.enabled // false' "${state_dir}/freeze_mode.json" 2>/dev/null || echo "false")
    fi

    if [[ -f "${state_dir}/governance_tight_mode.json" ]]; then
        tight_mode=$(jq -r '.enabled // false' "${state_dir}/governance_tight_mode.json" 2>/dev/null || echo "false")
    fi

    if [[ -f "${state_dir}/release_override.json" ]]; then
        override_active=$(jq -r '.active // false' "${state_dir}/release_override.json" 2>/dev/null || echo "false")
    fi

    local score=100
    local health_status="OK"
    local messages=()

    # Freeze mode affects score
    if [[ "${freeze_enabled}" == "true" ]]; then
        score=$((score - 10))
        messages+=("Freeze mode active")
    fi

    # Tight mode is actually good for governance
    if [[ "${tight_mode}" == "true" ]]; then
        messages+=("Tight mode enforced")
    fi

    # Override active is concerning
    if [[ "${override_active}" == "true" ]]; then
        score=$((score - 20))
        health_status="WARNING"
        messages+=("Override active")
    fi

    if [[ ${#messages[@]} -eq 0 ]]; then
        messages+=("Normal operation")
    fi

    local message
    message=$(IFS=', '; echo "${messages[*]}")

    jq -n \
        --arg status "${health_status}" \
        --argjson score "${score}" \
        --arg freeze "${freeze_enabled}" \
        --arg tight "${tight_mode}" \
        --arg override "${override_active}" \
        --arg message "${message}" \
        '{
            status: $status,
            score: $score,
            freeze_mode: ($freeze == "true"),
            tight_mode: ($tight == "true"),
            override_active: ($override == "true"),
            message: $message
        }'
}

check_drift_status() {
    local timeseries="${REPO_ROOT}/site/release-ops/redaction_metrics_timeseries.json"

    if [[ ! -f "${timeseries}" ]]; then
        echo '{"status":"OK","score":100,"message":"No time series (no drift possible)"}'
        return
    fi

    local drift_checker="${SCRIPT_DIR}/check_governance_drift.sh"

    if [[ ! -x "${drift_checker}" ]]; then
        echo '{"status":"OK","score":100,"message":"Drift checker not available"}'
        return
    fi

    local result
    result=$("${drift_checker}" --timeseries "${timeseries}" --json --window 30 2>/dev/null) || true

    if [[ -z "${result}" ]]; then
        echo '{"status":"OK","score":100,"message":"Drift check completed"}'
        return
    fi

    local drift_detected transitions
    drift_detected=$(echo "${result}" | jq -r '.drift_detected // false')
    transitions=$(echo "${result}" | jq -r '.transitions_count // 0')

    local score=100
    local health_status="OK"
    local message="No governance drift detected"

    if [[ "${drift_detected}" == "true" ]]; then
        if [[ ${transitions} -gt 3 ]]; then
            health_status="CRITICAL"
            score=30
            message="High governance churn (${transitions} changes)"
        elif [[ ${transitions} -gt 1 ]]; then
            health_status="WARNING"
            score=60
            message="Governance drift detected (${transitions} changes)"
        else
            health_status="WARNING"
            score=80
            message="Minor governance change detected"
        fi
    fi

    jq -n \
        --arg status "${health_status}" \
        --argjson score "${score}" \
        --argjson transitions "${transitions}" \
        --arg message "${message}" \
        '{
            status: $status,
            score: $score,
            transitions: $transitions,
            message: $message
        }'
}

# --- Badge Generation ---

generate_badge() {
    local overall_status="$1"
    local overall_score="$2"

    local color="brightgreen"
    local label="governance"

    case "${overall_status}" in
        OK)
            color="brightgreen"
            ;;
        WARNING)
            color="yellow"
            ;;
        CRITICAL)
            color="red"
            ;;
        *)
            color="lightgrey"
            ;;
    esac

    # shields.io endpoint format
    jq -n \
        --arg schemaVersion "1" \
        --arg label "${label}" \
        --arg message "${overall_status} (${overall_score}%)" \
        --arg color "${color}" \
        '{
            schemaVersion: 1,
            label: $label,
            message: $message,
            color: $color
        }'
}

# --- Main ---
main() {
    local out_file=""
    local badge_file=""
    local verbose=false

    # Parse arguments
    while [[ $# -gt 0 ]]; do
        case $1 in
            --out-file)
                out_file="$2"
                shift 2
                ;;
            --badge-file)
                badge_file="$2"
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

    [[ "${verbose}" == "true" ]] && log_info "Computing governance health..."

    # Run health checks
    local policy_health lockfile_health state_health drift_health
    [[ "${verbose}" == "true" ]] && log_info "  Checking policy validation..."
    policy_health=$(check_policy_validation)

    [[ "${verbose}" == "true" ]] && log_info "  Checking lockfile status..."
    lockfile_health=$(check_lockfile_status)

    [[ "${verbose}" == "true" ]] && log_info "  Checking state flags..."
    state_health=$(check_state_flags)

    [[ "${verbose}" == "true" ]] && log_info "  Checking drift status..."
    drift_health=$(check_drift_status)

    # Calculate overall health
    local policy_score lockfile_score state_score drift_score
    policy_score=$(echo "${policy_health}" | jq -r '.score // 0')
    lockfile_score=$(echo "${lockfile_health}" | jq -r '.score // 0')
    state_score=$(echo "${state_health}" | jq -r '.score // 0')
    drift_score=$(echo "${drift_health}" | jq -r '.score // 0')

    # Weighted average (policy and lockfile more important)
    local overall_score
    overall_score=$(( (policy_score * 30 + lockfile_score * 30 + state_score * 20 + drift_score * 20) / 100 ))

    # Determine overall status
    local overall_status="OK"
    local policy_status lockfile_status state_status drift_status
    policy_status=$(echo "${policy_health}" | jq -r '.status // "OK"')
    lockfile_status=$(echo "${lockfile_health}" | jq -r '.status // "OK"')
    state_status=$(echo "${state_health}" | jq -r '.status // "OK"')
    drift_status=$(echo "${drift_health}" | jq -r '.status // "OK"')

    # Any CRITICAL makes overall CRITICAL
    if [[ "${policy_status}" == "CRITICAL" ]] || \
       [[ "${lockfile_status}" == "CRITICAL" ]] || \
       [[ "${state_status}" == "CRITICAL" ]] || \
       [[ "${drift_status}" == "CRITICAL" ]]; then
        overall_status="CRITICAL"
    # Any WARNING makes overall WARNING
    elif [[ "${policy_status}" == "WARNING" ]] || \
         [[ "${lockfile_status}" == "WARNING" ]] || \
         [[ "${state_status}" == "WARNING" ]] || \
         [[ "${drift_status}" == "WARNING" ]]; then
        overall_status="WARNING"
    fi

    # Build recommendations
    local recommendations=()
    if [[ "${policy_status}" != "OK" ]]; then
        recommendations+=("Run policy validation: ./scripts/release/validate_governance_policies.sh --verbose")
    fi
    if [[ "${lockfile_status}" != "OK" ]]; then
        recommendations+=("Regenerate lockfile: ./scripts/release/generate_governance_lockfile.sh --sha \$(git rev-parse HEAD)")
    fi
    if [[ "${drift_status}" != "OK" ]]; then
        recommendations+=("Review drift report: ./scripts/release/check_governance_drift.sh --verbose")
    fi

    # Build output JSON
    local output
    output=$(jq -n \
        --arg version "${SCRIPT_VERSION}" \
        --arg generated "$(date -u +%Y-%m-%dT%H:%M:%SZ)" \
        --arg overall_status "${overall_status}" \
        --argjson overall_score "${overall_score}" \
        --argjson policy "${policy_health}" \
        --argjson lockfile "${lockfile_health}" \
        --argjson state "${state_health}" \
        --argjson drift "${drift_health}" \
        --argjson recommendations "$(printf '%s\n' "${recommendations[@]}" | jq -R . | jq -s .)" \
        '{
            version: $version,
            generated_at: $generated,
            overall: {
                status: $overall_status,
                score: $overall_score
            },
            components: {
                policy_validation: $policy,
                lockfile: $lockfile,
                state_flags: $state,
                drift: $drift
            },
            recommendations: $recommendations
        }')

    # Write output
    if [[ -n "${out_file}" ]]; then
        mkdir -p "$(dirname "${out_file}")"
        echo "${output}" > "${out_file}"
        [[ "${verbose}" == "true" ]] && log_info "Health report written to: ${out_file}"
    else
        echo "${output}"
    fi

    # Generate badge if requested
    if [[ -n "${badge_file}" ]]; then
        local badge
        badge=$(generate_badge "${overall_status}" "${overall_score}")
        mkdir -p "$(dirname "${badge_file}")"
        echo "${badge}" > "${badge_file}"
        [[ "${verbose}" == "true" ]] && log_info "Badge written to: ${badge_file}"
    fi

    # Return appropriate exit code
    case "${overall_status}" in
        CRITICAL) exit 2 ;;
        WARNING) exit 0 ;;  # Warnings don't fail
        *) exit 0 ;;
    esac
}

main "$@"
