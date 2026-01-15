#!/usr/bin/env bash
# generate_release_ops_single_page.sh v1.1.0
# Generates a consolidated single-page summary of Release Ops state
#
# This is the "open this first" document that provides:
# - Redaction health badge (counts-only)
# - Release snapshot and action queue
# - Top blockers with links
# - Escalation summary
# - Daily digest (or skipped placeholder)
# - On-call handoff (or skipped placeholder)
# - Artifacts index
#
# Authority: docs/ci/RELEASE_OPS_SINGLE_PAGE.md

set -euo pipefail

# --- Configuration ---
SCRIPT_VERSION="1.1.0"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(git rev-parse --show-toplevel 2>/dev/null || echo ".")"
COMPUTE_HEALTH_SCRIPT="${SCRIPT_DIR}/compute_redaction_health.sh"

# Output limits (prevent unbounded output)
MAX_BLOCKERS=10
MAX_DIGEST_LINES=100
MAX_HANDOFF_LINES=80
MAX_ESCALATION_LINES=30

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

# --- Helper functions ---
print_usage() {
    cat <<EOF
Usage: $0 [OPTIONS]

Generates a consolidated single-page Release Ops summary.

OPTIONS:
    --reports-dir DIR      Directory containing report files (default: artifacts/release-train/)
    --site-dir DIR         Site directory for redaction health data (optional)
    --dashboard-json FILE  Path to dashboard.json (default: <reports-dir>/dashboard.json)
    --out FILE             Output file path (default: <reports-dir>/release_ops_single_page.md)
    --run-id ID            Orchestrator run ID for linking
    --repo REPO            Repository name (default: from git remote)
    --verbose              Enable verbose logging
    --help                 Show this help message

EXAMPLES:
    # Generate from default locations
    $0

    # Generate with custom paths
    $0 --reports-dir artifacts/release-train/ --out summary.md

    # Generate with run ID for linking
    $0 --run-id 12345678
EOF
}

# Get repository name from git remote
get_repo_name() {
    local remote_url
    remote_url=$(git remote get-url origin 2>/dev/null || echo "")

    if [[ -n "${remote_url}" ]]; then
        # Extract owner/repo from URL
        echo "${remote_url}" | sed -E 's|.*[:/]([^/]+/[^/]+)(\.git)?$|\1|'
    else
        echo "unknown/repo"
    fi
}

# Safe file read with missing file handling
safe_read_file() {
    local file="$1"
    local max_lines="${2:-0}"

    if [[ ! -f "${file}" ]]; then
        echo "_Missing input: \`${file}\`_"
        return 1
    fi

    if [[ "${max_lines}" -gt 0 ]]; then
        local total_lines
        total_lines=$(wc -l < "${file}" | tr -d ' ')

        if [[ "${total_lines}" -gt "${max_lines}" ]]; then
            head -n "${max_lines}" "${file}"
            echo ""
            echo "_... truncated (${total_lines} total lines). See full file: \`${file}\`_"
        else
            cat "${file}"
        fi
    else
        cat "${file}"
    fi
}

# Extract JSON value with jq, with fallback
json_value() {
    local file="$1"
    local path="$2"
    local default="${3:-}"

    if [[ ! -f "${file}" ]]; then
        echo "${default}"
        return
    fi

    local value
    value=$(jq -r "${path} // \"${default}\"" "${file}" 2>/dev/null)

    if [[ -z "${value}" ]] || [[ "${value}" == "null" ]]; then
        echo "${default}"
    else
        echo "${value}"
    fi
}

# --- Section generators ---

