#!/usr/bin/env bash
# compute_release_ops_slo.sh v1.0.0
# Computes SLO metrics from redaction metrics time series
#
# This script analyzes publication cycles and computes KPIs for
# service level objectives. All output is counts-only.
#
# Authority: docs/ci/RELEASE_OPS_SLO.md

set -euo pipefail

# --- Configuration ---
SCRIPT_VERSION="1.0.0"

# Default windows
DEFAULT_WEEKLY_DAYS=7
DEFAULT_MONTHLY_DAYS=30

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

Computes SLO metrics from redaction metrics time series.

OPTIONS:
    --timeseries FILE     Time series JSON file (required)
    --policy FILE         SLO policy YAML file (optional)
    --governance-hash     SHA256 of governance lockfile (optional)
    --flake-registry FILE Flake registry YAML file (optional)
    --flake-encounters FILE Flake encounters JSONL file (optional)
    --out FILE            Output JSON file (default: stdout)
    --verbose             Enable verbose logging
    --help                Show this help message

OUTPUT:
    JSON with weekly and monthly SLO metrics including:
    - total_cycles, successful_publishes, success_rate_pct
    - rollbacks_count, rollback_rate_pct
    - warn_count, warn_rate_pct
    - fail_count, fail_rate_pct
    - mtbr_hours (mean time between rollbacks)
    - longest_ok_streak
    - recovery_cycles_avg

EXAMPLES:
    # Compute SLOs
    $0 --timeseries site/release-ops/redaction_metrics_timeseries.json

    # With output file
    $0 --timeseries timeseries.json --out slo.json
EOF
}

# --- SLO Computation ---

