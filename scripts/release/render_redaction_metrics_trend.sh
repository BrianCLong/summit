#!/usr/bin/env bash
# render_redaction_metrics_trend.sh v1.0.0
# Renders redaction metrics trend pages (HTML and MD)
#
# This script produces static trend visualization from the time series,
# including rollback tracking and stability summaries.
#
# Authority: docs/ci/REDACTION_METRICS_TRENDS.md

set -euo pipefail

# --- Configuration ---
SCRIPT_VERSION="1.1.0"

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

Renders redaction metrics trend pages from time series data.

OPTIONS:
    --site-dir DIR        Site directory containing time series
                          (default: site/release-ops)
    --verbose             Enable verbose logging
    --help                Show this help message

INPUT FILE:
    redaction_metrics_timeseries.json (in site-dir)

OUTPUT FILES:
    redaction_metrics_trend.html
    redaction_metrics_trend.md

EXAMPLES:
    # Render from site directory
    $0 --site-dir site/release-ops

    # With verbose output
    $0 --site-dir site/release-ops --verbose
EOF
}

# --- Governance Changes ---

# Load governance changes data if available
load_governance_changes() {
    local site_dir="$1"
    local changes_file="${site_dir}/governance_changes.json"

    if [[ -f "${changes_file}" ]]; then
        cat "${changes_file}"
    else
        echo '{"changes":[],"change_count_7d":0,"change_count_30d":0}'
    fi
}

# Check if a specific run_id had a governance change
# Returns the short hash if change occurred, empty otherwise
get_governance_change_for_run() {
    local changes_json="$1"
    local run_id="$2"

    echo "${changes_json}" | jq -r --arg run_id "${run_id}" '
        .changes[] | select(.run_id == ($run_id | tonumber)) | .to_hash_short // empty
    ' 2>/dev/null || echo ""
}

# Build a lookup map of run_id -> change info
build_governance_change_map() {
    local changes_json="$1"

    echo "${changes_json}" | jq '
        reduce .changes[] as $c ({}; .[$c.run_id | tostring] = $c.to_hash_short)
    ' 2>/dev/null || echo "{}"
}

# --- Stability Summary ---

compute_stability_summary() {
    local timeseries_file="$1"

    jq '
        def count_rollbacks(n):
            [.series[:n][] | select(.deployment_status == "ROLLED_BACK")] | length;
        def count_fails(n):
            [.series[:n][] | select(.health_level == "FAIL")] | length;
        def avg_tokens(n):
            if (.series | length) == 0 then 0
            else ([.series[:n][].tokens_redacted] | add) / ([.series[:n][].tokens_redacted] | length)
            end;
        def max_issues(n):
            if (.series | length) == 0 then 0
            else [.series[:n][].issue_links_redacted] | max
            end;

        {
            total_entries: (.series | length),
            rollbacks_last_7: count_rollbacks(7),
            rollbacks_last_30: count_rollbacks(30),
            fails_last_7: count_fails(7),
            fails_last_30: count_fails(30),
            avg_tokens_last_7: (avg_tokens(7) | floor),
            max_issues_last_30: max_issues(30),
            latest_status: (if (.series | length) > 0 then .series[0].deployment_status else "UNKNOWN" end),
            latest_health: (if (.series | length) > 0 then .series[0].health_level else "UNKNOWN" end)
        }
    ' "${timeseries_file}"
}

# --- ASCII Sparkline ---

