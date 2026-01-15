#!/usr/bin/env bash
# render_governance_dashboard.sh v1.0.0
# Generates a comprehensive governance status dashboard
#
# This script creates an overview of all governance components:
# - Current governance hash and lockfile status
# - Policy validation results
# - State flags (freeze mode, tight mode, etc.)
# - Policy file inventory
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

Generates a comprehensive governance status dashboard.

OPTIONS:
    --out-file FILE     Output file (default: stdout for md, governance_dashboard.html for html)
    --format FORMAT     Output format: md, html, json (default: md)
    --verbose           Enable verbose logging
    --help              Show this help message

OUTPUT:
    Generates a dashboard showing governance posture including:
    - Governance hash status
    - Policy validation results
    - State flag status
    - Policy file inventory

EXAMPLES:
    # Markdown to stdout
    $0

    # HTML output
    $0 --format html --out-file site/governance_dashboard.html

    # JSON for automation
    $0 --format json
EOF
}

# --- Data Collection Functions ---

get_governance_hash() {
    local lockfile="${REPO_ROOT}/docs/releases/_state/governance_lockfile.json"
    if [[ -f "${lockfile}" ]]; then
        sha256sum "${lockfile}" 2>/dev/null | cut -d' ' -f1
    else
        echo ""
    fi
}

get_lockfile_metadata() {
    local lockfile="${REPO_ROOT}/docs/releases/_state/governance_lockfile.json"
    if [[ -f "${lockfile}" ]]; then
        jq -c '{
            version: .version,
            tag: .tag,
            sha: .sha,
            generated_at: .generated_at_utc,
            total_files: .summary.total_files,
            policy_files: .summary.policy_files,
            state_files: .summary.state_files
        }' "${lockfile}" 2>/dev/null || echo "{}"
    else
        echo "{}"
    fi
}

get_state_flags() {
    local state_dir="${REPO_ROOT}/docs/releases/_state"

    local freeze_enabled="unknown"
    local tight_mode="unknown"
    local override_active="unknown"
    local budget_remaining="unknown"

    if [[ -f "${state_dir}/freeze_mode.json" ]]; then
        freeze_enabled=$(jq -r '.enabled // false' "${state_dir}/freeze_mode.json" 2>/dev/null || echo "unknown")
    fi

    if [[ -f "${state_dir}/governance_tight_mode.json" ]]; then
        tight_mode=$(jq -r '.enabled // false' "${state_dir}/governance_tight_mode.json" 2>/dev/null || echo "unknown")
    fi

    if [[ -f "${state_dir}/release_override.json" ]]; then
        override_active=$(jq -r '.active // false' "${state_dir}/release_override.json" 2>/dev/null || echo "unknown")
    fi

    if [[ -f "${state_dir}/error_budget_state.json" ]]; then
        budget_remaining=$(jq -r '.remaining_percent // "unknown"' "${state_dir}/error_budget_state.json" 2>/dev/null || echo "unknown")
    fi

    jq -n \
        --arg freeze "${freeze_enabled}" \
        --arg tight "${tight_mode}" \
        --arg override "${override_active}" \
        --arg budget "${budget_remaining}" \
        '{
            freeze_mode: $freeze,
            tight_mode: $tight,
            override_active: $override,
            error_budget_remaining: $budget
        }'
}

get_policy_inventory() {
    local ci_dir="${REPO_ROOT}/docs/ci"

    # List YAML policies
    local files
    files=$(find "${ci_dir}" -maxdepth 1 -name "*.yml" 2>/dev/null | sort)
    if [[ -z "${files}" ]]; then
        files=$(find "${ci_dir}" -maxdepth 1 -name "*.yaml" 2>/dev/null | sort)
    fi

    if [[ -z "${files}" ]]; then
        echo "[]"
        return
    fi

    # Build JSON array
    local json="["
    local first=true
    for file in ${files}; do
        local bname
        bname=$(basename "${file}")
        if [[ "${first}" == "true" ]]; then
            first=false
        else
            json="${json},"
        fi
        json="${json}{\"file\":\"${bname}\",\"status\":\"present\"}"
    done
    json="${json}]"
    echo "${json}"
}

run_validation() {
    local validator="${SCRIPT_DIR}/validate_governance_policies.sh"

    if [[ ! -x "${validator}" ]]; then
        echo '{"status":"unavailable","summary":{"total":0,"passed":0,"failed":0,"warnings":0}}'
        return
    fi

    # Run validation and capture output (validation may return non-zero on failures)
    local result
    result=$("${validator}" --json 2>/dev/null) || true

    if [[ -n "${result}" ]] && echo "${result}" | jq empty 2>/dev/null; then
        echo "${result}"
    else
        echo '{"status":"error","summary":{"total":0,"passed":0,"failed":0,"warnings":0}}'
    fi
}

