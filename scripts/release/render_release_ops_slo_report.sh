#!/usr/bin/env bash
# render_release_ops_slo_report.sh v1.1.0
# Renders SLO report pages (HTML and MD) from computed metrics
#
# This script produces static SLO visualization from the JSON,
# including KPI tables, target comparisons, and recent incidents.
#
# Authority: docs/ci/RELEASE_OPS_SLO.md

set -euo pipefail

# --- Configuration ---
SCRIPT_VERSION="1.2.0"

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

Renders SLO report pages from computed metrics JSON.

OPTIONS:
    --slo-json FILE       SLO JSON file (required)
    --out-dir DIR         Output directory (default: site/release-ops)
    --verbose             Enable verbose logging
    --help                Show this help message

OUTPUT FILES:
    release_ops_slo.html
    release_ops_slo.md

EXAMPLES:
    # Render from SLO JSON
    $0 --slo-json site/release-ops/release_ops_slo.json

    # With custom output directory
    $0 --slo-json slo.json --out-dir public/
EOF
}

# --- Governance Helpers ---

# Load governance changes data if available
load_governance_changes() {
    local out_dir="$1"
    local changes_file="${out_dir}/governance_changes.json"

    if [[ -f "${changes_file}" ]]; then
        cat "${changes_file}"
    else
        echo '{"changes":[],"change_count_7d":0,"change_count_30d":0,"current_hash_short":"N/A"}'
    fi
}

# --- Status Helpers ---

get_status_emoji() {
    case "$1" in
        MEETING) echo "✅" ;;
        AT_RISK) echo "⚠️" ;;
        FAILING) echo "❌" ;;
        INSUFFICIENT_DATA) echo "📊" ;;
        *) echo "❓" ;;
    esac
}

get_status_class() {
    case "$1" in
        MEETING) echo "status-meeting" ;;
        AT_RISK) echo "status-at-risk" ;;
        FAILING) echo "status-failing" ;;
        INSUFFICIENT_DATA) echo "status-insufficient" ;;
        *) echo "status-unknown" ;;
    esac
}

# --- Markdown Renderer ---

