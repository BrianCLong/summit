#!/usr/bin/env bash
# build_release_ops_site.sh v1.3.0
# Builds the Release Ops Pages site from orchestrator artifacts
#
# Produces a sanitized subset of artifacts safe for public GitHub Pages hosting.
# Uses an explicit allowlist and policy-driven redaction to ensure no sensitive
# data is published.
#
# Authority: docs/ci/RELEASE_OPS_PAGES.md
# Redaction: docs/ci/RELEASE_OPS_REDACTION.md

set -euo pipefail

# --- Configuration ---
SCRIPT_VERSION="1.3.0"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(git rev-parse --show-toplevel 2>/dev/null || echo ".")"
REDACTION_SCRIPT="${SCRIPT_DIR}/redact_release_ops_content.sh"
REDACTION_POLICY="${REPO_ROOT}/docs/ci/REDACTION_POLICY.yml"
HTML_RENDER_SCRIPT="${SCRIPT_DIR}/render_release_ops_single_page_html.sh"

# Explicit allowlist of files that may be published
# Any file not on this list will be rejected
ALLOWLIST=(
    "index.html"
    "release_ops_single_page.html"
    "release_ops_single_page.md"
    "cycle_summary.md"
    "dashboard_summary.json"       # Sanitized excerpt, not full dashboard.json
    "redaction_health.json"        # Counts-only health status
    "deployment_marker.json"       # Deployment status marker
    "deployment_marker.html"       # Embeddable deployment banner
    "rollback_report.md"           # Rollback notification (when deployed from snapshot)
    "rollback_report.json"         # Rollback metadata (counts-only)
    "redaction_metrics_timeseries.json"  # Time series of redaction metrics
    "redaction_metrics_trend.html"       # Trend visualization (HTML)
    "redaction_metrics_trend.md"         # Trend visualization (Markdown)
    "release_ops_slo.json"               # SLO metrics (JSON)
    "release_ops_slo.html"               # SLO report (HTML)
    "release_ops_slo.md"                 # SLO report (Markdown)
    "error_budget.json"                  # Error budget metrics (JSON)
    "error_budget.html"                  # Error budget panel (HTML)
    "error_budget.md"                    # Error budget panel (Markdown)
    "governance_changes.json"            # Governance hash changes (counts-only)
    "governance/index.html"              # Governance dashboard (HTML)
    "governance/status.json"             # Governance status (JSON)
    "governance/README.md"               # Governance summary (Markdown)
)

# Files that must NEVER be published (blocklist for extra safety)
BLOCKLIST_PATTERNS=(
    "state-snapshot/*"
    "*_state.json"
    "blockers_state.json"
    "digest_state.json"
    "handoff_state.json"
    "triage_state.json"
    "remediation_state.json"
    "dashboard.json"          # Full dashboard may contain sensitive info
    "blocked_issues_report.md" # May contain issue details
    "routing_report.md"       # May contain internal routing info
    "escalation_report.md"    # May contain escalation details
)

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

Builds the Release Ops Pages site from orchestrator artifacts.

OPTIONS:
    --artifacts-dir DIR   Directory containing orchestrator artifacts
                          (default: artifacts/release-train/)
    --site-dir DIR        Output directory for Pages site
                          (default: site/release-ops/)
    --dry-run             Show what would be copied without copying
    --verbose             Enable verbose logging
    --help                Show this help message

ENVIRONMENT:
    PAGES_SITE_TITLE      Title for the site (default: "Release Ops Dashboard")
    PAGES_REPO_NAME       Repository name for display

EXAMPLES:
    # Build from default locations
    $0

    # Dry run to see what would be published
    $0 --dry-run

    # Custom paths
    $0 --artifacts-dir ./my-artifacts --site-dir ./public
EOF
}

# Check if a file is on the allowlist
is_allowed() {
    local filename="$1"
    local basename
    basename=$(basename "${filename}")

    for allowed in "${ALLOWLIST[@]}"; do
        # Check both basename and full relative path
        if [[ "${basename}" == "${allowed}" ]] || [[ "${filename}" == "${allowed}" ]]; then
            return 0
        fi
    done
    return 1
}

