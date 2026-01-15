#!/usr/bin/env bash
# generate_governance_report.sh v1.0.0
# Generates comprehensive governance status reports
#
# This script produces periodic reports summarizing:
# - Current governance health status
# - Policy validation history
# - Drift events and transitions
# - Audit log summary
# - Recommendations and action items
#
# Authority: docs/ci/GOVERNANCE_LOCKFILE.md

set -euo pipefail

# --- Configuration ---
SCRIPT_VERSION="1.0.0"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(git rev-parse --show-toplevel 2>/dev/null || echo ".")"

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

Generates comprehensive governance status reports.

OPTIONS:
    --period PERIOD       Report period: daily, weekly, monthly (default: weekly)
    --format FORMAT       Output format: md, html, json (default: md)
    --out-file FILE       Output file (default: stdout)
    --title TITLE         Report title
    --verbose             Enable verbose logging
    --help                Show this help message

EXAMPLES:
    # Generate weekly report
    $0 --period weekly

    # Generate monthly HTML report
    $0 --period monthly --format html --out-file report.html

    # Generate daily JSON report
    $0 --period daily --format json
EOF
}

# --- Data Collection ---

get_period_dates() {
    local period="$1"
    local end_date start_date

    end_date=$(date -u +%Y-%m-%d)

    case "${period}" in
        daily)
            start_date=$(date -u -d "1 day ago" +%Y-%m-%d 2>/dev/null || date -u -v-1d +%Y-%m-%d)
            ;;
        weekly)
            start_date=$(date -u -d "7 days ago" +%Y-%m-%d 2>/dev/null || date -u -v-7d +%Y-%m-%d)
            ;;
        monthly)
            start_date=$(date -u -d "30 days ago" +%Y-%m-%d 2>/dev/null || date -u -v-30d +%Y-%m-%d)
            ;;
        *)
            start_date=$(date -u -d "7 days ago" +%Y-%m-%d 2>/dev/null || date -u -v-7d +%Y-%m-%d)
            ;;
    esac

    echo "${start_date}|${end_date}"
}

collect_health_data() {
    local health_script="${SCRIPT_DIR}/compute_governance_health.sh"

    if [[ -x "${health_script}" ]]; then
        # Capture output first, then check if valid JSON (script may exit non-zero intentionally)
        local output
        output=$("${health_script}" 2>/dev/null) || true
        if echo "${output}" | jq empty 2>/dev/null; then
            echo "${output}"
        else
            echo '{"overall":{"status":"UNKNOWN","score":0}}'
        fi
    else
        echo '{"overall":{"status":"UNAVAILABLE","score":0}}'
    fi
}

collect_audit_data() {
    local start_date="$1"
    local audit_log="${REPO_ROOT}/docs/releases/_state/governance_audit_log.json"

    if [[ ! -f "${audit_log}" ]]; then
        echo '{"entries":[],"stats":{"total":0}}'
        return
    fi

    jq --arg since "${start_date}" '{
        entries: [.entries[] | select(.timestamp >= $since)],
        stats: {
            total: ([.entries[] | select(.timestamp >= $since)] | length),
            by_type: ([.entries[] | select(.timestamp >= $since)] | group_by(.event_type) | map({type: .[0].event_type, count: length})),
            by_status: ([.entries[] | select(.timestamp >= $since)] | group_by(.status) | map({status: .[0].status, count: length})),
            failures: ([.entries[] | select(.timestamp >= $since) | select(.status == "failure")] | length),
            warnings: ([.entries[] | select(.timestamp >= $since) | select(.status == "warning")] | length)
        }
    }' "${audit_log}"
}

collect_drift_data() {
    local drift_script="${SCRIPT_DIR}/check_governance_drift.sh"
    local timeseries="${REPO_ROOT}/site/release-ops/redaction_metrics_timeseries.json"

    if [[ -x "${drift_script}" && -f "${timeseries}" ]]; then
        # Capture output first, then check if valid JSON (script may exit non-zero intentionally)
        local output
        output=$("${drift_script}" --timeseries "${timeseries}" --json --window 30 2>/dev/null) || true
        if echo "${output}" | jq empty 2>/dev/null; then
            echo "${output}"
        else
            echo '{"drift_detected":false,"transitions_count":0}'
        fi
    else
        echo '{"drift_detected":false,"transitions_count":0,"message":"Drift check unavailable"}'
    fi
}

