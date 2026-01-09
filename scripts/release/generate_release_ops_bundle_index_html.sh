#!/usr/bin/env bash
# generate_release_ops_bundle_index_html.sh v1.0.0
# Generates a landing page (index.html) for the release-ops-cycle artifact bundle
#
# Provides one-click navigation to all key reports without guessing filenames.
#
# Authority: docs/ci/RELEASE_OPS_ORCHESTRATOR.md

set -euo pipefail

# --- Configuration ---
SCRIPT_VERSION="1.0.0"

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

Generates an index.html landing page for the release-ops-cycle artifact bundle.

OPTIONS:
    --reports-dir DIR   Directory containing report files (default: artifacts/release-train/)
    --out FILE          Output file path (default: <reports-dir>/index.html)
    --run-id ID         Orchestrator run ID (optional)
    --repo REPO         Repository name (optional)
    --verbose           Enable verbose logging
    --help              Show this help message

EXAMPLES:
    $0 --reports-dir artifacts/release-train/
    $0 --reports-dir artifacts/release-train/ --run-id 12345678 --repo myorg/myrepo
EOF
}

# Check if a file exists and return status indicator
file_status() {
    local file="$1"
    local reports_dir="$2"
    local full_path="${reports_dir}/${file}"

    if [[ -f "${full_path}" ]]; then
        echo "available"
    else
        echo "missing"
    fi
}

# Generate a link element
generate_link() {
    local file="$1"
    local label="$2"
    local description="$3"
    local reports_dir="$4"
    local status
    status=$(file_status "${file}" "${reports_dir}")

    if [[ "${status}" == "available" ]]; then
        echo "      <li class=\"available\">"
        echo "        <a href=\"${file}\">${label}</a>"
        echo "        <span class=\"desc\">${description}</span>"
        echo "      </li>"
    else
        echo "      <li class=\"missing\">"
        echo "        <span class=\"label\">${label}</span>"
        echo "        <span class=\"status\">(missing)</span>"
        echo "        <span class=\"desc\">${description}</span>"
        echo "      </li>"
    fi
}

# Read timestamp from cycle_info.txt if available
get_cycle_timestamp() {
    local reports_dir="$1"
    local cycle_info="${reports_dir}/cycle_info.txt"

    if [[ -f "${cycle_info}" ]]; then
        grep -E "^Orchestrator cycle started at" "${cycle_info}" 2>/dev/null | \
            sed 's/Orchestrator cycle started at //' || echo ""
    else
        echo ""
    fi
}

# Read run ID from cycle_info.txt if not provided
get_run_id_from_cycle_info() {
    local reports_dir="$1"
    local cycle_info="${reports_dir}/cycle_info.txt"

    if [[ -f "${cycle_info}" ]]; then
        grep -E "^Run ID:" "${cycle_info}" 2>/dev/null | \
            sed 's/Run ID: //' || echo ""
    else
        echo ""
    fi
}

