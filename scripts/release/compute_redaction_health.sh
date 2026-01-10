#!/usr/bin/env bash
# compute_redaction_health.sh v1.0.0
# Computes redaction health status from alert/diff reports
#
# Produces a counts-only health status (OK/WARN/FAIL) for display
# in the single page and Pages landing index.
#
# Authority: docs/ci/REDACTION_HEALTH.md

set -euo pipefail

# --- Configuration ---
SCRIPT_VERSION="1.0.0"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(git rev-parse --show-toplevel 2>/dev/null || echo ".")"

# Default thresholds (can be overridden by policy)
DEFAULT_FORBIDDEN_THRESHOLD=0
DEFAULT_TOKENS_WARN=50
DEFAULT_DOMAINS_WARN=10
DEFAULT_ISSUE_LINKS_WARN=100
DEFAULT_PR_LINKS_WARN=25
DEFAULT_SPIKE_PCT=200

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

Computes redaction health status from alert/diff reports.

OPTIONS:
    --alert-report FILE   Alert report JSON (optional)
    --diff-report FILE    Diff report JSON (optional)
    --policy FILE         Alert policy YAML (optional)
    --out FILE            Output health JSON (default: stdout)
    --run-id ID           Current run ID (optional)
    --verbose             Enable verbose logging
    --help                Show this help message

OUTPUT:
    JSON with:
      - level: OK|WARN|FAIL
      - reasons: array of trigger codes
      - date_utc: current date
      - run_id: run ID if provided
      - counts: summary metrics (optional)

EXAMPLES:
    # Compute from diff report
    $0 --diff-report site/release-ops/redaction_diff_report.json

    # Compute and write to file
    $0 --diff-report report.json --out health.json

    # With run ID
    $0 --diff-report report.json --run-id 12345678
EOF
}

# --- JSON Helpers ---

# Extract a numeric field from JSON (requires jq)
json_get_number() {
    local file="$1"
    local field="$2"
    local default="${3:-0}"

    if command -v jq &>/dev/null && [[ -f "${file}" ]]; then
        jq -r "${field} // ${default}" "${file}" 2>/dev/null || echo "${default}"
    else
        echo "${default}"
    fi
}

# --- Health Computation ---