collect_lockfile_data() {
    local lockfile="${REPO_ROOT}/docs/releases/_state/governance_lockfile.json"

    if [[ -f "${lockfile}" ]]; then
        local hash generated_at tag
        hash=$(sha256sum "${lockfile}" 2>/dev/null | cut -d' ' -f1 || echo "")
        generated_at=$(jq -r '.generated_at_utc // "unknown"' "${lockfile}")
        tag=$(jq -r '.tag // "none"' "${lockfile}")

        jq -n \
            --arg exists "true" \
            --arg hash "${hash}" \
            --arg generated "${generated_at}" \
            --arg tag "${tag}" \
            '{exists: true, hash: $hash, generated_at: $generated, tag: $tag}'
    else
        echo '{"exists":false}'
    fi
}

collect_policy_data() {
    local validator="${SCRIPT_DIR}/validate_governance_policies.sh"

    if [[ -x "${validator}" ]]; then
        # Capture output first, then check if valid JSON (script may exit non-zero intentionally)
        local output
        output=$("${validator}" --json 2>/dev/null) || true
        if echo "${output}" | jq empty 2>/dev/null; then
            echo "${output}"
        else
            echo '{"status":"error","summary":{}}'
        fi
    else
        echo '{"status":"unavailable","summary":{}}'
    fi
}

# --- Report Generation ---