generate_sparkline() {
    local values="$1"
    local chars="▁▂▃▄▅▆▇█"

    if [[ -z "${values}" || "${values}" == "[]" ]]; then
        echo ""
        return
    fi

    # Parse JSON array and generate sparkline
    echo "${values}" | jq -r '
        if length == 0 then ""
        else
            (max // 1) as $max |
            map(
                if $max == 0 then 0
                else (. / $max * 7) | floor | if . > 7 then 7 else . end
                end
            ) |
            map(["▁","▂","▃","▄","▅","▆","▇","█"][.]) |
            join("")
        end
    '
}

# --- Markdown Renderer ---

render_markdown() {
    local timeseries_file="$1"
    local output_file="$2"
    local verbose="$3"
    local site_dir="$4"

    local summary
    summary=$(compute_stability_summary "${timeseries_file}")

    # Load governance changes from file
    local gov_changes
    gov_changes=$(load_governance_changes "${site_dir}")

    # Extract governance change counts
    local gov_changes_7d gov_changes_30d current_gov_hash
    gov_changes_7d=$(echo "${gov_changes}" | jq -r '.change_count_7d // 0')
    gov_changes_30d=$(echo "${gov_changes}" | jq -r '.change_count_30d // 0')
    current_gov_hash=$(echo "${gov_changes}" | jq -r '.current_hash_short // "N/A"')

    # Build change map for row annotations
    local gov_change_map
    gov_change_map=$(build_governance_change_map "${gov_changes}")

    local total_entries rollbacks_7 rollbacks_30 fails_7 fails_30
    local avg_tokens max_issues latest_status latest_health

    total_entries=$(echo "${summary}" | jq -r '.total_entries')
    rollbacks_7=$(echo "${summary}" | jq -r '.rollbacks_last_7')
    rollbacks_30=$(echo "${summary}" | jq -r '.rollbacks_last_30')
    fails_7=$(echo "${summary}" | jq -r '.fails_last_7')
    fails_30=$(echo "${summary}" | jq -r '.fails_last_30')
    avg_tokens=$(echo "${summary}" | jq -r '.avg_tokens_last_7')
    max_issues=$(echo "${summary}" | jq -r '.max_issues_last_30')
    latest_status=$(echo "${summary}" | jq -r '.latest_status')
    latest_health=$(echo "${summary}" | jq -r '.latest_health')

    # Get token sparkline data
    local token_values
    token_values=$(jq '[.series[].tokens_redacted] | reverse' "${timeseries_file}")
    local token_sparkline
    token_sparkline=$(generate_sparkline "${token_values}")

    # Status emoji
    local status_emoji="✅"
    case "${latest_status}" in
        ROLLED_BACK) status_emoji="🔄" ;;
        WARN) status_emoji="⚠️" ;;
        FAIL) status_emoji="❌" ;;
    esac

    local health_emoji="✅"
    case "${latest_health}" in
        WARN) health_emoji="⚠️" ;;
        FAIL) health_emoji="❌" ;;
        UNKNOWN) health_emoji="❓" ;;
    esac

    cat > "${output_file}" <<EOF
# Redaction Metrics Trend

**Generated:** $(date -u +"%Y-%m-%d %H:%M UTC")
**Entries:** ${total_entries}

---

## Stability Summary

| Metric | Last 7 | Last 30 |
|--------|--------|---------|
| Rollbacks | ${rollbacks_7} | ${rollbacks_30} |
| FAIL Health | ${fails_7} | ${fails_30} |
| Gov Changes | ${gov_changes_7d} | ${gov_changes_30d} |