# Check if a file matches any blocklist pattern
is_blocked() {
    local filepath="$1"

    for pattern in "${BLOCKLIST_PATTERNS[@]}"; do
        # shellcheck disable=SC2053
        if [[ "${filepath}" == ${pattern} ]] || [[ "$(basename "${filepath}")" == ${pattern} ]]; then
            return 0
        fi
    done
    return 1
}

# Create sanitized dashboard summary (non-sensitive excerpt)
create_dashboard_summary() {
    local dashboard_json="$1"
    local output_file="$2"

    if [[ ! -f "${dashboard_json}" ]]; then
        log_warn "Dashboard JSON not found, creating minimal summary"
        cat > "${output_file}" <<EOF
{
  "generated_at": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "summary": {
    "total_candidates": 0,
    "promotable": 0,
    "blocked": 0,
    "pending": 0
  },
  "note": "Dashboard data not available"
}
EOF
        return
    fi

    # Extract only non-sensitive summary fields
    jq '{
      generated_at: .generated_at,
      summary: {
        total_candidates: .summary.total_candidates,
        promotable: .summary.promotable,
        blocked: .summary.blocked,
        pending: .summary.pending
      },
      candidates: [.candidates[]? | {
        tag: .tag,
        promotable_state: .promotable_state
      }]
    }' "${dashboard_json}" > "${output_file}" 2>/dev/null || {
        log_warn "Failed to parse dashboard JSON, creating minimal summary"
        cat > "${output_file}" <<EOF
{
  "generated_at": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "summary": {
    "total_candidates": 0,
    "promotable": 0,
    "blocked": 0,
    "pending": 0
  },
  "note": "Dashboard parsing failed"
}
EOF
    }
}

# Sanitize the index.html to remove links to non-published files
sanitize_index_html() {
    local input_file="$1"
    local output_file="$2"

    if [[ ! -f "${input_file}" ]]; then
        log_warn "index.html not found"
        return 1
    fi

    # Remove or disable links to blocklisted files
    sed -E \
        -e 's|<a href="dashboard\.json">|<span class="disabled">|g' \
        -e 's|<a href="blocked_issues_report\.md">|<span class="disabled">|g' \
        -e 's|<a href="routing_report\.md">|<span class="disabled">|g' \
        -e 's|<a href="escalation_report\.md">|<span class="disabled">|g' \
        -e 's|<a href="state-snapshot/[^"]*">|<span class="disabled">|g' \
        -e 's|</a>(<span class="desc">[^<]*internal[^<]*</span></li>)|</span>\1|gi' \
        "${input_file}" > "${output_file}.tmp"

    # Add note about sanitized content
    sed -i.bak 's|<h2>State Snapshot</h2>|<h2>State Snapshot</h2>\n    <p style="color:#57606a;font-size:0.875em;"><em>State snapshots not published to Pages (internal only)</em></p>|' "${output_file}.tmp" 2>/dev/null || true

    mv "${output_file}.tmp" "${output_file}"
    rm -f "${output_file}.tmp.bak"
}