render_markdown() {
    local slo_json="$1"
    local output_file="$2"
    local out_dir="$3"

    local generated_at weekly_status monthly_status current_streak governance_hash
    generated_at=$(echo "${slo_json}" | jq -r '.generated_at')
    weekly_status=$(echo "${slo_json}" | jq -r '.weekly.status')
    monthly_status=$(echo "${slo_json}" | jq -r '.monthly.status')
    current_streak=$(echo "${slo_json}" | jq -r '.current_streak')
    governance_hash=$(echo "${slo_json}" | jq -r '.governance_hash // empty')
    local flake_active flake_expiring flake_encountered
    flake_active=$(echo "${slo_json}" | jq -r '.flake_debt.active_total // empty')
    flake_expiring=$(echo "${slo_json}" | jq -r '.flake_debt.expiring_soon_total // empty')
    flake_encountered=$(echo "${slo_json}" | jq -r '.flake_debt.encountered_last_window_total // empty')
    local flake_active flake_expiring flake_encountered
    flake_active=$(echo "${slo_json}" | jq -r '.flake_debt.active_total // empty')
    flake_expiring=$(echo "${slo_json}" | jq -r '.flake_debt.expiring_soon_total // empty')
    flake_encountered=$(echo "${slo_json}" | jq -r '.flake_debt.encountered_last_window_total // empty')

    # Load governance changes from file
    local gov_changes
    gov_changes=$(load_governance_changes "${out_dir}")

    # Extract governance change metrics
    local gov_changes_7d gov_changes_30d gov_hash_short
    gov_changes_7d=$(echo "${gov_changes}" | jq -r '.change_count_7d // 0')
    gov_changes_30d=$(echo "${gov_changes}" | jq -r '.change_count_30d // 0')
    gov_hash_short=$(echo "${gov_changes}" | jq -r '.current_hash_short // "N/A"')

    local weekly_emoji monthly_emoji
    weekly_emoji=$(get_status_emoji "${weekly_status}")
    monthly_emoji=$(get_status_emoji "${monthly_status}")

    local gov_line=""
    if [[ -n "${governance_hash}" ]]; then
        gov_line="**Governance:** \`${governance_hash:0:12}...\`"
    elif [[ "${gov_hash_short}" != "N/A" ]]; then
        gov_line="**Governance:** \`${gov_hash_short}\`"
    fi

    cat > "${output_file}" <<EOF
# Release Ops SLO Report

**Generated:** ${generated_at}
**Current OK Streak:** ${current_streak} consecutive publishes
${gov_line}

---

## Status Summary

| Window | Status |
|--------|--------|
| Weekly (7d) | ${weekly_emoji} ${weekly_status} |
| Monthly (30d) | ${monthly_emoji} ${monthly_status} |

---

## Weekly KPIs (Last 7 Days)

EOF

    echo "${slo_json}" | jq -r '
        .weekly as $w |
        .targets as $t |
        "| Metric | Value | Target | Status |",
        "|--------|-------|--------|--------|",
        "| Total Cycles | \($w.total_cycles) | - | - |",
        "| Successful Publishes | \($w.successful_publishes) | - | - |",
        "| Success Rate | \($w.success_rate_pct)% | ≥\($t.success_rate_pct)% | \(if $w.success_rate_pct >= $t.success_rate_pct then "✅" else "❌" end) |",
        "| Rollbacks | \($w.rollbacks_count) (\($w.rollback_rate_pct)%) | ≤\($t.rollback_rate_max_pct)% | \(if $w.rollback_rate_pct <= $t.rollback_rate_max_pct then "✅" else "❌" end) |",
        "| FAILs | \($w.fail_count) (\($w.fail_rate_pct)%) | ≤\($t.fail_rate_max_pct)% | \(if $w.fail_rate_pct <= $t.fail_rate_max_pct then "✅" else "❌" end) |",
        "| WARNs | \($w.warn_count) (\($w.warn_rate_pct)%) | - | - |",
        "| Longest OK Streak | \($w.longest_ok_streak) | ≥\($t.ok_streak_target) | \(if $w.longest_ok_streak >= $t.ok_streak_target then "✅" else "⚠️" end) |",
        "| MTBR (hours) | \($w.mtbr_hours // "N/A") | ≥\($t.mtbr_target_hours)h | \(if ($w.mtbr_hours // 0) >= $t.mtbr_target_hours then "✅" elif $w.mtbr_hours == null then "-" else "❌" end) |",
        "| Avg Recovery Cycles | \($w.recovery_cycles_avg // "N/A") | - | - |"
    ' >> "${output_file}"

    cat >> "${output_file}" <<EOF

---

## Monthly KPIs (Last 30 Days)

EOF

    echo "${slo_json}" | jq -r '
        .monthly as $m |
        .targets as $t |
        "| Metric | Value | Target | Status |",
        "|--------|-------|--------|--------|",
        "| Total Cycles | \($m.total_cycles) | - | - |",
        "| Successful Publishes | \($m.successful_publishes) | - | - |",
        "| Success Rate | \($m.success_rate_pct)% | ≥\($t.success_rate_pct)% | \(if $m.success_rate_pct >= $t.success_rate_pct then "✅" else "❌" end) |",
        "| Rollbacks | \($m.rollbacks_count) (\($m.rollback_rate_pct)%) | ≤\($t.rollback_rate_max_pct)% | \(if $m.rollback_rate_pct <= $t.rollback_rate_max_pct then "✅" else "❌" end) |",
        "| FAILs | \($m.fail_count) (\($m.fail_rate_pct)%) | ≤\($t.fail_rate_max_pct)% | \(if $m.fail_rate_pct <= $t.fail_rate_max_pct then "✅" else "❌" end) |",
        "| WARNs | \($m.warn_count) (\($m.warn_rate_pct)%) | - | - |",
        "| Longest OK Streak | \($m.longest_ok_streak) | ≥\($t.ok_streak_target) | \(if $m.longest_ok_streak >= $t.ok_streak_target then "✅" else "⚠️" end) |",
        "| MTBR (hours) | \($m.mtbr_hours // "N/A") | ≥\($t.mtbr_target_hours)h | \(if ($m.mtbr_hours // 0) >= $t.mtbr_target_hours then "✅" elif $m.mtbr_hours == null then "-" else "❌" end) |",
        "| Avg Recovery Cycles | \($m.recovery_cycles_avg // "N/A") | - | - |"
    ' >> "${output_file}"

    cat >> "${output_file}" <<EOF

---

## Recent Incidents (Counts Only)

EOF

    local incident_count
    incident_count=$(echo "${slo_json}" | jq '.monthly.recent_incidents | length')

    if [[ "${incident_count}" -eq 0 ]]; then
        echo "No incidents in the reporting period." >> "${output_file}"
    else
        echo "| Date | Run ID | Type | Health | Status |" >> "${output_file}"
        echo "|------|--------|------|--------|--------|" >> "${output_file}"
        echo "${slo_json}" | jq -r '
            .monthly.recent_incidents[] |
            "| \(.date) | \(.run_id // "-") | \(.type) | \(.health_level) | \(.deployment_status) |"
        ' >> "${output_file}"
    fi

    cat >> "${output_file}" <<EOF

---

## Governance Correlation

| Metric | Value |
|--------|-------|
| Gov Changes (7d) | ${gov_changes_7d} |
| Gov Changes (30d) | ${gov_changes_30d} |
| Current Hash | \`${gov_hash_short}\` |

_Governance changes indicate policy configuration updates. Correlate with incidents for root cause analysis._

---

EOF

    if [[ -n "${flake_active}" ]]; then
        cat >> "${output_file}" <<EOF

## Flake Debt (Quarantine)

| Metric | Value |
|--------|-------|
| Active Flakes | ${flake_active} |
| Expiring in 7d | ${flake_expiring} |
| Encountered (7d) | ${flake_encountered} |

EOF

        if [[ "${flake_expiring}" != "0" ]]; then
            echo "${slo_json}" | jq -r '
              .flake_debt.expiring_soon as $e |
              "### Flakes Expiring Soon (7d)",
              "",
              "| ID | Owner | Expires | Target |",
              "|----|-------|---------|--------|",
              ($e[] | "| \(.id) | \(.owner) | \(.expires) | \(.target) |")
            ' >> "${output_file}"
        else
            echo "No flakes expiring in the next 7 days." >> "${output_file}"
        fi

        echo "${slo_json}" | jq -r '
          .flake_debt.longest_lived as $l |
          "",
          "### Longest-Lived Flakes",
          if ($l | length) == 0 then
            "None"
          else
            "| ID | Owner | Age (days) |",
            "|----|-------|------------|",
            ($l[] | "| \(.id) | \(.owner) | \(.age_days) |")
          end
        ' >> "${output_file}"

        cat >> "${output_file}" <<EOF

---

## Definitions

| Term | Definition |
|------|------------|
| **Success** | Deployed with status OK/WARN and no forbidden hits |
| **Rollback** | Deployment rolled back to previous snapshot |
| **FAIL** | Forbidden patterns detected (health_level=FAIL) |
| **WARN** | Published with elevated redaction counts |
| **MTBR** | Mean Time Between Rollbacks (hours) |
| **Recovery Cycles** | Cycles from FAIL/rollback to next OK deploy |
| **Gov Changes** | Governance configuration hash changes (counts-only) |

---

**Links:** [Trend Page](redaction_metrics_trend.html) | [Governance Changes](governance_changes.json) | [Time Series](redaction_metrics_timeseries.json) | [Dashboard](index.html)
EOF
}

# --- HTML Renderer ---

render_html() {
    local slo_json="$1"
    local output_file="$2"
    local out_dir="$3"

    local generated_at weekly_status monthly_status current_streak governance_hash
    generated_at=$(echo "${slo_json}" | jq -r '.generated_at')
    weekly_status=$(echo "${slo_json}" | jq -r '.weekly.status')
    monthly_status=$(echo "${slo_json}" | jq -r '.monthly.status')
    current_streak=$(echo "${slo_json}" | jq -r '.current_streak')
    governance_hash=$(echo "${slo_json}" | jq -r '.governance_hash // empty')

    # Load governance changes from file
    local gov_changes
    gov_changes=$(load_governance_changes "${out_dir}")

    # Extract governance change metrics
    local gov_changes_7d gov_changes_30d gov_hash_short
    gov_changes_7d=$(echo "${gov_changes}" | jq -r '.change_count_7d // 0')
    gov_changes_30d=$(echo "${gov_changes}" | jq -r '.change_count_30d // 0')
    gov_hash_short=$(echo "${gov_changes}" | jq -r '.current_hash_short // "N/A"')

    local weekly_emoji weekly_class monthly_emoji monthly_class
    weekly_emoji=$(get_status_emoji "${weekly_status}")
    weekly_class=$(get_status_class "${weekly_status}")
    monthly_emoji=$(get_status_emoji "${monthly_status}")
    monthly_class=$(get_status_class "${monthly_status}")

    cat > "${output_file}" <<'HTMLEOF'
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Release Ops SLO Report</title>
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
    .status-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 16px;
      margin-bottom: 24px;
    }
    .status-card {
      padding: 20px;
      border-radius: 8px;
      text-align: center;
    }
    .status-meeting { background: #dafbe1; border: 2px solid #1a7f37; }
    .status-at-risk { background: #fff8c5; border: 2px solid #d4a72c; }
    .status-failing { background: #ffebe9; border: 2px solid #cf222e; }
    .status-insufficient { background: #f6f8fa; border: 2px solid #d0d7de; }
    .status-label { font-size: 0.75em; text-transform: uppercase; color: #57606a; margin-bottom: 4px; }
    .status-value { font-size: 1.5em; font-weight: 600; }
    .status-meeting .status-value { color: #1a7f37; }
    .status-at-risk .status-value { color: #9a6700; }
    .status-failing .status-value { color: #cf222e; }
    .streak-badge {
      display: inline-block;
      background: #ddf4ff;
      color: #0969da;
      padding: 4px 12px;
      border-radius: 20px;
      font-size: 0.875em;
      font-weight: 600;
    }
    .gov-hash {
      font-family: monospace;
      background: #f6f8fa;
      padding: 2px 8px;
      border-radius: 4px;
      font-size: 0.8em;
      cursor: help;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      font-size: 0.875em;
      margin-bottom: 16px;
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
    .met { color: #1a7f37; }
    .not-met { color: #cf222e; }
    .number { font-family: monospace; }
    .kpi-highlight {
      background: #f6f8fa;
      padding: 16px;
      border-radius: 8px;
      margin-bottom: 16px;
    }
    .kpi-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
      gap: 12px;
    }
    .kpi-item {
      text-align: center;
    }
    .kpi-value {
      font-size: 1.5em;
      font-weight: 600;
      color: #24292f;
    }
    .kpi-label {
      font-size: 0.7em;
      text-transform: uppercase;
      color: #57606a;
    }
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
    @media (prefers-color-scheme: dark) {
      body { background: #0d1117; color: #e6edf3; }
      .container { background: #161b22; }
      th { background: #21262d; color: #8b949e; }
      th, td { border-color: #30363d; }
      tr:hover { background: #21262d; }
      h2 { color: #8b949e; border-color: #30363d; }
      .meta, .status-label, .kpi-label, .footer { color: #8b949e; }
      .kpi-highlight { background: #21262d; }
      .kpi-value { color: #e6edf3; }
      .status-meeting { background: #238636; border-color: #3fb950; }
      .status-at-risk { background: #9e6a03; border-color: #d29922; }
      .status-failing { background: #da3633; border-color: #f85149; }
      .status-meeting .status-value,
      .status-at-risk .status-value,
      .status-failing .status-value { color: #fff; }
      .streak-badge { background: #1f6feb; color: #fff; }
      .gov-hash { background: #30363d; color: #8b949e; }
    }
  </style>
</head>
<body>
  <div class="container">
    <h1>Release Ops SLO Report</h1>
HTMLEOF

    local gov_badge=""
    if [[ -n "${governance_hash}" ]]; then
        gov_badge=" | <span class=\"gov-hash\" title=\"${governance_hash}\">Gov: ${governance_hash:0:12}...</span>"
    elif [[ "${gov_hash_short}" != "N/A" ]]; then
        gov_badge=" | <span class=\"gov-hash\" title=\"Current governance hash\">Gov: ${gov_hash_short}</span>"
    fi
    echo "    <div class=\"meta\">Generated: ${generated_at} | <span class=\"streak-badge\">Current Streak: ${current_streak} OK</span>${gov_badge}</div>" >> "${output_file}"

    cat >> "${output_file}" <<HTMLEOF
    <div class="status-grid">
      <div class="status-card ${weekly_class}">
        <div class="status-label">Weekly (7d)</div>
        <div class="status-value">${weekly_emoji} ${weekly_status}</div>
      </div>
      <div class="status-card ${monthly_class}">
        <div class="status-label">Monthly (30d)</div>
        <div class="status-value">${monthly_emoji} ${monthly_status}</div>
      </div>
    </div>

    <h2>Monthly KPI Summary</h2>
    <div class="kpi-highlight">
      <div class="kpi-grid">
HTMLEOF

    # Add KPI items
    echo "${slo_json}" | jq -r '
        .monthly as $m |
        "<div class=\"kpi-item\"><div class=\"kpi-value\">\($m.success_rate_pct)%</div><div class=\"kpi-label\">Success Rate</div></div>",
        "<div class=\"kpi-item\"><div class=\"kpi-value\">\($m.rollbacks_count)</div><div class=\"kpi-label\">Rollbacks</div></div>",
        "<div class=\"kpi-item\"><div class=\"kpi-value\">\($m.fail_count)</div><div class=\"kpi-label\">FAILs</div></div>",
        "<div class=\"kpi-item\"><div class=\"kpi-value\">\($m.longest_ok_streak)</div><div class=\"kpi-label\">Best Streak</div></div>",
        "<div class=\"kpi-item\"><div class=\"kpi-value\">\($m.mtbr_hours // "N/A")</div><div class=\"kpi-label\">MTBR (hrs)</div></div>"
    ' >> "${output_file}"

    cat >> "${output_file}" <<'HTMLEOF'
      </div>
    </div>

    <h2>Weekly Details (7 Days)</h2>
    <table>
      <thead>
        <tr>
          <th>Metric</th>
          <th>Value</th>
          <th>Target</th>
          <th>Status</th>
        </tr>
      </thead>
      <tbody>
HTMLEOF

    echo "${slo_json}" | jq -r '
        .weekly as $w |
        .targets as $t |
        "<tr><td>Success Rate</td><td class=\"number\">\($w.success_rate_pct)%</td><td>≥\($t.success_rate_pct)%</td><td class=\"\(if $w.success_rate_pct >= $t.success_rate_pct then "met" else "not-met" end)\">●</td></tr>",
        "<tr><td>Rollback Rate</td><td class=\"number\">\($w.rollback_rate_pct)%</td><td>≤\($t.rollback_rate_max_pct)%</td><td class=\"\(if $w.rollback_rate_pct <= $t.rollback_rate_max_pct then "met" else "not-met" end)\">●</td></tr>",
        "<tr><td>FAIL Rate</td><td class=\"number\">\($w.fail_rate_pct)%</td><td>≤\($t.fail_rate_max_pct)%</td><td class=\"\(if $w.fail_rate_pct <= $t.fail_rate_max_pct then "met" else "not-met" end)\">●</td></tr>",
        "<tr><td>MTBR</td><td class=\"number\">\($w.mtbr_hours // "N/A") hrs</td><td>≥\($t.mtbr_target_hours) hrs</td><td class=\"\(if ($w.mtbr_hours // 0) >= $t.mtbr_target_hours then "met" elif $w.mtbr_hours == null then "" else "not-met" end)\">●</td></tr>",
        "<tr><td>Longest Streak</td><td class=\"number\">\($w.longest_ok_streak)</td><td>≥\($t.ok_streak_target)</td><td class=\"\(if $w.longest_ok_streak >= $t.ok_streak_target then "met" else "not-met" end)\">●</td></tr>"
    ' >> "${output_file}"

    cat >> "${output_file}" <<'HTMLEOF'
      </tbody>
    </table>

    <h2>Monthly Details (30 Days)</h2>
    <table>
      <thead>
        <tr>
          <th>Metric</th>
          <th>Value</th>
          <th>Target</th>
          <th>Status</th>
        </tr>
      </thead>
      <tbody>
HTMLEOF

    echo "${slo_json}" | jq -r '
        .monthly as $m |
        .targets as $t |
        "<tr><td>Total Cycles</td><td class=\"number\">\($m.total_cycles)</td><td>-</td><td>-</td></tr>",
        "<tr><td>Successful Publishes</td><td class=\"number\">\($m.successful_publishes)</td><td>-</td><td>-</td></tr>",
        "<tr><td>Success Rate</td><td class=\"number\">\($m.success_rate_pct)%</td><td>≥\($t.success_rate_pct)%</td><td class=\"\(if $m.success_rate_pct >= $t.success_rate_pct then "met" else "not-met" end)\">●</td></tr>",
        "<tr><td>Rollback Rate</td><td class=\"number\">\($m.rollback_rate_pct)%</td><td>≤\($t.rollback_rate_max_pct)%</td><td class=\"\(if $m.rollback_rate_pct <= $t.rollback_rate_max_pct then "met" else "not-met" end)\">●</td></tr>",
        "<tr><td>FAIL Rate</td><td class=\"number\">\($m.fail_rate_pct)%</td><td>≤\($t.fail_rate_max_pct)%</td><td class=\"\(if $m.fail_rate_pct <= $t.fail_rate_max_pct then "met" else "not-met" end)\">●</td></tr>",
        "<tr><td>WARN Rate</td><td class=\"number\">\($m.warn_rate_pct)%</td><td>-</td><td>-</td></tr>",
        "<tr><td>MTBR</td><td class=\"number\">\($m.mtbr_hours // "N/A") hrs</td><td>≥\($t.mtbr_target_hours) hrs</td><td class=\"\(if ($m.mtbr_hours // 0) >= $t.mtbr_target_hours then "met" elif $m.mtbr_hours == null then "" else "not-met" end)\">●</td></tr>",
        "<tr><td>Longest Streak</td><td class=\"number\">\($m.longest_ok_streak)</td><td>≥\($t.ok_streak_target)</td><td class=\"\(if $m.longest_ok_streak >= $t.ok_streak_target then "met" else "not-met" end)\">●</td></tr>",
        "<tr><td>Avg Recovery Cycles</td><td class=\"number\">\($m.recovery_cycles_avg // "N/A")</td><td>-</td><td>-</td></tr>"
    ' >> "${output_file}"

    cat >> "${output_file}" <<'HTMLEOF'
      </tbody>
    </table>

    <h2>Recent Incidents</h2>
HTMLEOF

    local incident_count
    incident_count=$(echo "${slo_json}" | jq '.monthly.recent_incidents | length')

    if [[ "${incident_count}" -eq 0 ]]; then
        echo "    <p>No incidents in the reporting period.</p>" >> "${output_file}"
    else
        cat >> "${output_file}" <<'HTMLEOF'
    <table>
      <thead>
        <tr>
          <th>Date</th>
          <th>Run ID</th>
          <th>Type</th>
          <th>Health</th>
          <th>Status</th>
        </tr>
      </thead>
      <tbody>
HTMLEOF
        echo "${slo_json}" | jq -r '
            .monthly.recent_incidents[] |
            "<tr><td>\(.date)</td><td class=\"number\">\(.run_id // "-")</td><td>\(.type)</td><td>\(.health_level)</td><td>\(.deployment_status)</td></tr>"
        ' >> "${output_file}"
        echo "      </tbody>" >> "${output_file}"
        echo "    </table>" >> "${output_file}"
    fi

    cat >> "${output_file}" <<HTMLEOF

    <h2>Governance Correlation</h2>
    <div class="kpi-highlight">
      <div class="kpi-grid">
        <div class="kpi-item">
          <div class="kpi-value">${gov_changes_7d}</div>
          <div class="kpi-label">Gov Changes (7d)</div>
        </div>
        <div class="kpi-item">
          <div class="kpi-value">${gov_changes_30d}</div>
          <div class="kpi-label">Gov Changes (30d)</div>
        </div>
        <div class="kpi-item">
          <div class="kpi-value"><span class="gov-hash">${gov_hash_short}</span></div>
          <div class="kpi-label">Current Hash</div>
        </div>
      </div>
    </div>
    <p style="font-size: 0.8em; color: #57606a; margin-top: 8px;">
      <em>Governance changes indicate policy configuration updates. Correlate with incidents for root cause analysis.</em>
    </p>

HTMLEOF

    if [[ -n "${flake_active}" ]]; then
        cat >> "${output_file}" <<HTMLEOF

    <h2>Flake Debt (Quarantine)</h2>
    <div class="kpi-highlight">
      <div class="kpi-grid">
        <div class="kpi-item">
          <div class="kpi-value">${flake_active}</div>
          <div class="kpi-label">Active Flakes</div>
        </div>
        <div class="kpi-item">
          <div class="kpi-value">${flake_expiring}</div>
          <div class="kpi-label">Expiring in 7d</div>
        </div>
        <div class="kpi-item">
          <div class="kpi-value">${flake_encountered}</div>
          <div class="kpi-label">Encountered (7d)</div>
        </div>
      </div>
    </div>
HTMLEOF

        if [[ "${flake_expiring}" != "0" ]]; then
            cat >> "${output_file}" <<'HTMLEOF'
    <table>
      <thead>
        <tr>
          <th>ID</th>
          <th>Owner</th>
          <th>Expires</th>
          <th>Target</th>
        </tr>
      </thead>
      <tbody>
HTMLEOF
            echo "${slo_json}" | jq -r '
              .flake_debt.expiring_soon[] |
              "<tr><td>\(.id)</td><td>\(.owner)</td><td>\(.expires)</td><td>\(.target)</td></tr>"
            ' >> "${output_file}"
            cat >> "${output_file}" <<'HTMLEOF'
      </tbody>
    </table>
HTMLEOF
        else
            echo "    <p>No flakes expiring in the next 7 days.</p>" >> "${output_file}"
        fi

        cat >> "${output_file}" <<'HTMLEOF'
    <h3>Longest-Lived Flakes</h3>
HTMLEOF
        local longest_count
        longest_count=$(echo "${slo_json}" | jq '.flake_debt.longest_lived | length')
        if [[ "${longest_count}" -eq 0 ]]; then
            echo "    <p>No active flakes.</p>" >> "${output_file}"
        else
            cat >> "${output_file}" <<'HTMLEOF'
    <table>
      <thead>
        <tr>
          <th>ID</th>
          <th>Owner</th>
          <th>Age (days)</th>
        </tr>
      </thead>
      <tbody>
HTMLEOF
            echo "${slo_json}" | jq -r '
              .flake_debt.longest_lived[] |
              "<tr><td>\(.id)</td><td>\(.owner)</td><td>\(.age_days)</td></tr>"
            ' >> "${output_file}"
            cat >> "${output_file}" <<'HTMLEOF'
      </tbody>
    </table>
HTMLEOF
        fi
    fi

    cat >> "${output_file}" <<'HTMLEOF'

    <div class="footer">
      <a href="redaction_metrics_trend.html">Trend Page</a> |
      <a href="governance_changes.json">Governance Changes</a> |
      <a href="redaction_metrics_timeseries.json">Time Series</a> |
      <a href="release_ops_slo.json">SLO Data</a> |
      <a href="index.html">Dashboard</a>
    </div>
  </div>
</body>
</html>
HTMLEOF
}

# --- Main ---
main() {
    local slo_json_file=""
    local out_dir="site/release-ops"
    local verbose=false

    # Parse arguments
    while [[ $# -gt 0 ]]; do
        case $1 in
            --slo-json)
                slo_json_file="$2"
                shift 2
                ;;
            --out-dir)
                out_dir="$2"
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
    if [[ -z "${slo_json_file}" ]]; then
        log_error "Missing required --slo-json"
        print_usage
        exit 1
    fi

    if [[ ! -f "${slo_json_file}" ]]; then
        log_error "SLO JSON file not found: ${slo_json_file}"
        exit 1
    fi

    # Check for jq
    if ! command -v jq &>/dev/null; then
        log_error "jq is required but not found"
        exit 1
    fi

    # Ensure output directory exists
    mkdir -p "${out_dir}"

    [[ "${verbose}" == "true" ]] && log_info "Rendering SLO report..."
    [[ "${verbose}" == "true" ]] && log_info "  SLO JSON: ${slo_json_file}"
    [[ "${verbose}" == "true" ]] && log_info "  Output dir: ${out_dir}"

    # Read SLO JSON
    local slo_json
    slo_json=$(cat "${slo_json_file}")

    # Check governance changes count for logging
    local gov_changes_file="${out_dir}/governance_changes.json"
    local gov_changes_count=0
    if [[ -f "${gov_changes_file}" ]]; then
        gov_changes_count=$(jq -r '.change_count_30d // 0' "${gov_changes_file}" 2>/dev/null || echo "0")
    fi
    [[ "${verbose}" == "true" ]] && log_info "  Governance changes (30d): ${gov_changes_count}"

    # Render outputs (pass out_dir so renderers can load governance data directly)
    render_markdown "${slo_json}" "${out_dir}/release_ops_slo.md" "${out_dir}"
    render_html "${slo_json}" "${out_dir}/release_ops_slo.html" "${out_dir}"

    # Summary
    log_info "=== SLO Report Rendered ==="
    log_info "  HTML: ${out_dir}/release_ops_slo.html"
    log_info "  MD: ${out_dir}/release_ops_slo.md"
}

main "$@"