# --- Main ---
main() {
    local reports_dir="artifacts/release-train"
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
    [[ -z "${out_file}" ]] && out_file="${reports_dir}/index.html"

    # Get timestamp and run ID from cycle_info if not provided
    local timestamp
    timestamp=$(get_cycle_timestamp "${reports_dir}")

    if [[ -z "${run_id}" ]]; then
        run_id=$(get_run_id_from_cycle_info "${reports_dir}")
    fi

    [[ "${verbose}" == "true" ]] && log_info "Reports dir: ${reports_dir}"
    [[ "${verbose}" == "true" ]] && log_info "Output: ${out_file}"
    [[ "${verbose}" == "true" ]] && log_info "Timestamp: ${timestamp:-N/A}"
    [[ "${verbose}" == "true" ]] && log_info "Run ID: ${run_id:-N/A}"

    # Ensure output directory exists
    mkdir -p "$(dirname "${out_file}")"

    # Generate the index.html
    cat > "${out_file}" <<'HTML_HEAD'
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Release Ops Cycle</title>
  <style>
    *, *::before, *::after { box-sizing: border-box; }

    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
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

    h1 {
      margin: 0 0 8px 0;
      font-size: 1.75em;
      color: #24292f;
    }

    .meta {
      color: #57606a;
      font-size: 0.875em;
      margin-bottom: 24px;
      padding-bottom: 16px;
      border-bottom: 1px solid #d0d7de;
    }
    .meta span { display: block; margin: 2px 0; }

    h2 {
      font-size: 1.1em;
      margin: 24px 0 12px 0;
      color: #24292f;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    ul {
      list-style: none;
      padding: 0;
      margin: 0;
    }

    li {
      padding: 10px 12px;
      border-radius: 6px;
      margin: 4px 0;
      display: flex;
      flex-wrap: wrap;
      align-items: baseline;
      gap: 8px;
    }

    li.available {
      background: #f6f8fa;
    }
    li.available:hover {
      background: #eaeef2;
    }

    li.missing {
      background: #fff8c5;
      color: #57606a;
    }

    li a {
      color: #0969da;
      text-decoration: none;
      font-weight: 500;
    }
    li a:hover {
      text-decoration: underline;
    }

    li .label {
      font-weight: 500;
      color: #57606a;
    }

    li .status {
      font-size: 0.8em;
      color: #9a6700;
      font-style: italic;
    }

    li .desc {
      color: #57606a;
      font-size: 0.875em;
      flex-basis: 100%;
      margin-top: 2px;
    }

    .primary {
      background: #ddf4ff;
      border: 1px solid #54aeff;
      border-radius: 8px;
      padding: 16px;
      margin-bottom: 24px;
    }
    .primary h2 {
      margin-top: 0;
      color: #0969da;
    }
    .primary li {
      background: #fff;
      border: 1px solid #d0d7de;
    }
    .primary li:hover {
      border-color: #0969da;
    }

    footer {
      margin-top: 24px;
      padding-top: 16px;
      border-top: 1px solid #d0d7de;
      color: #57606a;
      font-size: 0.75em;
      text-align: center;
    }

    @media (max-width: 600px) {
      .container { padding: 16px; }
      li { padding: 8px; }
    }
  </style>
</head>
<body>
  <div class="container">
    <h1>Release Ops Cycle</h1>
    <div class="meta">
HTML_HEAD

    # Add metadata
    if [[ -n "${repo}" ]]; then
        echo "      <span><strong>Repository:</strong> ${repo}</span>" >> "${out_file}"
    fi
    if [[ -n "${timestamp}" ]]; then
        echo "      <span><strong>Generated:</strong> ${timestamp}</span>" >> "${out_file}"
    fi
    if [[ -n "${run_id}" ]]; then
        echo "      <span><strong>Run ID:</strong> ${run_id}</span>" >> "${out_file}"
    fi

    cat >> "${out_file}" <<'HTML_PRIMARY_START'
    </div>

    <div class="primary">
      <h2>Start Here</h2>
      <ul>
HTML_PRIMARY_START

    # Primary links
    generate_link "release_ops_single_page.html" "Single Page Summary (HTML)" "Browser-friendly consolidated view" "${reports_dir}" >> "${out_file}"
    generate_link "release_ops_single_page.md" "Single Page Summary (Markdown)" "Source markdown" "${reports_dir}" >> "${out_file}"

    cat >> "${out_file}" <<'HTML_REPORTS_START'
      </ul>
    </div>

    <h2>Reports</h2>
    <ul>
HTML_REPORTS_START

    # Report links
    generate_link "cycle_summary.md" "Cycle Summary" "Configuration and metrics for this run" "${reports_dir}" >> "${out_file}"
    generate_link "dashboard.json" "Dashboard (JSON)" "Machine-readable release train status" "${reports_dir}" >> "${out_file}"
    generate_link "dashboard.md" "Dashboard (Markdown)" "Human-readable dashboard" "${reports_dir}" >> "${out_file}"
    generate_link "blocked_issues_report.md" "Blocked Issues Report" "Blocker issues raised this cycle" "${reports_dir}" >> "${out_file}"
    generate_link "routing_report.md" "Routing Report" "Triage routing actions taken" "${reports_dir}" >> "${out_file}"
    generate_link "escalation_report.md" "Escalation Report" "Escalation actions taken" "${reports_dir}" >> "${out_file}"
    generate_link "release_ops_digest.md" "Daily Digest" "Consolidated status summary" "${reports_dir}" >> "${out_file}"
    generate_link "oncall_handoff.md" "On-Call Handoff" "Shift transition notes" "${reports_dir}" >> "${out_file}"

    cat >> "${out_file}" <<'HTML_STATE_START'
    </ul>

    <h2>State Snapshot</h2>
    <ul>
HTML_STATE_START

    # State snapshot links
    generate_link "state-snapshot/blockers_state.json" "Blockers State" "Escalation state snapshot" "${reports_dir}" >> "${out_file}"
    generate_link "state-snapshot/digest_state.json" "Digest State" "Digest generation state" "${reports_dir}" >> "${out_file}"
    generate_link "state-snapshot/handoff_state.json" "Handoff State" "Handoff generation state" "${reports_dir}" >> "${out_file}"

    cat >> "${out_file}" <<HTML_FOOTER
    </ul>

    <footer>
      Generated by <code>generate_release_ops_bundle_index_html.sh</code> v${SCRIPT_VERSION}
    </footer>
  </div>
</body>
</html>
HTML_FOOTER

    log_info "Generated: ${out_file}"
}

main "$@"