# Create a Pages-specific landing page
create_pages_index() {
    local output_file="$1"
    local site_dir="$2"
    local title="${PAGES_SITE_TITLE:-Release Ops Dashboard}"
    local repo="${PAGES_REPO_NAME:-}"
    local timestamp
    timestamp=$(date -u +"%Y-%m-%dT%H:%M:%SZ")

    # Read health status if available
    local health_level="N/A"
    local health_class="health-unknown"
    local health_emoji="❓"
    local health_json="${site_dir}/redaction_health.json"

    if [[ -f "${health_json}" ]] && command -v jq &>/dev/null; then
        health_level=$(jq -r '.level // "N/A"' "${health_json}" 2>/dev/null || echo "N/A")
        case "${health_level}" in
            OK)   health_class="health-ok"; health_emoji="✅" ;;
            WARN) health_class="health-warn"; health_emoji="⚠️" ;;
            FAIL) health_class="health-fail"; health_emoji="❌" ;;
            *)    health_class="health-unknown"; health_emoji="❓" ;;
        esac
    fi

    # Read deployment marker if available
    local deploy_status="OK"
    local deploy_class="deploy-ok"
    local deploy_emoji="✅"
    local deploy_run_id=""
    local deploy_snapshot_id=""
    local deploy_date=""
    local deploy_sha=""
    local deploy_marker="${site_dir}/deployment_marker.json"

    if [[ -f "${deploy_marker}" ]] && command -v jq &>/dev/null; then
        deploy_status=$(jq -r '.status // "OK"' "${deploy_marker}" 2>/dev/null || echo "OK")
        deploy_emoji=$(jq -r '.status_emoji // "✅"' "${deploy_marker}" 2>/dev/null || echo "✅")
        deploy_run_id=$(jq -r '.run_id // ""' "${deploy_marker}" 2>/dev/null || echo "")
        deploy_snapshot_id=$(jq -r '.snapshot_id // ""' "${deploy_marker}" 2>/dev/null || echo "")
        deploy_date=$(jq -r '.date_display // ""' "${deploy_marker}" 2>/dev/null || echo "")
        deploy_sha=$(jq -r '.git_sha // ""' "${deploy_marker}" 2>/dev/null || echo "")

        case "${deploy_status}" in
            OK)          deploy_class="deploy-ok" ;;
            WARN)        deploy_class="deploy-warn" ;;
            ROLLED_BACK) deploy_class="deploy-rollback" ;;
            *)           deploy_class="deploy-unknown" ;;
        esac
    fi

    cat > "${output_file}" <<EOF
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
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
      max-width: 700px;
      margin: 0 auto;
      background: #fff;
      border-radius: 8px;
      box-shadow: 0 1px 3px rgba(0,0,0,0.1);
      padding: 24px 32px;
    }
    h1 { margin: 0 0 8px 0; font-size: 1.75em; }
    .meta {
      color: #57606a;
      font-size: 0.875em;
      margin-bottom: 24px;
      padding-bottom: 16px;
      border-bottom: 1px solid #d0d7de;
    }
    .health-banner {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 12px 16px;
      border-radius: 8px;
      margin-bottom: 16px;
    }
    .health-ok { background: #dafbe1; border: 1px solid #1a7f37; }
    .health-warn { background: #fff8c5; border: 1px solid #d4a72c; }
    .health-fail { background: #ffebe9; border: 1px solid #cf222e; }
    .health-unknown { background: #f6f8fa; border: 1px solid #d0d7de; }
    .health-label { font-weight: 600; font-size: 0.9em; }
    .health-ok .health-label { color: #1a7f37; }
    .health-warn .health-label { color: #9a6700; }
    .health-fail .health-label { color: #cf222e; }
    .health-unknown .health-label { color: #57606a; }
    .health-link { font-size: 0.8em; }
    .deploy-banner {
      display: flex;
      flex-direction: column;
      gap: 8px;
      padding: 12px 16px;
      border-radius: 8px;
      margin-bottom: 16px;
      font-size: 0.875em;
    }
    .deploy-ok { background: #f6f8fa; border: 1px solid #d0d7de; }
    .deploy-warn { background: #fff8c5; border: 1px solid #d4a72c; }
    .deploy-rollback { background: #ddf4ff; border: 1px solid #54aeff; }
    .deploy-unknown { background: #f6f8fa; border: 1px solid #d0d7de; }
    .deploy-header { display: flex; align-items: center; gap: 8px; font-weight: 600; }
    .deploy-ok .deploy-header { color: #1a7f37; }
    .deploy-warn .deploy-header { color: #9a6700; }
    .deploy-rollback .deploy-header { color: #0969da; }
    .deploy-info { display: flex; flex-wrap: wrap; gap: 8px 16px; color: #57606a; font-size: 0.85em; }
    .deploy-info code { background: rgba(0,0,0,0.06); padding: 2px 6px; border-radius: 3px; font-family: monospace; }
    .deploy-info a { color: inherit; }
    .deploy-rollback-notice { background: #0969da; color: white; padding: 2px 8px; border-radius: 4px; font-size: 0.8em; margin-left: 8px; }
    .primary {
      background: #ddf4ff;
      border: 1px solid #54aeff;
      border-radius: 8px;
      padding: 16px;
      margin-bottom: 24px;
    }
    .primary h2 { margin: 0 0 12px 0; color: #0969da; font-size: 1.1em; }
    ul { list-style: none; padding: 0; margin: 0; }
    li {
      padding: 10px 12px;
      background: #fff;
      border: 1px solid #d0d7de;
      border-radius: 6px;
      margin: 4px 0;
    }
    li:hover { border-color: #0969da; }
    a { color: #0969da; text-decoration: none; font-weight: 500; }
    a:hover { text-decoration: underline; }
    .desc { color: #57606a; font-size: 0.875em; display: block; margin-top: 2px; }
    .note {
      background: #fff8c5;
      border: 1px solid #d4a72c;
      border-radius: 6px;
      padding: 12px 16px;
      font-size: 0.875em;
      color: #57606a;
      margin-top: 24px;
    }
    footer {
      margin-top: 24px;
      padding-top: 16px;
      border-top: 1px solid #d0d7de;
      color: #57606a;
      font-size: 0.75em;
      text-align: center;
    }
  </style>
</head>
<body>
  <div class="container">
    <h1>${title}</h1>
    <div class="meta">
EOF

    if [[ -n "${repo}" ]]; then
        echo "      <span><strong>Repository:</strong> ${repo}</span><br>" >> "${output_file}"
    fi

    cat >> "${output_file}" <<EOF
      <span><strong>Last Updated:</strong> ${timestamp}</span>
    </div>
EOF

    # Add deployment banner if marker exists
    if [[ -f "${deploy_marker}" ]]; then
        local snapshot_info=""
        if [[ "${deploy_status}" == "ROLLED_BACK" && -n "${deploy_snapshot_id}" && "${deploy_snapshot_id}" != "null" ]]; then
            snapshot_info="<span>Snapshot: <code>${deploy_snapshot_id}</code></span>"
        fi

        local run_link=""
        if [[ -n "${deploy_run_id}" && "${deploy_run_id}" != "null" ]]; then
            run_link="<span>Run: <a href=\"https://github.com/${repo}/actions/runs/${deploy_run_id}\">#${deploy_run_id}</a></span>"
        fi

        local sha_info=""
        if [[ -n "${deploy_sha}" && "${deploy_sha}" != "null" && "${deploy_sha}" != "unknown" ]]; then
            sha_info="<span>SHA: <code>${deploy_sha:0:7}</code></span>"
        fi

        local rollback_notice=""
        if [[ "${deploy_status}" == "ROLLED_BACK" ]]; then
            rollback_notice="<span class=\"deploy-rollback-notice\">From Snapshot</span>"
        fi

        cat >> "${output_file}" <<EOF
    <div class="deploy-banner ${deploy_class}">
      <div class="deploy-header">
        ${deploy_emoji} Deployment: ${deploy_status}${rollback_notice}
      </div>
      <div class="deploy-info">
        <span>Updated: ${deploy_date:-${timestamp}}</span>
        ${run_link}
        ${sha_info}
        ${snapshot_info}
      </div>
EOF
        if [[ "${deploy_status}" == "ROLLED_BACK" ]]; then
            cat >> "${output_file}" <<EOF
      <div class="deploy-info" style="margin-top:4px;font-style:italic;">
        This site is showing content from a previous known-good snapshot due to an issue with the latest build.
        <a href="rollback_report.md">View details</a>
      </div>
EOF
        fi
        echo "    </div>" >> "${output_file}"
        echo "" >> "${output_file}"
    fi

    cat >> "${output_file}" <<EOF
    <div class="health-banner ${health_class}">
      <span class="health-label">${health_emoji} Redaction Health: ${health_level}</span>
      <span class="health-link"><a href="redaction_metrics_trend.html">Trend</a> | <a href="release_ops_slo.html">SLO</a> | <a href="error_budget.html">Budget</a> | <a href="redaction_diff_report.md">Report</a></span>
    </div>

    <div class="primary">
      <h2>Release Status</h2>
      <ul>
        <li>
          <a href="release_ops_single_page.html">Release Ops Single Page</a>
          <span class="desc">Consolidated view of release train status, blockers, and action items</span>
        </li>
      </ul>
    </div>

    <h2 style="font-size:1em;margin:24px 0 12px;color:#57606a;text-transform:uppercase;">Additional Resources</h2>
    <ul>
      <li>
        <a href="cycle_summary.md">Cycle Summary</a>
        <span class="desc">Configuration and metrics for the latest orchestrator run</span>
      </li>
      <li>
        <a href="dashboard_summary.json">Dashboard Summary (JSON)</a>
        <span class="desc">Machine-readable release candidate status</span>
      </li>
    </ul>

    <div class="note">
      <strong>Note:</strong> This is a public summary. Detailed reports, state files, and
      internal artifacts are available in the
      <a href="https://github.com/${repo}/actions/workflows/release-ops-orchestrator.yml">workflow artifacts</a>.
    </div>

    <footer>
      Published by Release Ops Orchestrator
    </footer>
  </div>
</body>
</html>
EOF
}

# --- Main ---
main() {
    local artifacts_dir="artifacts/release-train"
    local site_dir="site/release-ops"
    local dry_run=false
    local verbose=false

    # Parse arguments
    while [[ $# -gt 0 ]]; do
        case $1 in
            --artifacts-dir)
                artifacts_dir="$2"
                shift 2
                ;;
            --site-dir)
                site_dir="$2"
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

    [[ "${verbose}" == "true" ]] && log_info "Artifacts dir: ${artifacts_dir}"
    [[ "${verbose}" == "true" ]] && log_info "Site dir: ${site_dir}"
    [[ "${verbose}" == "true" ]] && log_info "Dry run: ${dry_run}"

    # Verify artifacts directory exists
    if [[ ! -d "${artifacts_dir}" ]]; then
        log_error "Artifacts directory not found: ${artifacts_dir}"
        exit 1
    fi

    # Create site directory
    if [[ "${dry_run}" == "false" ]]; then
        mkdir -p "${site_dir}"
    fi

    log_info "Building Release Ops Pages site..."
    log_info "Allowlist: ${ALLOWLIST[*]}"

    # Track what gets published
    local published_files=()
    local skipped_files=()

    # Process each file in artifacts
    for file in "${artifacts_dir}"/*; do
        [[ ! -f "${file}" ]] && continue

        local basename
        basename=$(basename "${file}")
        local relative_path="${basename}"

        # Check blocklist first (safety)
        if is_blocked "${relative_path}"; then
            [[ "${verbose}" == "true" ]] && log_info "BLOCKED: ${basename}"
            skipped_files+=("${basename} (blocked)")
            continue
        fi

        # Check allowlist
        if ! is_allowed "${basename}"; then
            [[ "${verbose}" == "true" ]] && log_info "NOT ALLOWED: ${basename}"
            skipped_files+=("${basename} (not on allowlist)")
            continue
        fi

        # File is allowed - copy it
        if [[ "${dry_run}" == "true" ]]; then
            log_info "WOULD PUBLISH: ${basename}"
        else
            cp "${file}" "${site_dir}/"
            [[ "${verbose}" == "true" ]] && log_info "PUBLISHED: ${basename}"
        fi
        published_files+=("${basename}")
    done

    # --- Redaction Phase ---
    log_info "Applying redaction layer..."

    # Redact single page markdown if present
    local single_page_md="${site_dir}/release_ops_single_page.md"
    if [[ -f "${single_page_md}" ]] && [[ -x "${REDACTION_SCRIPT}" ]]; then
        if [[ "${dry_run}" == "true" ]]; then
            log_info "WOULD REDACT: release_ops_single_page.md (sanitized mode)"
        else
            local temp_md="${site_dir}/release_ops_single_page.md.tmp"
            "${REDACTION_SCRIPT}" \
                --in "${single_page_md}" \
                --out "${temp_md}" \
                --mode sanitized \
                --policy "${REDACTION_POLICY}" \
                ${verbose:+--verbose} || {
                    log_error "Redaction failed for release_ops_single_page.md"
                    rm -f "${temp_md}"
                    exit 1
                }
            mv "${temp_md}" "${single_page_md}"
            [[ "${verbose}" == "true" ]] && log_info "Redacted: release_ops_single_page.md"
        fi
    fi

    # Re-render HTML from sanitized markdown
    local single_page_html="${site_dir}/release_ops_single_page.html"
    if [[ -f "${single_page_md}" ]] && [[ -x "${HTML_RENDER_SCRIPT}" ]]; then
        if [[ "${dry_run}" == "true" ]]; then
            log_info "WOULD RE-RENDER: release_ops_single_page.html (from sanitized markdown)"
        else
            "${HTML_RENDER_SCRIPT}" "${single_page_md}" "${single_page_html}" || {
                log_warn "HTML re-render failed, keeping original HTML"
            }
            [[ "${verbose}" == "true" ]] && log_info "Re-rendered: release_ops_single_page.html"
        fi
    fi

    # Create sanitized dashboard summary using redaction script if available
    local dashboard_src="${artifacts_dir}/dashboard.json"
    local dashboard_dest="${site_dir}/dashboard_summary.json"

    if [[ "${dry_run}" == "true" ]]; then
        log_info "WOULD CREATE: dashboard_summary.json (sanitized)"
    else
        if [[ -x "${REDACTION_SCRIPT}" ]] && [[ -f "${dashboard_src}" ]]; then
            "${REDACTION_SCRIPT}" \
                --in "${dashboard_src}" \
                --out "${dashboard_dest}" \
                --mode sanitized \
                --type json \
                --policy "${REDACTION_POLICY}" \
                ${verbose:+--verbose} || {
                    log_warn "JSON redaction failed, using fallback"
                    create_dashboard_summary "${dashboard_src}" "${dashboard_dest}"
                }
        else
            create_dashboard_summary "${dashboard_src}" "${dashboard_dest}"
        fi
        log_info "Created sanitized dashboard_summary.json"
    fi
    published_files+=("dashboard_summary.json")

    # Generate redaction health JSON for badge display
    if [[ "${dry_run}" == "false" ]] && [[ -x "${SCRIPT_DIR}/compute_redaction_health.sh" ]]; then
        local health_dest="${site_dir}/redaction_health.json"
        local diff_report="${site_dir}/redaction_diff_report.json"
        local health_args=()

        [[ -f "${diff_report}" ]] && health_args+=(--diff-report "${diff_report}")

        if [[ ${#health_args[@]} -gt 0 ]]; then
            "${SCRIPT_DIR}/compute_redaction_health.sh" \
                "${health_args[@]}" \
                --out "${health_dest}" 2>/dev/null || true
            [[ "${verbose}" == "true" ]] && log_info "Generated: redaction_health.json"
        fi
    fi

    # Update redaction metrics time series (if health and marker exist)
    if [[ "${dry_run}" == "false" ]] && [[ -x "${SCRIPT_DIR}/update_redaction_metrics_timeseries.sh" ]]; then
        if [[ -f "${site_dir}/redaction_health.json" ]]; then
            "${SCRIPT_DIR}/update_redaction_metrics_timeseries.sh" \
                --site-dir "${site_dir}" \
                ${verbose:+--verbose} 2>/dev/null || {
                    log_warn "Failed to update redaction metrics time series"
                }
            [[ "${verbose}" == "true" ]] && log_info "Updated: redaction_metrics_timeseries.json"
        fi
    fi

    # Detect governance changes from time series
    if [[ "${dry_run}" == "false" ]] && [[ -x "${SCRIPT_DIR}/detect_governance_changes.sh" ]]; then
        if [[ -f "${site_dir}/redaction_metrics_timeseries.json" ]]; then
            "${SCRIPT_DIR}/detect_governance_changes.sh" \
                --timeseries "${site_dir}/redaction_metrics_timeseries.json" \
                --out "${site_dir}/governance_changes.json" \
                ${verbose:+--verbose} 2>/dev/null || {
                    log_warn "Failed to detect governance changes"
                }
            [[ "${verbose}" == "true" ]] && log_info "Generated: governance_changes.json"
        fi
    fi

    # Render redaction metrics trend pages
    if [[ "${dry_run}" == "false" ]] && [[ -x "${SCRIPT_DIR}/render_redaction_metrics_trend.sh" ]]; then
        if [[ -f "${site_dir}/redaction_metrics_timeseries.json" ]]; then
            "${SCRIPT_DIR}/render_redaction_metrics_trend.sh" \
                --site-dir "${site_dir}" \
                ${verbose:+--verbose} 2>/dev/null || {
                    log_warn "Failed to render redaction metrics trend"
                }
            [[ "${verbose}" == "true" ]] && log_info "Generated: redaction_metrics_trend.html, redaction_metrics_trend.md"
        fi
    fi

    # Compute SLO metrics from time series
    if [[ "${dry_run}" == "false" ]] && [[ -x "${SCRIPT_DIR}/compute_release_ops_slo.sh" ]]; then
        if [[ -f "${site_dir}/redaction_metrics_timeseries.json" ]]; then
            "${SCRIPT_DIR}/compute_release_ops_slo.sh" \
                --timeseries "${site_dir}/redaction_metrics_timeseries.json" \
                --flake-registry "${REPO_ROOT}/.github/flake-registry.yml" \
                --out "${site_dir}/release_ops_slo.json" \
                ${verbose:+--verbose} 2>/dev/null || {
                    log_warn "Failed to compute SLO metrics"
                }
            [[ "${verbose}" == "true" ]] && log_info "Generated: release_ops_slo.json"
        fi
    fi

    # Render SLO report pages
    if [[ "${dry_run}" == "false" ]] && [[ -x "${SCRIPT_DIR}/render_release_ops_slo_report.sh" ]]; then
        if [[ -f "${site_dir}/release_ops_slo.json" ]]; then
            "${SCRIPT_DIR}/render_release_ops_slo_report.sh" \
                --slo-json "${site_dir}/release_ops_slo.json" \
                --out-dir "${site_dir}" \
                ${verbose:+--verbose} 2>/dev/null || {
                    log_warn "Failed to render SLO report"
                }
            [[ "${verbose}" == "true" ]] && log_info "Generated: release_ops_slo.html, release_ops_slo.md"
        fi
    fi

    # Compute error budget from time series
    if [[ "${dry_run}" == "false" ]] && [[ -x "${SCRIPT_DIR}/compute_error_budget.sh" ]]; then
        if [[ -f "${site_dir}/redaction_metrics_timeseries.json" ]]; then
            "${SCRIPT_DIR}/compute_error_budget.sh" \
                --timeseries "${site_dir}/redaction_metrics_timeseries.json" \
                --out "${site_dir}/error_budget.json" \
                ${verbose:+--verbose} 2>/dev/null || {
                    log_warn "Failed to compute error budget"
                }
            [[ "${verbose}" == "true" ]] && log_info "Generated: error_budget.json"
        fi
    fi

    # Render error budget panel
    if [[ "${dry_run}" == "false" ]] && [[ -x "${SCRIPT_DIR}/render_error_budget_panel.sh" ]]; then
        if [[ -f "${site_dir}/error_budget.json" ]]; then
            "${SCRIPT_DIR}/render_error_budget_panel.sh" \
                --budget-json "${site_dir}/error_budget.json" \
                --out-dir "${site_dir}" \
                ${verbose:+--verbose} 2>/dev/null || {
                    log_warn "Failed to render error budget panel"
                }
            [[ "${verbose}" == "true" ]] && log_info "Generated: error_budget.html, error_budget.md"
        fi
    fi

    # Generate governance dashboard
    local gov_dashboard_script="${SCRIPT_DIR}/render_governance_dashboard.sh"
    if [[ -x "${gov_dashboard_script}" ]]; then
        if [[ "${dry_run}" == "true" ]]; then
            log_info "WOULD CREATE: governance/index.html, governance/status.json, governance/README.md"
        else
            mkdir -p "${site_dir}/governance"
            "${gov_dashboard_script}" \
                --format html \
                --out-file "${site_dir}/governance/index.html" \
                ${verbose:+--verbose} 2>/dev/null || {
                    log_warn "Failed to render governance dashboard HTML"
                }
            "${gov_dashboard_script}" \
                --format json \
                --out-file "${site_dir}/governance/status.json" \
                2>/dev/null || {
                    log_warn "Failed to render governance dashboard JSON"
                }
            "${gov_dashboard_script}" \
                --format md \
                --out-file "${site_dir}/governance/README.md" \
                2>/dev/null || {
                    log_warn "Failed to render governance dashboard MD"
                }
            [[ "${verbose}" == "true" ]] && log_info "Generated: governance/index.html, governance/status.json, governance/README.md"
            published_files+=("governance/index.html" "governance/status.json" "governance/README.md")
        fi
    else
        [[ "${verbose}" == "true" ]] && log_info "Governance dashboard script not found, skipping"
    fi

    # Create Pages-specific index
    local index_dest="${site_dir}/index.html"
    if [[ "${dry_run}" == "true" ]]; then
        log_info "WOULD CREATE: index.html (Pages landing)"
    else
        create_pages_index "${index_dest}" "${site_dir}"
        log_info "Created Pages index.html"
    fi

    # --- Final Verification ---
    # Verify no forbidden patterns remain in any published file
    if [[ "${dry_run}" == "false" ]] && [[ -x "${REDACTION_SCRIPT}" ]]; then
        log_info "Verifying no forbidden patterns in site..."
        local verification_failed=false

        for file in "${site_dir}"/*; do
            [[ ! -f "${file}" ]] && continue
            local basename
            basename=$(basename "${file}")

            # Skip non-text files
            case "${basename}" in
                *.json|*.md|*.html)
                    if ! "${REDACTION_SCRIPT}" \
                        --in "${file}" \
                        --verify-only \
                        --policy "${REDACTION_POLICY}" 2>/dev/null; then
                        log_error "FORBIDDEN PATTERNS DETECTED: ${basename}"
                        verification_failed=true
                    fi
                    ;;
            esac
        done

        if [[ "${verification_failed}" == "true" ]]; then
            log_error "FATAL: Site contains forbidden patterns!"
            log_error "Cannot publish. Review redaction policy and content."
            exit 1
        fi

        log_info "Verification passed: no forbidden patterns found"
    fi

    # Summary
    echo ""
    log_info "=== Build Summary ==="
    log_info "Published files (${#published_files[@]}):"
    for f in "${published_files[@]}"; do
        echo "  + ${f}"
    done

    if [[ ${#skipped_files[@]} -gt 0 ]]; then
        log_info "Skipped files (${#skipped_files[@]}):"
        for f in "${skipped_files[@]}"; do
            echo "  - ${f}"
        done
    fi

    if [[ "${dry_run}" == "true" ]]; then
        log_info "Dry run complete. No files were written."
    else
        log_info "Site built: ${site_dir}/"
        log_info "Files:"
        ls -la "${site_dir}/"
    fi
}

main "$@"