| Metric | Value |
|--------|-------|
| Current Status | ${status_emoji} ${latest_status} |
| Current Health | ${health_emoji} ${latest_health} |
| Avg Tokens (7d) | ${avg_tokens} |
| Max Issues (30d) | ${max_issues} |
| Current Gov Hash | \`${current_gov_hash}\` |

**Tokens Trend:** \`${token_sparkline}\`

---

## Recent Runs

| Date | Run ID | Health | Status | Tokens | Issues | Forbidden | Gov |
|------|--------|--------|--------|--------|--------|-----------|-----|
EOF

    # Add table rows for each entry (newest first, limit to 20)
    # Include governance change marker if run_id is in change map
    jq -r --argjson gov_map "${gov_change_map}" '
        .series[:20][] |
        (.run_id | tostring) as $rid |
        ($gov_map[$rid] // "") as $gov_change |
        (if $gov_change != "" then "🔄" else "-" end) as $gov_marker |
        "| \(.date_utc) | \(.run_id // "-") | \(.health_level) | \(.deployment_status) | \(.tokens_redacted) | \(.issue_links_redacted) | \(.forbidden_hits) | \($gov_marker) |"
    ' "${timeseries_file}" >> "${output_file}"

    cat >> "${output_file}" <<EOF

---

## Rollback History

EOF

    # List rollbacks
    local rollback_count
    rollback_count=$(jq '[.series[] | select(.deployment_status == "ROLLED_BACK")] | length' "${timeseries_file}")

    if [[ "${rollback_count}" -eq 0 ]]; then
        echo "No rollbacks recorded." >> "${output_file}"
    else
        echo "| Date | Run ID | Reason |" >> "${output_file}"
        echo "|------|--------|--------|" >> "${output_file}"
        jq -r '
            [.series[] | select(.deployment_status == "ROLLED_BACK")][:10][] |
            "| \(.date_utc) | \(.run_id // "-") | \(.rollback_reason) |"
        ' "${timeseries_file}" >> "${output_file}"
    fi

    cat >> "${output_file}" <<EOF

---

## Legend

- **Health Level**: OK (safe), WARN (elevated counts), FAIL (forbidden patterns detected)
- **Deployment Status**: OK (deployed current), WARN (deployed with warnings), ROLLED_BACK (restored from snapshot)
- **Rollback Reason**: \`redaction_fail\`, \`site_safety_fail\`, \`none\`
- **Gov Column**: 🔄 indicates governance configuration changed at this run

---

**Links:** [Current Health](redaction_health.json) | [Time Series](redaction_metrics_timeseries.json) | [Governance Changes](governance_changes.json) | [Dashboard](index.html)
EOF

    [[ "${verbose}" == "true" ]] && log_info "Generated markdown: ${output_file}"
}

# --- HTML Renderer ---

render_html() {
    local timeseries_file="$1"
    local output_file="$2"
    local verbose="$3"
    local site_dir="$4"

    local summary
    summary=$(compute_stability_summary "${timeseries_file}")

    # Load governance changes from file
    local gov_changes
    gov_changes=$(load_governance_changes "${site_dir}")

    # Extract governance change counts
    local gov_changes_7d gov_changes_30d current_gov_hash total_gov_changes
    gov_changes_7d=$(echo "${gov_changes}" | jq -r '.change_count_7d // 0')
    gov_changes_30d=$(echo "${gov_changes}" | jq -r '.change_count_30d // 0')
    current_gov_hash=$(echo "${gov_changes}" | jq -r '.current_hash_short // "N/A"')
    total_gov_changes=$(echo "${gov_changes}" | jq -r '.total_changes // 0')

    # Build change map for row annotations
    local gov_change_map
    gov_change_map=$(build_governance_change_map "${gov_changes}")

    local total_entries rollbacks_7 rollbacks_30 fails_7 fails_30
    local avg_tokens max_issues latest_status latest_health

    total_entries=$(echo "${summary}" | jq -r '.total_entries')
    rollbacks_7=$(echo "${summary}" | jq -r '.rollbacks_last_7')
    rollbacks_30=$(echo "${summary}" | jq -r '.rollbacks_last_30')
    fails_7=$(echo "${summary}" | jq -r '.fails_last_7')
    fails_30=$(echo "${summary}" | jq -r '.fails_last_30')
    avg_tokens=$(echo "${summary}" | jq -r '.avg_tokens_last_7')
    max_issues=$(echo "${summary}" | jq -r '.max_issues_last_30')
    latest_status=$(echo "${summary}" | jq -r '.latest_status')
    latest_health=$(echo "${summary}" | jq -r '.latest_health')

    # Status classes and emojis
    local status_class="status-ok"
    local status_emoji="✅"
    case "${latest_status}" in
        ROLLED_BACK) status_class="status-rollback"; status_emoji="🔄" ;;
        WARN) status_class="status-warn"; status_emoji="⚠️" ;;
        FAIL) status_class="status-fail"; status_emoji="❌" ;;
    esac

    local health_class="health-ok"
    local health_emoji="✅"
    case "${latest_health}" in
        WARN) health_class="health-warn"; health_emoji="⚠️" ;;
        FAIL) health_class="health-fail"; health_emoji="❌" ;;
        UNKNOWN) health_class="health-unknown"; health_emoji="❓" ;;
    esac

    cat > "${output_file}" <<'HTMLEOF'
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Redaction Metrics Trend</title>
  <style>
    *, *::before, *::after { box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      line-height: 1.6;
      color: #24292f;
      background: #f6f8fa;
      margin: 0;
      padding: 20px;
    }
    .container {
      max-width: 900px;
      margin: 0 auto;
      background: #fff;
      border-radius: 8px;
      box-shadow: 0 1px 3px rgba(0,0,0,0.1);
      padding: 24px 32px;
    }
    h1 { margin: 0 0 8px 0; font-size: 1.75em; }
    h2 { font-size: 1.1em; margin: 24px 0 12px; color: #57606a; border-bottom: 1px solid #d0d7de; padding-bottom: 8px; }
    .meta {
      color: #57606a;
      font-size: 0.875em;
      margin-bottom: 24px;
    }
    .summary-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
      gap: 12px;
      margin-bottom: 24px;
    }
    .summary-card {
      background: #f6f8fa;
      border: 1px solid #d0d7de;
      border-radius: 8px;
      padding: 16px;
      text-align: center;
    }
    .summary-value {
      font-size: 2em;
      font-weight: 600;
      color: #24292f;
    }
    .summary-label {
      font-size: 0.75em;
      color: #57606a;
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }
    .status-badge {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      padding: 4px 12px;
      border-radius: 20px;
      font-weight: 600;
      font-size: 0.875em;
    }
    .status-ok { background: #dafbe1; color: #1a7f37; }
    .status-warn { background: #fff8c5; color: #9a6700; }
    .status-fail { background: #ffebe9; color: #cf222e; }
    .status-rollback { background: #ddf4ff; color: #0969da; }
    .health-ok { background: #dafbe1; color: #1a7f37; }
    .health-warn { background: #fff8c5; color: #9a6700; }
    .health-fail { background: #ffebe9; color: #cf222e; }
    .health-unknown { background: #f6f8fa; color: #57606a; }
    table {
      width: 100%;
      border-collapse: collapse;
      font-size: 0.875em;
    }
    th, td {
      padding: 8px 12px;
      text-align: left;
      border-bottom: 1px solid #d0d7de;
    }
    th {
      background: #f6f8fa;
      font-weight: 600;
      color: #57606a;
    }
    tr:hover { background: #f6f8fa; }
    .cell-ok { color: #1a7f37; }
    .cell-warn { color: #9a6700; }
    .cell-fail { color: #cf222e; }
    .cell-rollback { color: #0969da; }
    .number { font-family: monospace; }
    .footer {
      margin-top: 24px;
      padding-top: 16px;
      border-top: 1px solid #d0d7de;
      font-size: 0.75em;
      color: #57606a;
      text-align: center;
    }
    .footer a { color: #0969da; text-decoration: none; }
    .footer a:hover { text-decoration: underline; }
    .sparkline {
      font-family: monospace;
      letter-spacing: -1px;
      color: #0969da;
    }
    .gov-badge {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      padding: 2px 8px;
      border-radius: 12px;
      font-size: 0.75em;
      font-weight: 600;
      background: #ddf4ff;
      color: #0969da;
    }
    .gov-change-marker {
      color: #0969da;
      font-size: 0.9em;
    }
    .gov-hash {
      font-family: monospace;
      font-size: 0.8em;
      background: #f6f8fa;
      padding: 2px 6px;
      border-radius: 4px;
    }
    @media (prefers-color-scheme: dark) {
      body { background: #0d1117; color: #e6edf3; }
      .container { background: #161b22; }
      .summary-card { background: #21262d; border-color: #30363d; }
      .summary-value { color: #e6edf3; }
      th { background: #21262d; color: #8b949e; }
      th, td { border-color: #30363d; }
      tr:hover { background: #21262d; }
      .meta, .summary-label, .footer { color: #8b949e; }
      h2 { color: #8b949e; border-color: #30363d; }
      .status-ok, .health-ok { background: #238636; color: #fff; }
      .status-warn, .health-warn { background: #9e6a03; color: #fff; }
      .status-fail, .health-fail { background: #da3633; color: #fff; }
      .status-rollback { background: #1f6feb; color: #fff; }
      .gov-badge { background: #1f6feb; color: #fff; }
      .gov-hash { background: #30363d; color: #8b949e; }
      .gov-change-marker { color: #58a6ff; }
    }
  </style>
</head>
<body>
  <div class="container">
    <h1>Redaction Metrics Trend</h1>
HTMLEOF

    echo "    <div class=\"meta\">Generated: $(date -u +"%Y-%m-%d %H:%M UTC") | Entries: ${total_entries}</div>" >> "${output_file}"

    # Summary cards
    cat >> "${output_file}" <<HTMLEOF
    <div class="summary-grid">
      <div class="summary-card">
        <div class="summary-value"><span class="${status_class}" style="font-size:0.8em;">${status_emoji} ${latest_status}</span></div>
        <div class="summary-label">Current Status</div>
      </div>
      <div class="summary-card">
        <div class="summary-value"><span class="${health_class}" style="font-size:0.8em;">${health_emoji} ${latest_health}</span></div>
        <div class="summary-label">Health Level</div>
      </div>
      <div class="summary-card">
        <div class="summary-value">${rollbacks_7}</div>
        <div class="summary-label">Rollbacks (7d)</div>
      </div>
      <div class="summary-card">
        <div class="summary-value">${rollbacks_30}</div>
        <div class="summary-label">Rollbacks (30d)</div>
      </div>
      <div class="summary-card">
        <div class="summary-value">${avg_tokens}</div>
        <div class="summary-label">Avg Tokens (7d)</div>
      </div>
      <div class="summary-card">
        <div class="summary-value">${max_issues}</div>
        <div class="summary-label">Max Issues (30d)</div>
      </div>
      <div class="summary-card">
        <div class="summary-value">${gov_changes_30d}</div>
        <div class="summary-label">Gov Changes (30d)</div>
      </div>
      <div class="summary-card">
        <div class="summary-value"><span class="gov-hash" title="Current governance hash">${current_gov_hash}</span></div>
        <div class="summary-label">Gov Hash</div>
      </div>
    </div>

    <h2>Recent Runs</h2>
    <table>
      <thead>
        <tr>
          <th>Date</th>
          <th>Run ID</th>
          <th>Health</th>
          <th>Status</th>
          <th>Tokens</th>
          <th>Issues</th>
          <th>Forbidden</th>
          <th>Gov</th>
        </tr>
      </thead>
      <tbody>
HTMLEOF

    # Add table rows with governance change markers
    jq -r --argjson gov_map "${gov_change_map}" '
        .series[:20][] |
        (if .health_level == "OK" then "cell-ok"
         elif .health_level == "WARN" then "cell-warn"
         elif .health_level == "FAIL" then "cell-fail"
         else "" end) as $hclass |
        (if .deployment_status == "OK" then "cell-ok"
         elif .deployment_status == "WARN" then "cell-warn"
         elif .deployment_status == "ROLLED_BACK" then "cell-rollback"
         elif .deployment_status == "FAIL" then "cell-fail"
         else "" end) as $sclass |
        (.run_id | tostring) as $rid |
        ($gov_map[$rid] // "") as $gov_change |
        (if $gov_change != "" then "<span class=\"gov-change-marker\" title=\"Changed to: \($gov_change)\">🔄</span>" else "-" end) as $gov_marker |
        "<tr><td>\(.date_utc)</td><td class=\"number\">\(.run_id // "-")</td><td class=\"\($hclass)\">\(.health_level)</td><td class=\"\($sclass)\">\(.deployment_status)</td><td class=\"number\">\(.tokens_redacted)</td><td class=\"number\">\(.issue_links_redacted)</td><td class=\"number\">\(.forbidden_hits)</td><td>\($gov_marker)</td></tr>"
    ' "${timeseries_file}" >> "${output_file}"

    cat >> "${output_file}" <<'HTMLEOF'
      </tbody>
    </table>

    <h2>Rollback History</h2>
HTMLEOF

    local rollback_count
    rollback_count=$(jq '[.series[] | select(.deployment_status == "ROLLED_BACK")] | length' "${timeseries_file}")

    if [[ "${rollback_count}" -eq 0 ]]; then
        echo "    <p>No rollbacks recorded.</p>" >> "${output_file}"
    else
        cat >> "${output_file}" <<'HTMLEOF'
    <table>
      <thead>
        <tr>
          <th>Date</th>
          <th>Run ID</th>
          <th>Reason</th>
        </tr>
      </thead>
      <tbody>
HTMLEOF
        jq -r '
            [.series[] | select(.deployment_status == "ROLLED_BACK")][:10][] |
            "<tr><td>\(.date_utc)</td><td class=\"number\">\(.run_id // "-")</td><td>\(.rollback_reason)</td></tr>"
        ' "${timeseries_file}" >> "${output_file}"
        echo "      </tbody>" >> "${output_file}"
        echo "    </table>" >> "${output_file}"
    fi

    cat >> "${output_file}" <<'HTMLEOF'

    <div class="footer">
      <a href="redaction_health.json">Current Health</a> |
      <a href="redaction_metrics_timeseries.json">Time Series Data</a> |
      <a href="governance_changes.json">Governance Changes</a> |
      <a href="redaction_metrics_trend.md">Markdown Version</a> |
      <a href="index.html">Dashboard</a>
    </div>
  </div>
</body>
</html>
HTMLEOF

    [[ "${verbose}" == "true" ]] && log_info "Generated HTML: ${output_file}"
}

# --- Main ---
main() {
    local site_dir="site/release-ops"
    local verbose=false

    # Parse arguments
    while [[ $# -gt 0 ]]; do
        case $1 in
            --site-dir)
                site_dir="$2"
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

    # Check for jq
    if ! command -v jq &>/dev/null; then
        log_error "jq is required but not found"
        exit 1
    fi

    local timeseries_file="${site_dir}/redaction_metrics_timeseries.json"

    # Check input file
    if [[ ! -f "${timeseries_file}" ]]; then
        log_error "Time series file not found: ${timeseries_file}"
        log_error "Run update_redaction_metrics_timeseries.sh first"
        exit 1
    fi

    log_info "Rendering redaction metrics trend..."
    log_info "  Site dir: ${site_dir}"

    # Check governance changes count for logging
    local gov_changes_file="${site_dir}/governance_changes.json"
    local gov_changes_count=0
    if [[ -f "${gov_changes_file}" ]]; then
        gov_changes_count=$(jq -r '.change_count_30d // 0' "${gov_changes_file}" 2>/dev/null || echo "0")
    fi
    [[ "${verbose}" == "true" ]] && log_info "  Governance changes (30d): ${gov_changes_count}"

    # Render outputs (pass site_dir so renderers can load governance data directly)
    render_markdown "${timeseries_file}" "${site_dir}/redaction_metrics_trend.md" "${verbose}" "${site_dir}"
    render_html "${timeseries_file}" "${site_dir}/redaction_metrics_trend.html" "${verbose}" "${site_dir}"

    # Summary
    log_info "=== Trend Rendered ==="
    log_info "  HTML: ${site_dir}/redaction_metrics_trend.html"
    log_info "  MD: ${site_dir}/redaction_metrics_trend.md"
}

main "$@"