generate_recommendations() {
    local health_data="$1"
    local audit_data="$2"
    local drift_data="$3"
    local lockfile_data="$4"
    local policy_data="$5"

    local recommendations=()

    # Health-based recommendations
    local health_status
    health_status=$(echo "${health_data}" | jq -r '.overall.status // "UNKNOWN"')
    if [[ "${health_status}" == "CRITICAL" ]]; then
        recommendations+=("CRITICAL: Address governance health issues immediately")
    elif [[ "${health_status}" == "WARNING" ]]; then
        recommendations+=("Review and resolve governance warnings")
    fi

    # Lockfile recommendations
    local lockfile_exists
    lockfile_exists=$(echo "${lockfile_data}" | jq -r '.exists // false')
    if [[ "${lockfile_exists}" != "true" ]]; then
        recommendations+=("Generate governance lockfile before next release")
    fi

    # Drift recommendations
    local drift_detected
    drift_detected=$(echo "${drift_data}" | jq -r '.drift_detected // false')
    if [[ "${drift_detected}" == "true" ]]; then
        recommendations+=("Investigate governance drift detected in recent history")
    fi

    # Policy recommendations
    local policy_failed
    policy_failed=$(echo "${policy_data}" | jq -r '.summary.failed // 0' | tr -d '\n')
    if [[ -n "${policy_failed}" && "${policy_failed}" != "null" && "${policy_failed}" -gt 0 ]] 2>/dev/null; then
        recommendations+=("Fix ${policy_failed} policy validation failure(s)")
    fi

    # Audit log recommendations
    local audit_failures
    audit_failures=$(echo "${audit_data}" | jq -r '.stats.failures // 0' | tr -d '\n')
    if [[ -n "${audit_failures}" && "${audit_failures}" != "null" && "${audit_failures}" -gt 3 ]] 2>/dev/null; then
        recommendations+=("Review ${audit_failures} failures in audit log for patterns")
    fi

    # Output as JSON array
    if [[ ${#recommendations[@]} -eq 0 ]]; then
        echo "[]"
    else
        printf '%s\n' "${recommendations[@]}" | jq -R . | jq -s .
    fi
}

render_markdown() {
    local title="$1"
    local period="$2"
    local start_date="$3"
    local end_date="$4"
    local health_data="$5"
    local audit_data="$6"
    local drift_data="$7"
    local lockfile_data="$8"
    local policy_data="$9"
    local recommendations="${10}"

    local health_status health_score
    health_status=$(echo "${health_data}" | jq -r '.overall.status // "UNKNOWN"')
    health_score=$(echo "${health_data}" | jq -r '.overall.score // 0')

    local status_emoji="⚪"
    case "${health_status}" in
        OK) status_emoji="✅" ;;
        WARNING) status_emoji="⚠️" ;;
        CRITICAL) status_emoji="🔴" ;;
    esac

    cat <<EOF
# ${title}

**Period:** ${start_date} to ${end_date} (${period})
**Generated:** $(date -u +%Y-%m-%dT%H:%M:%SZ)
**Version:** ${SCRIPT_VERSION}

---

## Executive Summary

| Metric | Value |
|--------|-------|
| Overall Status | ${status_emoji} **${health_status}** |
| Health Score | **${health_score}%** |
| Audit Events | $(echo "${audit_data}" | jq -r '.stats.total // 0') |
| Failures | $(echo "${audit_data}" | jq -r '.stats.failures // 0') |
| Drift Detected | $(echo "${drift_data}" | jq -r '.drift_detected // false') |

---

## Governance Health

### Component Scores

| Component | Status | Score |
|-----------|--------|-------|
$(echo "${health_data}" | jq -r '.components // {} | to_entries[] | "| \(.key | gsub("_"; " ") | split(" ") | map((.[0:1] | ascii_upcase) + .[1:]) | join(" ")) | \(.value.status // "N/A") | \(.value.score // 0)% |"')

### Health Details

$(echo "${health_data}" | jq -r '.components // {} | to_entries[] | "- **\(.key | gsub("_"; " ") | split(" ") | map((.[0:1] | ascii_upcase) + .[1:]) | join(" "))**: \(.value.message // "No details")"')

---

## Governance Lockfile

| Property | Value |
|----------|-------|
| Exists | $(echo "${lockfile_data}" | jq -r 'if .exists then "Yes" else "No" end') |
| Hash | \`$(echo "${lockfile_data}" | jq -r '.hash[:16] // "N/A"')...\` |
| Generated | $(echo "${lockfile_data}" | jq -r '.generated_at // "N/A"') |
| Tag | $(echo "${lockfile_data}" | jq -r '.tag // "N/A"') |

---

## Policy Validation

| Metric | Value |
|--------|-------|
| Status | $(echo "${policy_data}" | jq -r '.status // "unknown"') |
| Total Checks | $(echo "${policy_data}" | jq -r '.summary.total // 0') |
| Passed | $(echo "${policy_data}" | jq -r '.summary.passed // 0') |
| Failed | $(echo "${policy_data}" | jq -r '.summary.failed // 0') |
| Warnings | $(echo "${policy_data}" | jq -r '.summary.warnings // 0') |

---

## Drift Analysis

| Metric | Value |
|--------|-------|
| Drift Detected | $(echo "${drift_data}" | jq -r '.drift_detected // false') |
| Transitions | $(echo "${drift_data}" | jq -r '.transitions_count // 0') |
| Unique Hashes | $(echo "${drift_data}" | jq -r '.unique_hashes // 0') |

$(if [[ $(echo "${drift_data}" | jq -r '.drift_detected // false') == "true" ]]; then
    echo "### Recent Transitions"
    echo ""
    echo "${drift_data}" | jq -r '.transitions[:5][] | "- **\(.date // "unknown")**: \(.from_hash[:8] // "?")... → \(.to_hash[:8] // "?")..."'
fi)

---

## Audit Log Summary

### Events by Type

| Event Type | Count |
|------------|-------|
$(echo "${audit_data}" | jq -r '.stats.by_type[]? | "| \(.type) | \(.count) |"')

### Events by Status

| Status | Count |
|--------|-------|
$(echo "${audit_data}" | jq -r '.stats.by_status[]? | "| \(.status) | \(.count) |"')

### Recent Events

| Timestamp | Type | Status | Message |
|-----------|------|--------|---------|
$(echo "${audit_data}" | jq -r '.entries[:10][] | "| \(.timestamp[:16]) | \(.event_type) | \(.status) | \(.message[:40])... |"')

---

## Recommendations

$(echo "${recommendations}" | jq -r '.[] | "- \(.)"')

$(if [[ $(echo "${recommendations}" | jq 'length') -eq 0 ]]; then
    echo "No recommendations at this time. Governance is healthy."
fi)

---

## Quick Actions

\`\`\`bash
# View current governance health
./scripts/release/compute_governance_health.sh --verbose

# Run policy validation
./scripts/release/validate_governance_policies.sh --verbose

# Check for drift
./scripts/release/check_governance_drift.sh --verbose

# Query audit log
./scripts/release/query_governance_audit_log.sh --stats

# Generate new lockfile
./scripts/release/generate_governance_lockfile.sh --sha \$(git rev-parse HEAD)
\`\`\`

---

*Report generated by generate_governance_report.sh v${SCRIPT_VERSION}*
EOF
}

render_html() {
    local title="$1"
    local period="$2"
    local start_date="$3"
    local end_date="$4"
    local health_data="$5"
    local audit_data="$6"
    local drift_data="$7"
    local lockfile_data="$8"
    local policy_data="$9"
    local recommendations="${10}"

    local health_status health_score
    health_status=$(echo "${health_data}" | jq -r '.overall.status // "UNKNOWN"')
    health_score=$(echo "${health_data}" | jq -r '.overall.score // 0')

    local status_color="#666"
    case "${health_status}" in
        OK) status_color="#00d4aa" ;;
        WARNING) status_color="#feca57" ;;
        CRITICAL) status_color="#ff6b6b" ;;
    esac

    cat <<EOF
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${title}</title>
    <style>
        :root {
            --bg-primary: #1a1a2e;
            --bg-secondary: #16213e;
            --bg-card: #0f3460;
            --text-primary: #e8e8e8;
            --text-secondary: #a0a0a0;
            --accent-green: #00d4aa;
            --accent-red: #ff6b6b;
            --accent-yellow: #feca57;
            --accent-blue: #4ecdc4;
            --status-color: ${status_color};
        }
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: var(--bg-primary);
            color: var(--text-primary);
            line-height: 1.6;
            padding: 2rem;
        }
        .container { max-width: 1200px; margin: 0 auto; }
        h1 { color: var(--accent-blue); margin-bottom: 0.5rem; }
        h2 { color: var(--text-primary); margin: 2rem 0 1rem; padding-bottom: 0.5rem; border-bottom: 1px solid rgba(255,255,255,0.1); }
        .subtitle { color: var(--text-secondary); font-size: 0.875rem; margin-bottom: 2rem; }
        .summary-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1rem; margin-bottom: 2rem; }
        .summary-card {
            background: var(--bg-card);
            padding: 1.5rem;
            border-radius: 8px;
            text-align: center;
        }
        .summary-card .value { font-size: 2rem; font-weight: bold; color: var(--status-color); }
        .summary-card .label { color: var(--text-secondary); font-size: 0.875rem; }
        .card { background: var(--bg-card); border-radius: 8px; padding: 1.5rem; margin-bottom: 1.5rem; }
        table { width: 100%; border-collapse: collapse; margin: 1rem 0; }
        th, td { text-align: left; padding: 0.75rem; border-bottom: 1px solid rgba(255,255,255,0.1); }
        th { color: var(--text-secondary); font-size: 0.75rem; text-transform: uppercase; }
        .badge { display: inline-block; padding: 0.25rem 0.75rem; border-radius: 4px; font-size: 0.75rem; font-weight: bold; }
        .badge-ok { background: rgba(0,212,170,0.2); color: var(--accent-green); }
        .badge-warning { background: rgba(254,202,87,0.2); color: var(--accent-yellow); }
        .badge-critical { background: rgba(255,107,107,0.2); color: var(--accent-red); }
        .recommendations { list-style: none; }
        .recommendations li { padding: 0.5rem 0; padding-left: 1.5rem; position: relative; }
        .recommendations li::before { content: "→"; position: absolute; left: 0; color: var(--accent-blue); }
        .footer { margin-top: 2rem; padding-top: 1rem; border-top: 1px solid rgba(255,255,255,0.1); text-align: center; color: var(--text-secondary); font-size: 0.75rem; }
    </style>
</head>
<body>
    <div class="container">
        <h1>${title}</h1>
        <p class="subtitle">Period: ${start_date} to ${end_date} | Generated: $(date -u +%Y-%m-%dT%H:%M:%SZ)</p>

        <div class="summary-grid">
            <div class="summary-card">
                <div class="value">${health_status}</div>
                <div class="label">Overall Status</div>
            </div>
            <div class="summary-card">
                <div class="value">${health_score}%</div>
                <div class="label">Health Score</div>
            </div>
            <div class="summary-card">
                <div class="value">$(echo "${audit_data}" | jq -r '.stats.total // 0')</div>
                <div class="label">Audit Events</div>
            </div>
            <div class="summary-card">
                <div class="value">$(echo "${audit_data}" | jq -r '.stats.failures // 0')</div>
                <div class="label">Failures</div>
            </div>
        </div>

        <h2>Component Health</h2>
        <div class="card">
            <table>
                <thead>
                    <tr><th>Component</th><th>Status</th><th>Score</th><th>Details</th></tr>
                </thead>
                <tbody>
$(echo "${health_data}" | jq -r '.components // {} | to_entries[] | "                    <tr><td>\(.key | gsub("_"; " "))</td><td><span class=\"badge badge-\(.value.status | ascii_downcase)\">\(.value.status)</span></td><td>\(.value.score)%</td><td>\(.value.message // "-")</td></tr>"')
                </tbody>
            </table>
        </div>

        <h2>Recommendations</h2>
        <div class="card">
            <ul class="recommendations">
$(echo "${recommendations}" | jq -r '.[] | "                <li>\(.)</li>"')
$(if [[ $(echo "${recommendations}" | jq 'length') -eq 0 ]]; then echo "                <li>No recommendations. Governance is healthy.</li>"; fi)
            </ul>
        </div>

        <h2>Recent Audit Events</h2>
        <div class="card">
            <table>
                <thead>
                    <tr><th>Timestamp</th><th>Type</th><th>Status</th><th>Message</th></tr>
                </thead>
                <tbody>
$(echo "${audit_data}" | jq -r '.entries[:10][] | "                    <tr><td>\(.timestamp[:16])</td><td>\(.event_type)</td><td>\(.status)</td><td>\(.message[:50])...</td></tr>"')
                </tbody>
            </table>
        </div>

        <div class="footer">
            <p>Report generated by generate_governance_report.sh v${SCRIPT_VERSION}</p>
        </div>
    </div>
</body>
</html>
EOF
}

render_json() {
    local title="$1"
    local period="$2"
    local start_date="$3"
    local end_date="$4"
    local health_data="$5"
    local audit_data="$6"
    local drift_data="$7"
    local lockfile_data="$8"
    local policy_data="$9"
    local recommendations="${10}"

    # Write JSON data to temp files to avoid bash variable expansion issues
    local tmpdir
    tmpdir=$(mktemp -d)
    trap "rm -rf ${tmpdir}" EXIT

    echo "${health_data}" > "${tmpdir}/health.json"
    echo "${audit_data}" > "${tmpdir}/audit.json"
    echo "${drift_data}" > "${tmpdir}/drift.json"
    echo "${lockfile_data}" > "${tmpdir}/lockfile.json"
    echo "${policy_data}" > "${tmpdir}/policy.json"
    echo "${recommendations}" > "${tmpdir}/recommendations.json"

    jq -n \
        --arg version "${SCRIPT_VERSION}" \
        --arg title "${title}" \
        --arg period "${period}" \
        --arg start_date "${start_date}" \
        --arg end_date "${end_date}" \
        --arg generated "$(date -u +%Y-%m-%dT%H:%M:%SZ)" \
        --slurpfile health "${tmpdir}/health.json" \
        --slurpfile audit "${tmpdir}/audit.json" \
        --slurpfile drift "${tmpdir}/drift.json" \
        --slurpfile lockfile "${tmpdir}/lockfile.json" \
        --slurpfile policy "${tmpdir}/policy.json" \
        --slurpfile recommendations "${tmpdir}/recommendations.json" \
        '{
            version: $version,
            title: $title,
            period: {
                type: $period,
                start_date: $start_date,
                end_date: $end_date
            },
            generated_at: $generated,
            health: $health[0],
            audit: $audit[0],
            drift: $drift[0],
            lockfile: $lockfile[0],
            policy: $policy[0],
            recommendations: $recommendations[0]
        }'
}

# --- Main ---
main() {
    local period="weekly"
    local format="md"
    local out_file=""
    local title="Governance Status Report"
    local verbose=false

    # Parse arguments
    while [[ $# -gt 0 ]]; do
        case $1 in
            --period)
                period="$2"
                shift 2
                ;;
            --format)
                format="$2"
                shift 2
                ;;
            --out-file)
                out_file="$2"
                shift 2
                ;;
            --title)
                title="$2"
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

    # Get period dates
    local dates start_date end_date
    dates=$(get_period_dates "${period}")
    start_date=$(echo "${dates}" | cut -d'|' -f1)
    end_date=$(echo "${dates}" | cut -d'|' -f2)

    [[ "${verbose}" == "true" ]] && log_info "Generating ${period} report..."
    [[ "${verbose}" == "true" ]] && log_info "  Period: ${start_date} to ${end_date}"

    # Collect data
    [[ "${verbose}" == "true" ]] && log_info "Collecting health data..."
    local health_data
    health_data=$(collect_health_data)

    [[ "${verbose}" == "true" ]] && log_info "Collecting audit data..."
    local audit_data
    audit_data=$(collect_audit_data "${start_date}")

    [[ "${verbose}" == "true" ]] && log_info "Collecting drift data..."
    local drift_data
    drift_data=$(collect_drift_data)

    [[ "${verbose}" == "true" ]] && log_info "Collecting lockfile data..."
    local lockfile_data
    lockfile_data=$(collect_lockfile_data)

    [[ "${verbose}" == "true" ]] && log_info "Collecting policy data..."
    local policy_data
    policy_data=$(collect_policy_data)

    [[ "${verbose}" == "true" ]] && log_info "Generating recommendations..."
    local recommendations
    recommendations=$(generate_recommendations "${health_data}" "${audit_data}" "${drift_data}" "${lockfile_data}" "${policy_data}")

    # Render report
    [[ "${verbose}" == "true" ]] && log_info "Rendering ${format} report..."

    local output
    case "${format}" in
        md)
            output=$(render_markdown "${title}" "${period}" "${start_date}" "${end_date}" \
                "${health_data}" "${audit_data}" "${drift_data}" "${lockfile_data}" \
                "${policy_data}" "${recommendations}")
            ;;
        html)
            output=$(render_html "${title}" "${period}" "${start_date}" "${end_date}" \
                "${health_data}" "${audit_data}" "${drift_data}" "${lockfile_data}" \
                "${policy_data}" "${recommendations}")
            ;;
        json)
            output=$(render_json "${title}" "${period}" "${start_date}" "${end_date}" \
                "${health_data}" "${audit_data}" "${drift_data}" "${lockfile_data}" \
                "${policy_data}" "${recommendations}")
            ;;
        *)
            log_error "Invalid format: ${format}"
            exit 1
            ;;
    esac

    # Write output
    if [[ -n "${out_file}" ]]; then
        mkdir -p "$(dirname "${out_file}")"
        echo "${output}" > "${out_file}"
        [[ "${verbose}" == "true" ]] && log_info "Report written to: ${out_file}"
    else
        echo "${output}"
    fi
}

main "$@"