# --- Rendering Functions ---

render_markdown() {
    local gov_hash="$1"
    local lockfile_meta="$2"
    local state_flags="$3"
    local policy_inventory="$4"
    local validation="$5"

    local tag sha generated_at total_files
    tag=$(echo "${lockfile_meta}" | jq -r '.tag // "none"')
    sha=$(echo "${lockfile_meta}" | jq -r '.sha // "none"' | cut -c1-12)
    generated_at=$(echo "${lockfile_meta}" | jq -r '.generated_at // "unknown"')
    total_files=$(echo "${lockfile_meta}" | jq -r '.total_files // 0')

    local freeze tight override budget
    freeze=$(echo "${state_flags}" | jq -r '.freeze_mode')
    tight=$(echo "${state_flags}" | jq -r '.tight_mode')
    override=$(echo "${state_flags}" | jq -r '.override_active')
    budget=$(echo "${state_flags}" | jq -r '.error_budget_remaining')

    local val_status val_passed val_failed val_warnings
    val_status=$(echo "${validation}" | jq -r '.status // "unknown"')
    val_passed=$(echo "${validation}" | jq -r '.summary.passed // 0')
    val_failed=$(echo "${validation}" | jq -r '.summary.failed // 0')
    val_warnings=$(echo "${validation}" | jq -r '.summary.warnings // 0')

    cat <<EOF
# Governance Dashboard

**Generated:** $(date -u +%Y-%m-%dT%H:%M:%SZ)
**Script Version:** ${SCRIPT_VERSION}

---

## Governance Hash

| Property | Value |
|----------|-------|
| Hash | \`${gov_hash:0:16}...\` |
| Tag | ${tag} |
| SHA | ${sha}... |
| Generated | ${generated_at} |
| Total Files | ${total_files} |

---

## State Flags

| Flag | Status |
|------|--------|
| Freeze Mode | $(format_flag_badge "${freeze}") |
| Tight Mode | $(format_flag_badge "${tight}") |
| Override Active | $(format_flag_badge "${override}") |
| Error Budget | ${budget}% remaining |

---

## Policy Validation

| Metric | Value |
|--------|-------|
| Status | $(format_status_badge "${val_status}") |
| Passed | ${val_passed} |
| Failed | ${val_failed} |
| Warnings | ${val_warnings} |

---

## Policy Inventory

| Policy File | Status |
|-------------|--------|
$(echo "${policy_inventory}" | jq -r '.[] | "| \(.file) | ✅ Present |"')

---

## Quick Commands

\`\`\`bash
# View current governance hash
sha256sum docs/releases/_state/governance_lockfile.json

# Run policy validation
./scripts/release/validate_governance_policies.sh --verbose

# Check governance drift
./scripts/release/check_governance_drift.sh --timeseries site/release-ops/redaction_metrics_timeseries.json

# Generate new lockfile
./scripts/release/generate_governance_lockfile.sh --sha \$(git rev-parse HEAD)
\`\`\`

---

*Dashboard generated by render_governance_dashboard.sh v${SCRIPT_VERSION}*
EOF
}

format_flag_badge() {
    local value="$1"
    case "${value}" in
        "true")  echo "🔴 **ENABLED**" ;;
        "false") echo "🟢 Disabled" ;;
        *)       echo "⚪ Unknown" ;;
    esac
}

format_status_badge() {
    local status="$1"
    case "${status}" in
        "pass")  echo "✅ Pass" ;;
        "fail")  echo "❌ Fail" ;;
        *)       echo "⚠️ ${status}" ;;
    esac
}

render_html() {
    local gov_hash="$1"
    local lockfile_meta="$2"
    local state_flags="$3"
    local policy_inventory="$4"
    local validation="$5"

    local tag sha generated_at total_files
    tag=$(echo "${lockfile_meta}" | jq -r '.tag // "none"')
    sha=$(echo "${lockfile_meta}" | jq -r '.sha // "none"' | cut -c1-12)
    generated_at=$(echo "${lockfile_meta}" | jq -r '.generated_at // "unknown"')
    total_files=$(echo "${lockfile_meta}" | jq -r '.total_files // 0')

    local freeze tight override budget
    freeze=$(echo "${state_flags}" | jq -r '.freeze_mode')
    tight=$(echo "${state_flags}" | jq -r '.tight_mode')
    override=$(echo "${state_flags}" | jq -r '.override_active')
    budget=$(echo "${state_flags}" | jq -r '.error_budget_remaining')

    local val_status val_passed val_failed val_warnings
    val_status=$(echo "${validation}" | jq -r '.status // "unknown"')
    val_passed=$(echo "${validation}" | jq -r '.summary.passed // 0')
    val_failed=$(echo "${validation}" | jq -r '.summary.failed // 0')
    val_warnings=$(echo "${validation}" | jq -r '.summary.warnings // 0')

    cat <<EOF
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Governance Dashboard</title>
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
        }

        * { box-sizing: border-box; margin: 0; padding: 0; }

        body {
            font-family: 'SF Mono', 'Monaco', 'Inconsolata', monospace;
            background: var(--bg-primary);
            color: var(--text-primary);
            line-height: 1.6;
            padding: 2rem;
        }

        .container { max-width: 1200px; margin: 0 auto; }

        h1 {
            font-size: 2rem;
            margin-bottom: 0.5rem;
            color: var(--accent-blue);
        }

        .subtitle {
            color: var(--text-secondary);
            font-size: 0.875rem;
            margin-bottom: 2rem;
        }

        .grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
            gap: 1.5rem;
            margin-bottom: 2rem;
        }

        .card {
            background: var(--bg-card);
            border-radius: 8px;
            padding: 1.5rem;
            border: 1px solid rgba(255,255,255,0.1);
        }

        .card h2 {
            font-size: 1rem;
            color: var(--text-secondary);
            text-transform: uppercase;
            letter-spacing: 0.05em;
            margin-bottom: 1rem;
            padding-bottom: 0.5rem;
            border-bottom: 1px solid rgba(255,255,255,0.1);
        }

        .metric {
            display: flex;
            justify-content: space-between;
            padding: 0.5rem 0;
            border-bottom: 1px solid rgba(255,255,255,0.05);
        }

        .metric:last-child { border-bottom: none; }

        .metric-label { color: var(--text-secondary); }

        .metric-value {
            font-weight: bold;
            font-family: monospace;
        }

        .badge {
            display: inline-block;
            padding: 0.25rem 0.75rem;
            border-radius: 4px;
            font-size: 0.75rem;
            font-weight: bold;
        }

        .badge-pass { background: rgba(0, 212, 170, 0.2); color: var(--accent-green); }
        .badge-fail { background: rgba(255, 107, 107, 0.2); color: var(--accent-red); }
        .badge-warn { background: rgba(254, 202, 87, 0.2); color: var(--accent-yellow); }
        .badge-enabled { background: rgba(255, 107, 107, 0.2); color: var(--accent-red); }
        .badge-disabled { background: rgba(0, 212, 170, 0.2); color: var(--accent-green); }

        .hash-display {
            font-family: monospace;
            font-size: 0.875rem;
            background: var(--bg-secondary);
            padding: 0.5rem;
            border-radius: 4px;
            word-break: break-all;
        }

        table {
            width: 100%;
            border-collapse: collapse;
        }

        th, td {
            text-align: left;
            padding: 0.75rem;
            border-bottom: 1px solid rgba(255,255,255,0.1);
        }

        th {
            color: var(--text-secondary);
            font-size: 0.75rem;
            text-transform: uppercase;
        }

        .footer {
            margin-top: 2rem;
            padding-top: 1rem;
            border-top: 1px solid rgba(255,255,255,0.1);
            color: var(--text-secondary);
            font-size: 0.75rem;
            text-align: center;
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>🛡️ Governance Dashboard</h1>
        <p class="subtitle">Generated: $(date -u +%Y-%m-%dT%H:%M:%SZ) | Version: ${SCRIPT_VERSION}</p>

        <div class="grid">
            <div class="card">
                <h2>Governance Hash</h2>
                <div class="hash-display">${gov_hash:0:32}...</div>
                <div class="metric" style="margin-top: 1rem;">
                    <span class="metric-label">Tag</span>
                    <span class="metric-value">${tag}</span>
                </div>
                <div class="metric">
                    <span class="metric-label">SHA</span>
                    <span class="metric-value">${sha}...</span>
                </div>
                <div class="metric">
                    <span class="metric-label">Total Files</span>
                    <span class="metric-value">${total_files}</span>
                </div>
            </div>

            <div class="card">
                <h2>Policy Validation</h2>
                <div class="metric">
                    <span class="metric-label">Status</span>
                    <span class="badge $(get_status_class "${val_status}")">${val_status^^}</span>
                </div>
                <div class="metric">
                    <span class="metric-label">Passed</span>
                    <span class="metric-value" style="color: var(--accent-green);">${val_passed}</span>
                </div>
                <div class="metric">
                    <span class="metric-label">Failed</span>
                    <span class="metric-value" style="color: var(--accent-red);">${val_failed}</span>
                </div>
                <div class="metric">
                    <span class="metric-label">Warnings</span>
                    <span class="metric-value" style="color: var(--accent-yellow);">${val_warnings}</span>
                </div>
            </div>

            <div class="card">
                <h2>State Flags</h2>
                <div class="metric">
                    <span class="metric-label">Freeze Mode</span>
                    <span class="badge $(get_flag_class "${freeze}")">${freeze^^}</span>
                </div>
                <div class="metric">
                    <span class="metric-label">Tight Mode</span>
                    <span class="badge $(get_flag_class "${tight}")">${tight^^}</span>
                </div>
                <div class="metric">
                    <span class="metric-label">Override Active</span>
                    <span class="badge $(get_flag_class "${override}")">${override^^}</span>
                </div>
                <div class="metric">
                    <span class="metric-label">Error Budget</span>
                    <span class="metric-value">${budget}%</span>
                </div>
            </div>
        </div>

        <div class="card">
            <h2>Policy Inventory</h2>
            <table>
                <thead>
                    <tr>
                        <th>Policy File</th>
                        <th>Status</th>
                    </tr>
                </thead>
                <tbody>
$(echo "${policy_inventory}" | jq -r '.[] | "                    <tr><td>\(.file)</td><td><span class=\"badge badge-pass\">Present</span></td></tr>"')
                </tbody>
            </table>
        </div>

        <div class="footer">
            <p>Dashboard generated by render_governance_dashboard.sh v${SCRIPT_VERSION}</p>
            <p>Authority: docs/ci/GOVERNANCE_LOCKFILE.md</p>
        </div>
    </div>
</body>
</html>
EOF
}

get_status_class() {
    local status="$1"
    case "${status}" in
        "pass")  echo "badge-pass" ;;
        "fail")  echo "badge-fail" ;;
        *)       echo "badge-warn" ;;
    esac
}

get_flag_class() {
    local value="$1"
    case "${value}" in
        "true")  echo "badge-enabled" ;;
        "false") echo "badge-disabled" ;;
        *)       echo "badge-warn" ;;
    esac
}

render_json() {
    local gov_hash="$1"
    local lockfile_meta="$2"
    local state_flags="$3"
    local policy_inventory="$4"
    local validation="$5"

    jq -n \
        --arg version "${SCRIPT_VERSION}" \
        --arg generated "$(date -u +%Y-%m-%dT%H:%M:%SZ)" \
        --arg gov_hash "${gov_hash}" \
        --argjson lockfile "${lockfile_meta}" \
        --argjson state "${state_flags}" \
        --argjson policies "${policy_inventory}" \
        --argjson validation "${validation}" \
        '{
            version: $version,
            generated_at: $generated,
            governance_hash: $gov_hash,
            lockfile: $lockfile,
            state_flags: $state,
            policy_inventory: $policies,
            validation: $validation
        }'
}

# --- Main ---
main() {
    local out_file=""
    local format="md"
    local verbose=false

    # Parse arguments
    while [[ $# -gt 0 ]]; do
        case $1 in
            --out-file)
                out_file="$2"
                shift 2
                ;;
            --format)
                format="$2"
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

    # Validate format
    case "${format}" in
        md|html|json) ;;
        *)
            log_error "Invalid format: ${format}. Must be md, html, or json."
            exit 1
            ;;
    esac

    [[ "${verbose}" == "true" ]] && log_info "Collecting governance data..."

    # Collect data
    local gov_hash lockfile_meta state_flags policy_inventory validation
    gov_hash=$(get_governance_hash)
    lockfile_meta=$(get_lockfile_metadata)
    state_flags=$(get_state_flags)
    policy_inventory=$(get_policy_inventory)
    validation=$(run_validation)

    [[ "${verbose}" == "true" ]] && log_info "Rendering ${format} output..."

    # Render output
    local output
    case "${format}" in
        md)   output=$(render_markdown "${gov_hash}" "${lockfile_meta}" "${state_flags}" "${policy_inventory}" "${validation}") ;;
        html) output=$(render_html "${gov_hash}" "${lockfile_meta}" "${state_flags}" "${policy_inventory}" "${validation}") ;;
        json) output=$(render_json "${gov_hash}" "${lockfile_meta}" "${state_flags}" "${policy_inventory}" "${validation}") ;;
    esac

    # Write output
    if [[ -n "${out_file}" ]]; then
        mkdir -p "$(dirname "${out_file}")"
        echo "${output}" > "${out_file}"
        [[ "${verbose}" == "true" ]] && log_info "Dashboard written to: ${out_file}"
    else
        echo "${output}"
    fi
}

main "$@"