compute_health() {
    local alert_report="${1:-}"
    local diff_report="${2:-}"
    local policy_file="${3:-}"
    local run_id="${4:-}"
    local verbose="${5:-false}"

    local level="OK"
    local reasons=()
    local date_utc
    date_utc=$(date -u +%Y-%m-%d)

    # Metrics we'll report (counts only)
    local forbidden_hits=0
    local tokens_redacted=0
    local domains_redacted=0
    local issue_links_redacted=0
    local pr_links_redacted=0
    local state_refs_redacted=0
    local run_ids_redacted=0
    local sections_collapsed=0

    # Try to read from diff report first
    if [[ -n "${diff_report}" ]] && [[ -f "${diff_report}" ]]; then
        [[ "${verbose}" == "true" ]] && log_info "Reading diff report: ${diff_report}"

        forbidden_hits=$(json_get_number "${diff_report}" ".forbidden_hits" 0)
        tokens_redacted=$(json_get_number "${diff_report}" ".tokens_redacted" 0)
        domains_redacted=$(json_get_number "${diff_report}" ".internal_domains_redacted" 0)
        issue_links_redacted=$(json_get_number "${diff_report}" ".issue_links_redacted" 0)
        pr_links_redacted=$(json_get_number "${diff_report}" ".pr_links_redacted" 0)
        state_refs_redacted=$(json_get_number "${diff_report}" ".state_refs_redacted" 0)
        run_ids_redacted=$(json_get_number "${diff_report}" ".run_ids_redacted" 0)

        # Count collapsed sections
        local blockers_collapsed domains_collapsed digest_collapsed handoff_collapsed
        blockers_collapsed=$(json_get_number "${diff_report}" ".blockers_collapsed" 0)
        digest_collapsed=$(json_get_number "${diff_report}" ".digest_collapsed" 0)
        handoff_collapsed=$(json_get_number "${diff_report}" ".handoff_collapsed" 0)
        sections_collapsed=$((blockers_collapsed + digest_collapsed + handoff_collapsed))
    fi

    # Try to read from alert report if available
    if [[ -n "${alert_report}" ]] && [[ -f "${alert_report}" ]]; then
        [[ "${verbose}" == "true" ]] && log_info "Reading alert report: ${alert_report}"

        # Alert report may have pre-computed level
        local alert_level
        alert_level=$(json_get_number "${alert_report}" ".level" "\"OK\"" | tr -d '"')

        if [[ "${alert_level}" == "FAIL" ]]; then
            level="FAIL"
            reasons+=("alert_report_fail")
        elif [[ "${alert_level}" == "WARN" ]] && [[ "${level}" != "FAIL" ]]; then
            level="WARN"
            reasons+=("alert_report_warn")
        fi

        # Override forbidden_hits from alert report if present
        local alert_forbidden
        alert_forbidden=$(json_get_number "${alert_report}" ".forbidden_hits" -1)
        if [[ "${alert_forbidden}" -ge 0 ]]; then
            forbidden_hits="${alert_forbidden}"
        fi
    fi

    # --- Evaluate thresholds ---

    # FAIL: forbidden patterns detected (hard block)
    if [[ "${forbidden_hits}" -gt ${DEFAULT_FORBIDDEN_THRESHOLD} ]]; then
        level="FAIL"
        reasons+=("forbidden_hits_gt_0")
        [[ "${verbose}" == "true" ]] && log_error "FAIL: forbidden_hits=${forbidden_hits}"
    fi

    # WARN thresholds (only if not already FAIL)
    if [[ "${level}" != "FAIL" ]]; then
        if [[ "${tokens_redacted}" -gt ${DEFAULT_TOKENS_WARN} ]]; then
            level="WARN"
            reasons+=("tokens_high")
            [[ "${verbose}" == "true" ]] && log_warn "WARN: tokens_redacted=${tokens_redacted} > ${DEFAULT_TOKENS_WARN}"
        fi

        if [[ "${domains_redacted}" -gt ${DEFAULT_DOMAINS_WARN} ]]; then
            level="WARN"
            reasons+=("domains_high")
            [[ "${verbose}" == "true" ]] && log_warn "WARN: domains_redacted=${domains_redacted} > ${DEFAULT_DOMAINS_WARN}"
        fi

        if [[ "${issue_links_redacted}" -gt ${DEFAULT_ISSUE_LINKS_WARN} ]]; then
            level="WARN"
            reasons+=("issue_links_high")
            [[ "${verbose}" == "true" ]] && log_warn "WARN: issue_links_redacted=${issue_links_redacted} > ${DEFAULT_ISSUE_LINKS_WARN}"
        fi

        if [[ "${pr_links_redacted}" -gt ${DEFAULT_PR_LINKS_WARN} ]]; then
            level="WARN"
            reasons+=("pr_links_high")
            [[ "${verbose}" == "true" ]] && log_warn "WARN: pr_links_redacted=${pr_links_redacted} > ${DEFAULT_PR_LINKS_WARN}"
        fi
    fi

    # Build reasons JSON array
    local reasons_json="[]"
    if [[ ${#reasons[@]} -gt 0 ]]; then
        reasons_json=$(printf '%s\n' "${reasons[@]}" | jq -R . | jq -s .)
    fi

    # Build output JSON
    local run_id_json="null"
    if [[ -n "${run_id}" ]]; then
        run_id_json="${run_id}"
    fi

    cat <<EOF
{
  "version": "1.0",
  "level": "${level}",
  "reasons": ${reasons_json},
  "date_utc": "${date_utc}",
  "run_id": ${run_id_json},
  "counts": {
    "forbidden_hits": ${forbidden_hits},
    "tokens_redacted": ${tokens_redacted},
    "domains_redacted": ${domains_redacted},
    "issue_links_redacted": ${issue_links_redacted},
    "pr_links_redacted": ${pr_links_redacted},
    "state_refs_redacted": ${state_refs_redacted},
    "run_ids_redacted": ${run_ids_redacted},
    "sections_collapsed": ${sections_collapsed}
  }
}
EOF
}

# Generate markdown badge section
generate_badge_markdown() {
    local health_json="$1"

    local level reasons_str date_utc
    level=$(echo "${health_json}" | jq -r '.level')
    date_utc=$(echo "${health_json}" | jq -r '.date_utc')

    # Build reasons string
    local reasons_array
    reasons_array=$(echo "${health_json}" | jq -r '.reasons[]?' 2>/dev/null || echo "")

    if [[ -n "${reasons_array}" ]]; then
        reasons_str=$(echo "${reasons_array}" | tr '\n' ', ' | sed 's/,$//')
    else
        reasons_str="none"
    fi

    # Badge emoji
    local badge_emoji badge_class
    case "${level}" in
        OK)   badge_emoji="✅"; badge_class="health-ok" ;;
        WARN) badge_emoji="⚠️"; badge_class="health-warn" ;;
        FAIL) badge_emoji="❌"; badge_class="health-fail" ;;
        *)    badge_emoji="❓"; badge_class="health-unknown" ;;
    esac

    cat <<EOF
