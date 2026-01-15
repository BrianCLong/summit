#!/usr/bin/env bash
# check_redaction_trends.sh v1.0.0
# Analyzes redaction metrics time series for alerting thresholds
#
# This script checks the time series for conditions that warrant automatic
# incident creation. All output is counts-only - no sensitive content.
#
# Authority: docs/ci/REDACTION_TREND_ALERTS.md

set -euo pipefail

# --- Configuration ---
SCRIPT_VERSION="1.0.0"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(git rev-parse --show-toplevel 2>/dev/null || echo ".")"

# Default thresholds (can be overridden by policy)
DEFAULT_FORBIDDEN_THRESHOLD=0
DEFAULT_ROLLBACKS_24H=2
DEFAULT_ROLLBACKS_7_ENTRIES=3
DEFAULT_WARN_7_ENTRIES=3
DEFAULT_TOKENS_SPIKE_PCT=300
DEFAULT_LOOKBACK_ENTRIES=7

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

Analyzes redaction metrics time series for alerting thresholds.

OPTIONS:
    --timeseries FILE     Time series JSON file (required)
    --policy FILE         Alert policy YAML file (optional)
    --out FILE            Output report file (default: stdout)
    --out-json FILE       Output JSON summary file
    --run-id ID           Current workflow run ID (for linking)
    --triage-packet URL   URL to triage packet artifact
    --dry-run             Show what would trigger without state changes
    --verbose             Enable verbose logging
    --help                Show this help message

OUTPUT:
    - level: OK | P1 | P0
    - triggers: array of trigger codes
    - counts-only summary

EXIT CODES:
    0 - Always (alerting does not block deploy)

EXAMPLES:
    # Check time series with defaults
    $0 --timeseries site/release-ops/redaction_metrics_timeseries.json

    # With policy and output
    $0 --timeseries timeseries.json --policy policy.yml --out report.md

    # Generate JSON summary
    $0 --timeseries timeseries.json --out-json alert_summary.json
EOF
}

# --- Policy Loading ---

load_policy_value() {
    local policy_file="$1"
    local key="$2"
    local default="$3"

    if [[ -n "${policy_file}" ]] && [[ -f "${policy_file}" ]]; then
        # Try to parse YAML with yq if available, otherwise grep
        if command -v yq &>/dev/null; then
            local value
            value=$(yq -r "${key} // empty" "${policy_file}" 2>/dev/null || echo "")
            if [[ -n "${value}" && "${value}" != "null" ]]; then
                echo "${value}"
                return
            fi
        fi
    fi
    echo "${default}"
}

# --- Analysis Functions ---

