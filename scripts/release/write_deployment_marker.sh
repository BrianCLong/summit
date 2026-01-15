#!/usr/bin/env bash
# write_deployment_marker.sh v1.0.0
# Generates deployment status marker for the Pages site
#
# The marker provides at-a-glance visibility into:
# - Deployment status (OK, WARN, ROLLED_BACK)
# - Source run ID and snapshot ID
# - Git SHA and timestamp
# - Health level at time of deployment
#
# This information helps viewers understand what they're seeing
# and whether the content is current or from a rollback.
#
# Authority: docs/ci/PAGES_ROLLBACK.md

set -euo pipefail

# --- Configuration ---
SCRIPT_VERSION="1.0.0"

# --- Logging ---
log_info() {
    echo "[INFO] $*" >&2
}

log_error() {
    echo "[ERROR] $*" >&2
}

# --- Usage ---
print_usage() {
    cat <<EOF
Usage: $0 [OPTIONS]

Generates deployment status marker for Pages site.

OPTIONS:
    --site-dir DIR          Output directory (default: site/release-ops)
    --status STATUS         Deployment status: OK, WARN, ROLLED_BACK
    --run-id ID             Source workflow run ID
    --snapshot-id ID        Snapshot ID (for ROLLED_BACK status)
    --health-level LEVEL    Redaction health level: OK, WARN, FAIL
    --git-sha SHA           Git commit SHA
    --governance-hash HASH  SHA256 of governance lockfile (optional)
    --verbose               Enable verbose logging
    --help                  Show this help message

EXAMPLES:
    # Normal deployment
    $0 --site-dir site/release-ops \\
       --status OK \\
       --run-id 20806007405 \\
       --health-level OK \\
       --git-sha abc123

    # Rollback deployment
    $0 --site-dir site/release-ops \\
       --status ROLLED_BACK \\
       --run-id 20806007405 \\
       --snapshot-id 20260107-093000-20805900123 \\
       --health-level FAIL \\
       --git-sha abc123
EOF
}

# --- Marker Generation ---