## Redaction Health

<span class="${badge_class}">${badge_emoji} **${level}**</span>

| Metric | Value |
|--------|-------|
| Status | ${level} |
| Date | ${date_utc} |
| Triggers | ${reasons_str} |

EOF

    # Add counts if WARN or FAIL
    if [[ "${level}" != "OK" ]]; then
        local forbidden tokens domains
        forbidden=$(echo "${health_json}" | jq -r '.counts.forbidden_hits')
        tokens=$(echo "${health_json}" | jq -r '.counts.tokens_redacted')
        domains=$(echo "${health_json}" | jq -r '.counts.domains_redacted')

        cat <<EOF
**Counts:** forbidden=${forbidden}, tokens=${tokens}, domains=${domains}

EOF
    fi

    # Links to reports
    cat <<EOF
**Reports:** [Diff Report](redaction_diff_report.md) | [Trend](redaction_metrics_trend.html)

---

EOF
}

# --- Main ---
main() {
    local alert_report=""
    local diff_report=""
    local policy_file=""
    local output_file=""
    local run_id=""
    local verbose=false
    local output_markdown=false

    # Parse arguments
    while [[ $# -gt 0 ]]; do
        case $1 in
            --alert-report)
                alert_report="$2"
                shift 2
                ;;
            --diff-report)
                diff_report="$2"
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
            --run-id)
                run_id="$2"
                shift 2
                ;;
            --markdown)
                output_markdown=true
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

    # Check for jq
    if ! command -v jq &>/dev/null; then
        log_warn "jq not found, using minimal fallback"
    fi

    [[ "${verbose}" == "true" ]] && log_info "Computing redaction health..."

    # Compute health
    local health_json
    health_json=$(compute_health "${alert_report}" "${diff_report}" "${policy_file}" "${run_id}" "${verbose}")

    # Output
    if [[ "${output_markdown}" == "true" ]]; then
        generate_badge_markdown "${health_json}"
    elif [[ -n "${output_file}" ]]; then
        echo "${health_json}" | jq -S . > "${output_file}" 2>/dev/null || echo "${health_json}" > "${output_file}"
        [[ "${verbose}" == "true" ]] && log_info "Wrote health to: ${output_file}"
    else
        echo "${health_json}" | jq -S . 2>/dev/null || echo "${health_json}"
    fi

    # Exit with appropriate code
    local level
    level=$(echo "${health_json}" | jq -r '.level' 2>/dev/null || echo "OK")

    case "${level}" in
        FAIL) exit 2 ;;
        WARN) exit 0 ;;  # WARN doesn't block
        *)    exit 0 ;;
    esac
}

main "$@"