compute_slo_metrics() {
    local timeseries_file="$1"
    local weekly_days="$2"
    local monthly_days="$3"
    local governance_hash="${4:-}"

    jq --argjson weekly_days "${weekly_days}" \
       --argjson monthly_days "${monthly_days}" \
       --arg governance_hash "${governance_hash}" '
        # Current timestamp for window calculations
        (now) as $now |

        # Helper: parse ISO timestamp to epoch (approximate)
        def parse_ts:
            if . == null or . == "" then 0
            else
                capture("(?<y>[0-9]{4})-(?<m>[0-9]{2})-(?<d>[0-9]{2})T(?<H>[0-9]{2}):(?<M>[0-9]{2}):(?<S>[0-9]{2})") |
                if . then
                    ((.y | tonumber) - 1970) * 31536000 +
                    ((.m | tonumber) - 1) * 2592000 +
                    ((.d | tonumber) - 1) * 86400 +
                    (.H | tonumber) * 3600 +
                    (.M | tonumber) * 60 +
                    (.S | tonumber)
                else 0 end
            end;

        # Helper: is entry a success?
        def is_success:
            (.deployment_status == "OK" or .deployment_status == "WARN") and
            ((.forbidden_hits // 0) == 0);

        # Helper: is entry a rollback?
        def is_rollback:
            .deployment_status == "ROLLED_BACK";

        # Helper: is entry a fail?
        def is_fail:
            .health_level == "FAIL" or ((.forbidden_hits // 0) > 0);

        # Helper: is entry a warn?
        def is_warn:
            .health_level == "WARN" and
            (.deployment_status == "OK" or .deployment_status == "WARN");

        # Filter entries by days
        def entries_in_days(days):
            ($now - (days * 86400)) as $cutoff |
            [.[] | select((.timestamp_utc // "") | parse_ts >= $cutoff)];

        # Compute metrics for a set of entries
        def compute_window_metrics:
            . as $entries |
            ($entries | length) as $total |
            if $total == 0 then
                {
                    total_cycles: 0,
                    successful_publishes: 0,
                    success_rate_pct: 0,
                    rollbacks_count: 0,
                    rollback_rate_pct: 0,
                    warn_count: 0,
                    warn_rate_pct: 0,
                    fail_count: 0,
                    fail_rate_pct: 0,
                    mtbr_hours: null,
                    longest_ok_streak: 0,
                    recovery_cycles_avg: null,
                    recent_incidents: []
                }
            else
                # Count each type
                ([$entries[] | select(is_success)] | length) as $successes |
                ([$entries[] | select(is_rollback)] | length) as $rollbacks |
                ([$entries[] | select(is_warn)] | length) as $warns |
                ([$entries[] | select(is_fail)] | length) as $fails |

                # Calculate rates
                (if $total > 0 then ($successes / $total * 100) | . * 100 | floor / 100 else 0 end) as $success_rate |
                (if $total > 0 then ($rollbacks / $total * 100) | . * 100 | floor / 100 else 0 end) as $rollback_rate |
                (if $total > 0 then ($warns / $total * 100) | . * 100 | floor / 100 else 0 end) as $warn_rate |
                (if $total > 0 then ($fails / $total * 100) | . * 100 | floor / 100 else 0 end) as $fail_rate |

                # Calculate MTBR (mean time between rollbacks)
                (
                    [$entries[] | select(is_rollback) | .timestamp_utc | parse_ts] |
                    sort | reverse |
                    if length >= 2 then
                        [., .[1:]] | transpose | map(.[0] - .[1]) |
                        (add / length / 3600) | . * 10 | floor / 10
                    else null end
                ) as $mtbr |

                # Calculate longest OK streak
                (
                    $entries | reverse |
                    reduce .[] as $e (
                        {current: 0, max: 0};
                        if ($e | is_success) then
                            .current += 1 | .max = ([.current, .max] | max)
                        else
                            .current = 0
                        end
                    ) | .max
                ) as $longest_streak |

                # Calculate recovery cycles (cycles from FAIL/rollback to OK)
                (
                    $entries | reverse |
                    reduce .[] as $e (
                        {in_recovery: false, count: 0, recoveries: []};
                        if ($e | is_fail) or ($e | is_rollback) then
                            .in_recovery = true | .count = 0
                        elif .in_recovery and ($e | is_success) then
                            .recoveries += [.count + 1] | .in_recovery = false | .count = 0
                        elif .in_recovery then
                            .count += 1
                        else . end
                    ) | .recoveries |
                    if length > 0 then (add / length) | . * 10 | floor / 10 else null end
                ) as $recovery_avg |

                # Get recent incidents (rollbacks and fails)
                (
                    [$entries[] | select(is_rollback or is_fail)] |
                    .[:5] |
                    map({
                        date: .date_utc,
                        run_id: .run_id,
                        type: (if is_rollback then "rollback" else "fail" end),
                        health_level: .health_level,
                        deployment_status: .deployment_status
                    })
                ) as $incidents |

                {
                    total_cycles: $total,
                    successful_publishes: $successes,
                    success_rate_pct: $success_rate,
                    rollbacks_count: $rollbacks,
                    rollback_rate_pct: $rollback_rate,
                    warn_count: $warns,
                    warn_rate_pct: $warn_rate,
                    fail_count: $fails,
                    fail_rate_pct: $fail_rate,
                    mtbr_hours: $mtbr,
                    longest_ok_streak: $longest_streak,
                    recovery_cycles_avg: $recovery_avg,
                    recent_incidents: $incidents
                }
            end;

        # Compute SLO status
        def compute_status(metrics):
            if metrics.total_cycles < 3 then "INSUFFICIENT_DATA"
            elif metrics.success_rate_pct >= 99 and metrics.rollback_rate_pct <= 2 and metrics.fail_rate_pct <= 1 then "MEETING"
            elif metrics.success_rate_pct >= 95 and metrics.rollback_rate_pct <= 5 and metrics.fail_rate_pct <= 3 then "AT_RISK"
            else "FAILING" end;

        # Main computation
        .series as $all_entries |

        # Weekly metrics
        ($all_entries | entries_in_days($weekly_days) | compute_window_metrics) as $weekly |

        # Monthly metrics
        ($all_entries | entries_in_days($monthly_days) | compute_window_metrics) as $monthly |

        # All-time metrics (using all available data)
        ($all_entries | compute_window_metrics) as $all_time |

        # Current streak (consecutive OKs from most recent)
        (
            $all_entries |
            reduce .[] as $e (
                {streak: 0, done: false};
                if .done then .
                elif ($e | is_success) then .streak += 1
                else .done = true end
            ) | .streak
        ) as $current_streak |

        # Build output
        {
            version: "1.1",
            generated_at: (now | strftime("%Y-%m-%dT%H:%M:%SZ")),
            governance_hash: (if $governance_hash != "" then $governance_hash else null end),
            windows: {
                weekly_days: $weekly_days,
                monthly_days: $monthly_days
            },
            weekly: ($weekly + {status: compute_status($weekly)}),
            monthly: ($monthly + {status: compute_status($monthly)}),
            all_time: ($all_time + {status: compute_status($all_time)}),
            current_streak: $current_streak,
            targets: {
                success_rate_pct: 99,
                rollback_rate_max_pct: 2,
                fail_rate_max_pct: 1,
                mtbr_target_hours: 168,
                ok_streak_target: 20
            },
            summary: {
                weekly_status: compute_status($weekly),
                monthly_status: compute_status($monthly),
                meeting_targets: (
                    compute_status($monthly) == "MEETING"
                )
            }
        }
    ' "${timeseries_file}"
}

# --- Flake Debt ---

generate_flake_report() {
    local registry_file="$1"
    local encounters_file="$2"
    local output_file="$3"

    if [[ -z "${registry_file}" ]]; then
        return
    fi

    if [[ ! -f "${registry_file}" ]]; then
        log_warn "Flake registry not found at ${registry_file}. Skipping flake report."
        return
    fi

    local encounters_arg=()
    if [[ -n "${encounters_file}" ]]; then
        encounters_arg=(--encounters "${encounters_file}")
    fi

    npx tsx scripts/ci/flake-registry-report.ts \
      --registry "${registry_file}" \
      "${encounters_arg[@]}" \
      --out "${output_file}" >/dev/null
}

# --- Main ---
main() {
    local timeseries_file=""
    local policy_file=""
    local output_file=""
    local governance_hash=""
    local flake_registry=""
    local flake_encounters=""
    local verbose=false

    local weekly_days="${DEFAULT_WEEKLY_DAYS}"
    local monthly_days="${DEFAULT_MONTHLY_DAYS}"

    # Parse arguments
    while [[ $# -gt 0 ]]; do
        case $1 in
            --timeseries)
                timeseries_file="$2"
                shift 2
                ;;
            --policy)
                policy_file="$2"
                shift 2
                ;;
            --governance-hash)
                governance_hash="$2"
                shift 2
                ;;
            --flake-registry)
                flake_registry="$2"
                shift 2
                ;;
            --flake-encounters)
                flake_encounters="$2"
                shift 2
                ;;
            --out)
                output_file="$2"
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

    [[ "${verbose}" == "true" ]] && log_info "Computing SLO metrics..."
    [[ "${verbose}" == "true" ]] && log_info "  Time series: ${timeseries_file}"
    [[ "${verbose}" == "true" ]] && log_info "  Weekly window: ${weekly_days} days"
    [[ "${verbose}" == "true" ]] && log_info "  Monthly window: ${monthly_days} days"

    # Auto-detect governance hash if not provided
    if [[ -z "${governance_hash}" ]]; then
        local repo_root
        repo_root=$(git rev-parse --show-toplevel 2>/dev/null || echo "")
        if [[ -n "${repo_root}" && -f "${repo_root}/docs/releases/_state/governance_lockfile.json" ]]; then
            governance_hash=$(sha256sum "${repo_root}/docs/releases/_state/governance_lockfile.json" 2>/dev/null | cut -d' ' -f1 || echo "")
            [[ "${verbose}" == "true" ]] && [[ -n "${governance_hash}" ]] && log_info "Auto-detected governance hash: ${governance_hash:0:12}..."
        fi
    fi

    # Compute metrics
    local slo_json
    slo_json=$(compute_slo_metrics "${timeseries_file}" "${weekly_days}" "${monthly_days}" "${governance_hash}")

    # Output
    if [[ -n "${output_file}" ]]; then
        local out_dir
        out_dir=$(dirname "${output_file}")
        mkdir -p "${out_dir}"
        echo "${slo_json}" | jq -S . > "${output_file}"
        [[ "${verbose}" == "true" ]] && log_info "Wrote SLO JSON: ${output_file}"

        if [[ -n "${flake_registry}" ]]; then
            local flake_report_path
            flake_report_path="${out_dir}/flake_report.json"
            generate_flake_report "${flake_registry}" "${flake_encounters}" "${flake_report_path}"
            if [[ -f "${flake_report_path}" ]]; then
                jq --slurpfile flake "${flake_report_path}" '. + {flake_debt: $flake[0]}' "${output_file}" > "${output_file}.tmp"
                mv "${output_file}.tmp" "${output_file}"
                [[ "${verbose}" == "true" ]] && log_info "Attached flake debt report: ${flake_report_path}"
            fi
        fi
    else
        echo "${slo_json}" | jq -S .
    fi

    # Summary
    local weekly_status monthly_status
    weekly_status=$(echo "${slo_json}" | jq -r '.weekly.status')
    monthly_status=$(echo "${slo_json}" | jq -r '.monthly.status')

    echo "" >&2
    log_info "=== SLO Computation Complete ==="
    log_info "  Weekly status: ${weekly_status}"
    log_info "  Monthly status: ${monthly_status}"
    if [[ -n "${governance_hash}" ]]; then
        log_info "  Governance hash: ${governance_hash:0:12}..."
    fi

    exit 0
}

main "$@"