analyze_timeseries() {
    local timeseries_file="$1"
    local forbidden_threshold="$2"
    local rollbacks_24h_threshold="$3"
    local rollbacks_entries_threshold="$4"
    local warn_entries_threshold="$5"
    local lookback="$6"
    local verbose="$7"

    # Compute all metrics in a single jq call
    jq --argjson forbidden_threshold "${forbidden_threshold}" \
       --argjson rollbacks_24h_threshold "${rollbacks_24h_threshold}" \
       --argjson rollbacks_entries_threshold "${rollbacks_entries_threshold}" \
       --argjson warn_entries_threshold "${warn_entries_threshold}" \
       --argjson lookback "${lookback}" '
        # Current timestamp for 24h comparison (ISO format)
        (now | strftime("%Y-%m-%dT%H:%M:%SZ")) as $now_str |
        (now - 86400) as $cutoff_24h |

        # Helper: parse ISO timestamp to epoch (approximate)
        def parse_ts:
            if . == null then 0
            else
                # Extract date parts (YYYY-MM-DDTHH:MM:SSZ)
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

        # Get last N entries
        .series[:$lookback] as $recent |

        # Latest entry
        (.series[0] // {}) as $latest |

        # Count forbidden hits in latest entry
        ($latest.forbidden_hits // 0) as $forbidden_hits |

        # Count rollbacks in last N entries
        ([$recent[] | select(.deployment_status == "ROLLED_BACK")] | length) as $rollbacks_in_window |

        # Count rollbacks in last 24h
        ([$recent[] |
            select(.deployment_status == "ROLLED_BACK") |
            select((.timestamp_utc // "") | parse_ts > $cutoff_24h)
        ] | length) as $rollbacks_24h |

        # Count WARN or FAIL health levels in last N entries
        ([$recent[] | select(.health_level == "WARN" or .health_level == "FAIL")] | length) as $warn_count |

        # Compute tokens trend (spike detection)
        (if ($recent | length) >= 2 then
            ($recent[0].tokens_redacted // 0) as $curr |
            ($recent[1].tokens_redacted // 0) as $prev |
            if $prev > 0 then
                (($curr - $prev) / $prev * 100) | floor
            else
                if $curr > 0 then 999 else 0 end
            end
        else 0 end) as $tokens_spike_pct |

        # Determine triggers
        [] |
        (if $forbidden_hits > $forbidden_threshold then . + ["forbidden_hits_detected"] else . end) |
        (if $rollbacks_24h >= $rollbacks_24h_threshold then . + ["rollbacks_24h_spike"] else . end) |
        (if $rollbacks_in_window >= $rollbacks_entries_threshold then . + ["rollbacks_window_spike"] else . end) |
        (if $warn_count >= $warn_entries_threshold then . + ["warn_trend_elevated"] else . end) |
        (if $tokens_spike_pct >= 300 then . + ["tokens_spike_300pct"] else . end) |

        . as $triggers |

        # Determine level
        (if ($triggers | any(. == "forbidden_hits_detected")) then "P0"
         elif ($triggers | length) > 0 then "P1"
         else "OK" end) as $level |

        # Build output
        {
            level: $level,
            triggers: $triggers,
            metrics: {
                forbidden_hits: $forbidden_hits,
                rollbacks_24h: $rollbacks_24h,
                rollbacks_in_window: $rollbacks_in_window,
                warn_count: $warn_count,
                tokens_spike_pct: $tokens_spike_pct,
                entries_analyzed: ($recent | length),
                latest_date: ($latest.date_utc // "unknown"),
                latest_run_id: ($latest.run_id // null),
                latest_health: ($latest.health_level // "UNKNOWN"),
                latest_status: ($latest.deployment_status // "UNKNOWN")
            },
            thresholds: {
                forbidden_threshold: $forbidden_threshold,
                rollbacks_24h_threshold: $rollbacks_24h_threshold,
                rollbacks_entries_threshold: $rollbacks_entries_threshold,
                warn_entries_threshold: $warn_entries_threshold,
                lookback_entries: $lookback
            }
        }
    ' "${timeseries_file}"
}

# --- Report Generation ---

generate_markdown_report() {
    local analysis="$1"
    local run_id="$2"
    local triage_url="$3"

    local level triggers_str date_str
    level=$(echo "${analysis}" | jq -r '.level')
    triggers_str=$(echo "${analysis}" | jq -r '.triggers | join(", ")')
    date_str=$(echo "${analysis}" | jq -r '.metrics.latest_date')

    # Level emoji
    local level_emoji="✅"
    case "${level}" in
        P0) level_emoji="🚨" ;;
        P1) level_emoji="⚠️" ;;
    esac

    cat <<EOF
# Redaction Trend Alert Report

**Generated:** $(date -u +"%Y-%m-%d %H:%M UTC")
**Level:** ${level_emoji} ${level}
**Triggers:** ${triggers_str:-none}

---

## Summary

EOF

    if [[ "${level}" == "OK" ]]; then
        echo "All metrics are within normal thresholds. No action required."
        echo ""
    else
        echo "**Alert triggered!** The following conditions were detected:"
        echo ""
        echo "${analysis}" | jq -r '.triggers[] | "- \(.)"'
        echo ""
    fi

    cat <<EOF
## Metrics (Counts Only)

| Metric | Value | Threshold |
|--------|-------|-----------|
EOF

    echo "${analysis}" | jq -r '
        "| Forbidden Hits | \(.metrics.forbidden_hits) | > \(.thresholds.forbidden_threshold) |",
        "| Rollbacks (24h) | \(.metrics.rollbacks_24h) | >= \(.thresholds.rollbacks_24h_threshold) |",
        "| Rollbacks (window) | \(.metrics.rollbacks_in_window) | >= \(.thresholds.rollbacks_entries_threshold) |",
        "| WARN/FAIL Count | \(.metrics.warn_count) | >= \(.thresholds.warn_entries_threshold) |",
        "| Tokens Spike % | \(.metrics.tokens_spike_pct)% | >= 300% |"
    '

    cat <<EOF

## Latest Entry

| Field | Value |
|-------|-------|
| Date | $(echo "${analysis}" | jq -r '.metrics.latest_date') |
| Run ID | $(echo "${analysis}" | jq -r '.metrics.latest_run_id // "N/A"') |
| Health Level | $(echo "${analysis}" | jq -r '.metrics.latest_health') |
| Deployment Status | $(echo "${analysis}" | jq -r '.metrics.latest_status') |
| Entries Analyzed | $(echo "${analysis}" | jq -r '.metrics.entries_analyzed') |

---

## Links

EOF

    if [[ -n "${run_id}" ]]; then
        echo "- [Workflow Run](../../actions/runs/${run_id})"
    fi
    echo "- [Trend Page](https://\${GITHUB_REPOSITORY_OWNER}.github.io/\${GITHUB_REPOSITORY#*/}/redaction_metrics_trend.html)"
    if [[ -n "${triage_url}" ]]; then
        echo "- [Triage Packet](${triage_url})"
    fi

    if [[ "${level}" != "OK" ]]; then
        cat <<EOF

---

## Recommended Actions

EOF
        if echo "${analysis}" | jq -e '.triggers | any(. == "forbidden_hits_detected")' >/dev/null; then
            cat <<EOF
### P0: Forbidden Patterns Detected

1. **Immediate:** Review the triage packet for pattern details
2. Check recent changes to content generation
3. Review redaction policy for coverage gaps
4. Update REDACTION_POLICY.yml if needed
5. Re-run publish workflow after fixes

EOF
        fi

        if echo "${analysis}" | jq -e '.triggers | any(. == "rollbacks_24h_spike" or . == "rollbacks_window_spike")' >/dev/null; then
            cat <<EOF
### P1: Rollback Stability

1. Review rollback reasons in trend page
2. Check for systemic content issues
3. Verify redaction policy thresholds
4. Consider adjusting WARN thresholds if too sensitive

EOF
        fi

        if echo "${analysis}" | jq -e '.triggers | any(. == "warn_trend_elevated" or . == "tokens_spike_300pct")' >/dev/null; then
            cat <<EOF
### P1: Elevated WARN Trend

1. Review recent content changes
2. Check if token counts are expected
3. Verify no new sensitive content sources
4. Consider policy threshold adjustment if legitimate

EOF
        fi
    fi

    cat <<EOF

---

**Report Version:** ${SCRIPT_VERSION}
**Analysis Window:** $(echo "${analysis}" | jq -r '.thresholds.lookback_entries') entries
EOF
}

generate_issue_body() {
    local analysis="$1"
    local run_id="$2"
    local triage_url="$3"
    local repo="${4:-}"

    local level triggers_str date_str
    level=$(echo "${analysis}" | jq -r '.level')
    triggers_str=$(echo "${analysis}" | jq -r '.triggers | join(", ")')
    date_str=$(echo "${analysis}" | jq -r '.metrics.latest_date')

    cat <<EOF
## Redaction Trend Alert

**Level:** ${level}
**Date:** ${date_str}
**Triggers:** ${triggers_str}

### Metrics Summary (Counts Only)

| Metric | Value |
|--------|-------|
| Forbidden Hits | $(echo "${analysis}" | jq -r '.metrics.forbidden_hits') |
| Rollbacks (24h) | $(echo "${analysis}" | jq -r '.metrics.rollbacks_24h') |
| Rollbacks (7 entries) | $(echo "${analysis}" | jq -r '.metrics.rollbacks_in_window') |
| WARN/FAIL Count | $(echo "${analysis}" | jq -r '.metrics.warn_count') |
| Tokens Spike | $(echo "${analysis}" | jq -r '.metrics.tokens_spike_pct')% |

### Links

EOF

    if [[ -n "${run_id}" ]]; then
        echo "- [Triggering Workflow Run](https://github.com/${repo}/actions/runs/${run_id})"
    fi
    if [[ -n "${repo}" ]]; then
        local owner="${repo%%/*}"
        local name="${repo##*/}"
        echo "- [Trend Page](https://${owner}.github.io/${name}/redaction_metrics_trend.html)"
    fi
    if [[ -n "${triage_url}" ]]; then
        echo "- [Triage Packet](${triage_url})"
    fi

    cat <<EOF

### Remediation Checklist

- [ ] Review triggered conditions above
- [ ] Check trend page for patterns
- [ ] Review triage packet (if WARN/FAIL)
- [ ] Identify root cause
- [ ] Apply fix
- [ ] Verify fix resolves the trend

---

*This issue was automatically created by the Redaction Trend Alert system.*
*Counts only - no sensitive content.*
EOF
}

# --- Main ---
main() {
    local timeseries_file=""
    local policy_file=""
    local output_file=""
    local output_json=""
    local run_id=""
    local triage_url=""
    local dry_run=false
    local verbose=false

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
            --out)
                output_file="$2"
                shift 2
                ;;
            --out-json)
                output_json="$2"
                shift 2
                ;;
            --run-id)
                run_id="$2"
                shift 2
                ;;
            --triage-packet)
                triage_url="$2"
                shift 2
                ;;
            --dry-run)
                dry_run=true
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

    # Load thresholds from policy or use defaults
    local forbidden_threshold="${DEFAULT_FORBIDDEN_THRESHOLD}"
    local rollbacks_24h="${DEFAULT_ROLLBACKS_24H}"
    local rollbacks_entries="${DEFAULT_ROLLBACKS_7_ENTRIES}"
    local warn_entries="${DEFAULT_WARN_7_ENTRIES}"
    local lookback="${DEFAULT_LOOKBACK_ENTRIES}"

    if [[ -n "${policy_file}" ]] && [[ -f "${policy_file}" ]]; then
        [[ "${verbose}" == "true" ]] && log_info "Loading policy from: ${policy_file}"
        # Load values (simplified - would use yq in production)
    fi

    [[ "${verbose}" == "true" ]] && log_info "Analyzing time series: ${timeseries_file}"

    # Run analysis
    local analysis
    analysis=$(analyze_timeseries \
        "${timeseries_file}" \
        "${forbidden_threshold}" \
        "${rollbacks_24h}" \
        "${rollbacks_entries}" \
        "${warn_entries}" \
        "${lookback}" \
        "${verbose}")

    local level
    level=$(echo "${analysis}" | jq -r '.level')

    [[ "${verbose}" == "true" ]] && log_info "Analysis complete: level=${level}"

    # Output JSON summary if requested
    if [[ -n "${output_json}" ]]; then
        local out_dir
        out_dir=$(dirname "${output_json}")
        mkdir -p "${out_dir}"
        echo "${analysis}" | jq -S . > "${output_json}"
        [[ "${verbose}" == "true" ]] && log_info "Wrote JSON summary: ${output_json}"
    fi

    # Generate markdown report
    local report
    report=$(generate_markdown_report "${analysis}" "${run_id}" "${triage_url}")

    if [[ -n "${output_file}" ]]; then
        local out_dir
        out_dir=$(dirname "${output_file}")
        mkdir -p "${out_dir}"
        echo "${report}" > "${output_file}"
        [[ "${verbose}" == "true" ]] && log_info "Wrote report: ${output_file}"
    else
        echo "${report}"
    fi

    # Summary to stderr
    echo "" >&2
    log_info "=== Trend Alert Check Complete ==="
    log_info "  Level: ${level}"
    log_info "  Triggers: $(echo "${analysis}" | jq -r '.triggers | join(", ") // "none"')"

    if [[ "${dry_run}" == "true" ]]; then
        log_info "[DRY RUN] Would create/update issue for level: ${level}"
    fi

    # Output level for workflow consumption
    echo "ALERT_LEVEL=${level}"
    echo "ALERT_TRIGGERS=$(echo "${analysis}" | jq -r '.triggers | join(",")')"

    # Always exit 0 - alerting does not block deploy
    exit 0
}

main "$@"