generate_marker() {
    local site_dir="$1"
    local status="$2"
    local run_id="$3"
    local snapshot_id="$4"
    local health_level="$5"
    local git_sha="$6"
    local governance_hash="$7"
    local verbose="$8"

    local timestamp
    timestamp=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
    local date_utc
    date_utc=$(date -u +"%Y-%m-%d %H:%M UTC")

    # Determine status emoji and description
    local status_emoji
    local status_desc

    case "${status}" in
        OK)
            status_emoji="✅"
            status_desc="Current build deployed successfully"
            ;;
        WARN)
            status_emoji="⚠️"
            status_desc="Current build deployed with warnings"
            ;;
        ROLLED_BACK)
            status_emoji="🔄"
            status_desc="Rolled back to previous known-good snapshot"
            ;;
        *)
            status_emoji="❓"
            status_desc="Unknown deployment status"
            ;;
    esac

    # Generate JSON marker
    cat > "${site_dir}/deployment_marker.json" <<EOF
{
  "version": "1.1",
  "type": "deployment_marker",
  "status": "${status}",
  "status_emoji": "${status_emoji}",
  "status_description": "${status_desc}",
  "timestamp": "${timestamp}",
  "date_display": "${date_utc}",
  "run_id": ${run_id:-null},
  "snapshot_id": ${snapshot_id:+\"${snapshot_id}\"}${snapshot_id:-null},
  "health_level": "${health_level}",
  "git_sha": "${git_sha:-unknown}",
  "governance_hash": ${governance_hash:+\"${governance_hash}\"}${governance_hash:-null},
  "script_version": "${SCRIPT_VERSION}"
}
EOF

    [[ "${verbose}" == "true" ]] && log_info "Generated: deployment_marker.json"

    # Generate HTML snippet for embedding
    local rollback_info=""
    if [[ "${status}" == "ROLLED_BACK" ]]; then
        rollback_info="<div class=\"marker-detail\">Snapshot: <code>${snapshot_id}</code></div>"
    fi

    cat > "${site_dir}/deployment_marker.html" <<EOF
<!-- Deployment Status Marker - Auto-generated -->
<div class="deployment-marker marker-${status,,}">
    <div class="marker-status">
        <span class="marker-emoji">${status_emoji}</span>
        <span class="marker-label">${status}</span>
    </div>
    <div class="marker-info">
        <div class="marker-detail">Deployed: ${date_utc}</div>
        <div class="marker-detail">Run: <a href="../../actions/runs/${run_id:-0}">#${run_id:-N/A}</a></div>
        <div class="marker-detail">Health: ${health_level}</div>
        ${rollback_info}
        <div class="marker-detail marker-sha">SHA: <code>${git_sha:0:7}</code></div>
        $(if [[ -n "${governance_hash}" ]]; then echo "<div class=\"marker-detail marker-gov\">Gov: <code>${governance_hash:0:12}</code></div>"; fi)
    </div>
</div>
<style>
.deployment-marker {
    display: flex;
    align-items: center;
    gap: 16px;
    padding: 12px 16px;
    border-radius: 6px;
    font-size: 14px;
    margin-bottom: 16px;
}
.marker-ok {
    background: #dafbe1;
    border: 1px solid #1a7f37;
    color: #1a7f37;
}
.marker-warn {
    background: #fff8c5;
    border: 1px solid #d4a72c;
    color: #9a6700;
}
.marker-rolled_back {
    background: #ddf4ff;
    border: 1px solid #54aeff;
    color: #0969da;
}
.marker-status {
    display: flex;
    align-items: center;
    gap: 8px;
    font-weight: 600;
}
.marker-emoji {
    font-size: 18px;
}
.marker-info {
    display: flex;
    flex-wrap: wrap;
    gap: 8px 16px;
    font-size: 12px;
    opacity: 0.9;
}
.marker-detail code {
    background: rgba(0,0,0,0.1);
    padding: 2px 6px;
    border-radius: 3px;
    font-family: monospace;
}
.marker-detail a {
    color: inherit;
}
@media (prefers-color-scheme: dark) {
    .marker-ok {
        background: #1a4d2e;
        border-color: #3fb950;
        color: #3fb950;
    }
    .marker-warn {
        background: #3d2e00;
        border-color: #d29922;
        color: #d29922;
    }
    .marker-rolled_back {
        background: #0d2d4d;
        border-color: #58a6ff;
        color: #58a6ff;
    }
    .marker-detail code {
        background: rgba(255,255,255,0.1);
    }
}
</style>
EOF

    [[ "${verbose}" == "true" ]] && log_info "Generated: deployment_marker.html"

    if [[ -n "${governance_hash}" ]]; then
        log_info "Deployment marker generated: status=${status}, run=${run_id:-N/A}, gov=${governance_hash:0:12}"
    else
        log_info "Deployment marker generated: status=${status}, run=${run_id:-N/A}"
    fi
}

# --- Main ---
main() {
    local site_dir="site/release-ops"
    local status=""
    local run_id=""
    local snapshot_id=""
    local health_level="UNKNOWN"
    local git_sha=""
    local governance_hash=""
    local verbose=false

    # Parse arguments
    while [[ $# -gt 0 ]]; do
        case $1 in
            --site-dir)
                site_dir="$2"
                shift 2
                ;;
            --status)
                status="$2"
                shift 2
                ;;
            --run-id)
                run_id="$2"
                shift 2
                ;;
            --snapshot-id)
                snapshot_id="$2"
                shift 2
                ;;
            --health-level)
                health_level="$2"
                shift 2
                ;;
            --git-sha)
                git_sha="$2"
                shift 2
                ;;
            --governance-hash)
                governance_hash="$2"
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
    if [[ -z "${status}" ]]; then
        log_error "Missing required --status"
        print_usage
        exit 1
    fi

    # Auto-detect git SHA if not provided
    if [[ -z "${git_sha}" ]]; then
        git_sha=$(git rev-parse HEAD 2>/dev/null || echo "unknown")
    fi

    # Ensure site directory exists
    mkdir -p "${site_dir}"

    # Auto-detect governance hash if not provided and lockfile exists
    if [[ -z "${governance_hash}" ]]; then
        local repo_root
        repo_root=$(git rev-parse --show-toplevel 2>/dev/null || echo "")
        if [[ -n "${repo_root}" && -f "${repo_root}/docs/releases/_state/governance_lockfile.json" ]]; then
            governance_hash=$(sha256sum "${repo_root}/docs/releases/_state/governance_lockfile.json" 2>/dev/null | cut -d' ' -f1 || echo "")
        fi
    fi

    generate_marker \
        "${site_dir}" \
        "${status}" \
        "${run_id}" \
        "${snapshot_id}" \
        "${health_level}" \
        "${git_sha}" \
        "${governance_hash}" \
        "${verbose}"
}

main "$@"