generate_redaction_health() {
    local reports_dir="$1"
    local site_dir="${2:-}"

    # Look for health report in site dir first, then reports dir
    local health_json=""
    local diff_report=""
    local alert_report=""

    if [[ -n "${site_dir}" ]] && [[ -f "${site_dir}/redaction_health.json" ]]; then
        health_json="${site_dir}/redaction_health.json"
    elif [[ -f "${reports_dir}/redaction_health.json" ]]; then
        health_json="${reports_dir}/redaction_health.json"
    fi

    if [[ -n "${site_dir}" ]] && [[ -f "${site_dir}/redaction_diff_report.json" ]]; then
        diff_report="${site_dir}/redaction_diff_report.json"
    elif [[ -f "${reports_dir}/redaction_diff_report.json" ]]; then
        diff_report="${reports_dir}/redaction_diff_report.json"
    fi

    if [[ -n "${site_dir}" ]] && [[ -f "${site_dir}/redaction_alert_report.json" ]]; then
        alert_report="${site_dir}/redaction_alert_report.json"
    elif [[ -f "${reports_dir}/redaction_alert_report.json" ]]; then
        alert_report="${reports_dir}/redaction_alert_report.json"
    fi

    # If we have the compute script and source data, generate fresh health
    if [[ -x "${COMPUTE_HEALTH_SCRIPT}" ]] && { [[ -n "${diff_report}" ]] || [[ -n "${alert_report}" ]]; }; then
        local args=()
        [[ -n "${diff_report}" ]] && args+=(--diff-report "${diff_report}")
        [[ -n "${alert_report}" ]] && args+=(--alert-report "${alert_report}")

        "${COMPUTE_HEALTH_SCRIPT}" "${args[@]}" --markdown 2>/dev/null && return 0
    fi

    # If we have pre-computed health JSON, use it
    if [[ -f "${health_json}" ]] && command -v jq &>/dev/null; then
        local level reasons_str date_utc
        level=$(jq -r '.level // "UNKNOWN"' "${health_json}")
        date_utc=$(jq -r '.date_utc // "N/A"' "${health_json}")

        local reasons_array
        reasons_array=$(jq -r '.reasons[]?' "${health_json}" 2>/dev/null | tr '\n' ', ' | sed 's/,$//' || echo "none")
        [[ -z "${reasons_array}" ]] && reasons_array="none"

        # Badge styling
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
| Triggers | ${reasons_array} |

EOF

        # Add links if available
        if [[ -n "${site_dir}" ]]; then
            echo "**Reports:** [Diff Report](redaction_diff_report.md) | [Trend](redaction_metrics_trend.html)"
        fi

        echo ""
        echo "---"
        echo ""
        return 0
    fi

    # Default: no health data available
    cat <<EOF
## Redaction Health

<span class="health-unknown">❓ **N/A**</span>

_Redaction health data not available._

_This section will show OK/WARN/FAIL status when redaction reports are present._

---

EOF
}

generate_header() {
    local repo="$1"
    local run_id="$2"
    local timestamp
    timestamp=$(date -u +"%Y-%m-%dT%H:%M:%SZ")

    cat <<EOF
# Release Ops Single Page

> **Repository:** ${repo}
> **Generated:** ${timestamp}
> **Run ID:** ${run_id:-"N/A"}

---

EOF
}

generate_release_snapshot() {
    local dashboard_json="$1"

    cat <<EOF
## Release Snapshot

EOF

    if [[ ! -f "${dashboard_json}" ]]; then
        cat <<EOF
_Missing input: \`${dashboard_json}\`_

Unable to generate release snapshot without dashboard data.

EOF
        return
    fi

    # Extract summary counts
    local total promotable blocked pending
    total=$(json_value "${dashboard_json}" ".summary.total_candidates" "0")
    promotable=$(json_value "${dashboard_json}" ".summary.promotable" "0")
    blocked=$(json_value "${dashboard_json}" ".summary.blocked" "0")
    pending=$(json_value "${dashboard_json}" ".summary.pending" "0")

    cat <<EOF
| Metric | Count |
|--------|-------|
| Total Candidates | ${total} |
| Promotable | ${promotable} |
| Blocked | ${blocked} |
| Pending | ${pending} |

EOF

    # Action Queue
    echo "### Action Queue"
    echo ""

    if [[ "${promotable}" -gt 0 ]]; then
        echo "**Ready to Promote:**"
        echo ""
        jq -r '.candidates[] | select(.promotable_state == "promotable") | "- \(.tag)"' \
            "${dashboard_json}" 2>/dev/null || echo "- _(error reading candidates)_"
        echo ""
    fi

    if [[ "${blocked}" -gt 0 ]]; then
        echo "**Blocked (needs attention):**"
        echo ""
        jq -r '.candidates[] | select(.promotable_state == "blocked") | "- \(.tag): \(.top_blocker // "unknown")"' \
            "${dashboard_json}" 2>/dev/null | head -n 5 || echo "- _(error reading candidates)_"
        echo ""
    fi

    if [[ "${pending}" -gt 0 ]]; then
        echo "**Pending (checks running):**"
        echo ""
        jq -r '.candidates[] | select(.promotable_state == "pending") | "- \(.tag)"' \
            "${dashboard_json}" 2>/dev/null | head -n 5 || echo "- _(error reading candidates)_"
        echo ""
    fi

    if [[ "${promotable}" -eq 0 ]] && [[ "${blocked}" -eq 0 ]] && [[ "${pending}" -eq 0 ]]; then
        echo "_No release candidates found._"
        echo ""
    fi

    echo "---"
    echo ""
}

generate_top_blockers() {
    local dashboard_json="$1"
    local blocked_report="$2"
    local max_blockers="$3"

    cat <<EOF
## Top Blockers

EOF

    local blockers_found=false

    # Try dashboard.json first
    if [[ -f "${dashboard_json}" ]]; then
        local blocked_count
        blocked_count=$(json_value "${dashboard_json}" ".summary.blocked" "0")

        if [[ "${blocked_count}" -gt 0 ]]; then
            blockers_found=true

            echo "| Tag | Blocker | State |"
            echo "|-----|---------|-------|"

            jq -r ".candidates[] | select(.promotable_state == \"blocked\") | \"| \(.tag) | \(.top_blocker // \"-\") | \(.promotable_state) |\"" \
                "${dashboard_json}" 2>/dev/null | head -n "${max_blockers}"

            echo ""

            local total_blocked
            total_blocked=$(jq -r '[.candidates[] | select(.promotable_state == "blocked")] | length' "${dashboard_json}" 2>/dev/null || echo "0")

            if [[ "${total_blocked}" -gt "${max_blockers}" ]]; then
                echo "_Showing ${max_blockers} of ${total_blocked} blocked candidates. See dashboard.json for full list._"
                echo ""
            fi
        fi
    fi

    # Fall back to blocked_issues_report.md if no dashboard blockers
    if [[ "${blockers_found}" != "true" ]] && [[ -f "${blocked_report}" ]]; then
        blockers_found=true
        echo "_(From blocked_issues_report.md)_"
        echo ""
        safe_read_file "${blocked_report}" 50
        echo ""
    fi

    if [[ "${blockers_found}" != "true" ]]; then
        echo "_No blockers detected._"
        echo ""
    fi

    echo "---"
    echo ""
}

generate_escalation_summary() {
    local escalation_report="$1"
    local max_lines="$2"

    cat <<EOF
## Escalation Summary

EOF

    if [[ ! -f "${escalation_report}" ]]; then
        echo "_Missing input: \`${escalation_report}\`_"
        echo ""
        echo "---"
        echo ""
        return
    fi

    # Check if it's a placeholder report
    if grep -q "Script execution failed\|not available\|Escalation script not available" "${escalation_report}" 2>/dev/null; then
        echo "_Escalation report not available this cycle._"
        echo ""
    else
        safe_read_file "${escalation_report}" "${max_lines}"
        echo ""
    fi

    echo "---"
    echo ""
}

generate_digest_section() {
    local digest_file="$1"
    local max_lines="$2"

    cat <<EOF
## Daily Digest

EOF

    if [[ ! -f "${digest_file}" ]]; then
        echo "_Missing input: \`${digest_file}\`_"
        echo ""
        echo "---"
        echo ""
        return
    fi

    # Check if digest was skipped
    if grep -q "Digest skipped\|Skipped:" "${digest_file}" 2>/dev/null; then
        cat <<EOF
_Digest skipped this cycle (outside configured window or cadence not elapsed)._

See \`docs/ci/RELEASE_OPS_DIGEST_POLICY.yml\` for window configuration.

EOF
    elif grep -q "Script execution failed\|not available\|Digest script not available" "${digest_file}" 2>/dev/null; then
        echo "_Digest generation not available this cycle._"
        echo ""
    else
        echo "<details>"
        echo "<summary>Click to expand digest</summary>"
        echo ""
        safe_read_file "${digest_file}" "${max_lines}"
        echo ""
        echo "</details>"
        echo ""
    fi

    echo "---"
    echo ""
}

generate_handoff_section() {
    local handoff_file="$1"
    local max_lines="$2"

    cat <<EOF
## On-Call Handoff

EOF

    if [[ ! -f "${handoff_file}" ]]; then
        echo "_Missing input: \`${handoff_file}\`_"
        echo ""
        echo "---"
        echo ""
        return
    fi

    # Check if handoff was skipped
    if grep -q "Handoff skipped\|Skipped:" "${handoff_file}" 2>/dev/null; then
        cat <<EOF
_Handoff skipped this cycle (outside shift-change windows or cadence not elapsed)._

See \`docs/ci/ONCALL_HANDOFF_POLICY.yml\` for window configuration.

EOF
    elif grep -q "Script execution failed\|not available\|Handoff script not available" "${handoff_file}" 2>/dev/null; then
        echo "_Handoff generation not available this cycle._"
        echo ""
    else
        echo "<details>"
        echo "<summary>Click to expand handoff</summary>"
        echo ""
        safe_read_file "${handoff_file}" "${max_lines}"
        echo ""
        echo "</details>"
        echo ""
    fi

    echo "---"
    echo ""
}

generate_artifacts_index() {
    local reports_dir="$1"

    cat <<EOF
## Artifacts Index

### Report Files

| File | Description |
|------|-------------|
| \`dashboard.json\` | Machine-readable release train status |
| \`dashboard.md\` | Human-readable dashboard |
| \`blocked_issues_report.md\` | Blocker issues raised this cycle |
| \`routing_report.md\` | Triage routing actions taken |
| \`escalation_report.md\` | Escalation actions taken |
| \`release_ops_digest.md\` | Daily digest (if generated) |
| \`oncall_handoff.md\` | On-call handoff (if generated) |
| \`cycle_summary.md\` | Cycle metadata and summary |
| \`release_ops_single_page.md\` | This file |

### State Snapshot

EOF

    local state_dir="${reports_dir}/state-snapshot"
    if [[ -d "${state_dir}" ]]; then
        echo "| State File | Purpose |"
        echo "|------------|---------|"

        for f in "${state_dir}"/*.json 2>/dev/null; do
            if [[ -f "${f}" ]]; then
                local basename
                basename=$(basename "${f}")
                echo "| \`${basename}\` | Point-in-time snapshot |"
            fi
        done
        echo ""
    else
        echo "_State snapshot directory not found._"
        echo ""
    fi

    cat <<EOF

### How to Access

1. **GitHub Actions UI:** Download the \`release-ops-cycle-{run_id}\` artifact
2. **CLI:** \`gh run download <run_id> -n release-ops-cycle-<run_id>\`

---

_Generated by \`scripts/release/generate_release_ops_single_page.sh\` v${SCRIPT_VERSION}_
EOF
}

# --- Main ---
main() {
    local reports_dir="artifacts/release-train"
    local site_dir=""
    local dashboard_json=""
    local out_file=""
    local run_id=""
    local repo=""
    local verbose=false

    # Parse arguments
    while [[ $# -gt 0 ]]; do
        case $1 in
            --reports-dir)
                reports_dir="$2"
                shift 2
                ;;
            --site-dir)
                site_dir="$2"
                shift 2
                ;;
            --dashboard-json)
                dashboard_json="$2"
                shift 2
                ;;
            --out)
                out_file="$2"
                shift 2
                ;;
            --run-id)
                run_id="$2"
                shift 2
                ;;
            --repo)
                repo="$2"
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

    # Set defaults
    [[ -z "${dashboard_json}" ]] && dashboard_json="${reports_dir}/dashboard.json"
    [[ -z "${out_file}" ]] && out_file="${reports_dir}/release_ops_single_page.md"
    [[ -z "${repo}" ]] && repo=$(get_repo_name)

    [[ "${verbose}" == "true" ]] && log_info "Reports dir: ${reports_dir}"
    [[ "${verbose}" == "true" ]] && log_info "Dashboard: ${dashboard_json}"
    [[ "${verbose}" == "true" ]] && log_info "Output: ${out_file}"

    # Ensure output directory exists
    mkdir -p "$(dirname "${out_file}")"

    # Generate the single page
    {
        generate_header "${repo}" "${run_id}"
        generate_redaction_health "${reports_dir}" "${site_dir}"
        generate_release_snapshot "${dashboard_json}"
        generate_top_blockers "${dashboard_json}" "${reports_dir}/blocked_issues_report.md" "${MAX_BLOCKERS}"
        generate_escalation_summary "${reports_dir}/escalation_report.md" "${MAX_ESCALATION_LINES}"
        generate_digest_section "${reports_dir}/release_ops_digest.md" "${MAX_DIGEST_LINES}"
        generate_handoff_section "${reports_dir}/oncall_handoff.md" "${MAX_HANDOFF_LINES}"
        generate_artifacts_index "${reports_dir}"
    } > "${out_file}"

    log_info "Generated: ${out_file}"

    # Output stats
    local line_count
    line_count=$(wc -l < "${out_file}" | tr -d ' ')
    log_info "Total lines: ${line_count}"
}

main "$@"
