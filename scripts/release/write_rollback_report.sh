#!/usr/bin/env bash
# write_rollback_report.sh v1.0.0
# Generates rollback report when Pages deployment uses a previous snapshot
#
# This script creates a human-readable report and machine-readable JSON
# documenting that a rollback occurred, including:
# - Failed run ID
# - Restored snapshot ID
# - Reason for rollback
# - Timestamp
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

Generates rollback report for Pages deployment.

OPTIONS:
    --site-dir DIR          Output directory for reports (default: site/release-ops)
    --failed-run-id ID      GitHub run ID that failed
    --snapshot-id ID        Restored snapshot ID
    --reason REASON         Reason category: redaction_fail, site_safety_fail, manual
    --reason-detail TEXT    Additional detail about the failure
    --verbose               Enable verbose logging
    --help                  Show this help message

EXAMPLES:
    # Generate rollback report for redaction failure
    $0 --site-dir site/release-ops \\
       --failed-run-id 20806007405 \\
       --snapshot-id 20260108-123456-20806000001 \\
       --reason redaction_fail \\
       --reason-detail "forbidden_hits_gt_0"
EOF
}

# --- Report Generation ---

generate_rollback_report() {
    local site_dir="$1"
    local failed_run_id="$2"
    local snapshot_id="$3"
    local reason="$4"
    local reason_detail="$5"
    local verbose="$6"

    local timestamp
    timestamp=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
    local date_utc
    date_utc=$(date -u +"%Y-%m-%d")

    # Create JSON report (counts-only, no sensitive data)
    cat > "${site_dir}/rollback_report.json" <<EOF
{
  "version": "1.0",
  "type": "rollback_report",
  "rollback": true,
  "timestamp": "${timestamp}",
  "date_utc": "${date_utc}",
  "failed_run_id": ${failed_run_id:-null},
  "restored_snapshot_id": "${snapshot_id}",
  "reason": "${reason}",
  "reason_detail": "${reason_detail:-none}",
  "script_version": "${SCRIPT_VERSION}"
}
EOF

    [[ "${verbose}" == "true" ]] && log_info "Generated: rollback_report.json"

    # Determine emoji and status text based on reason
    local emoji="🔄"
    local status_text="Rollback Active"
    local reason_text=""

    case "${reason}" in
        redaction_fail)
            emoji="🛡️"
            status_text="Rollback: Redaction Safety"
            reason_text="Forbidden patterns were detected in the latest build. The site has been rolled back to the last known-good snapshot to prevent accidental exposure of sensitive content."
            ;;
        site_safety_fail)
            emoji="⚠️"
            status_text="Rollback: Safety Gate Failed"
            reason_text="The site safety verification failed. The site has been rolled back to the last known-good snapshot."
            ;;
        manual)
            emoji="👤"
            status_text="Rollback: Manual"
            reason_text="A manual rollback was triggered. The site has been restored to a previous snapshot."
            ;;
        *)
            reason_text="An issue was detected with the latest build. The site has been rolled back to ensure availability and safety."
            ;;
    esac

    # Create Markdown report
    cat > "${site_dir}/rollback_report.md" <<EOF
# ${emoji} ${status_text}

**Date:** ${date_utc}
**Time:** ${timestamp}

---

## What Happened

${reason_text}

| Field | Value |
|-------|-------|
| Failed Run ID | ${failed_run_id:-N/A} |
| Restored Snapshot | \`${snapshot_id}\` |
| Reason | \`${reason}\` |
| Detail | ${reason_detail:-none} |

---

## Current Site Status

This site is currently showing content from a **previous known-good snapshot**.

The content may be slightly out of date compared to the latest orchestrator run, but it is verified to be safe for public visibility.

---

## For Operators

### View the Failure

EOF

    if [[ -n "${failed_run_id}" ]]; then
        cat >> "${site_dir}/rollback_report.md" <<EOF
- [View Failed Workflow Run](../../actions/runs/${failed_run_id})
- Download the \`redaction-triage-*\` artifact for diagnostic details
EOF
    else
        echo "- Failed run ID not available" >> "${site_dir}/rollback_report.md"
    fi

    cat >> "${site_dir}/rollback_report.md" <<EOF

### Remediation Steps

1. **Review the triage packet** attached to the failed workflow run
2. **Identify the root cause** using \`remediation_checklist.md\`
3. **Fix the issue** (update redaction policy, fix content, etc.)
4. **Re-run the orchestrator** workflow
5. When the run succeeds with OK/WARN health, a new snapshot will be stored and deployed

### Manual Snapshot Restore

To manually restore a different snapshot:

\`\`\`bash
# List available snapshots
git fetch origin release-ops-pages-snapshots
git log release-ops-pages-snapshots --oneline

# Restore specific snapshot
./scripts/release/store_pages_snapshot.sh \\
  --mode restore \\
  --site-dir site/release-ops
\`\`\`

---

## References

- [Pages Rollback Documentation](../../docs/ci/PAGES_ROLLBACK.md)
- [Redaction Triage Guide](../../docs/ci/REDACTION_TRIAGE_PACKET.md)
- [Redaction Health Documentation](../../docs/ci/REDACTION_HEALTH.md)

---

*This report was automatically generated at ${timestamp}*
EOF

    [[ "${verbose}" == "true" ]] && log_info "Generated: rollback_report.md"

    log_info "Rollback report generated in ${site_dir}"
}

# --- Main ---
main() {
    local site_dir="site/release-ops"
    local failed_run_id=""
    local snapshot_id=""
    local reason="unknown"
    local reason_detail=""
    local verbose=false

    # Parse arguments
    while [[ $# -gt 0 ]]; do
        case $1 in
            --site-dir)
                site_dir="$2"
                shift 2
                ;;
            --failed-run-id)
                failed_run_id="$2"
                shift 2
                ;;
            --snapshot-id)
                snapshot_id="$2"
                shift 2
                ;;
            --reason)
                reason="$2"
                shift 2
                ;;
            --reason-detail)
                reason_detail="$2"
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
    if [[ -z "${snapshot_id}" ]]; then
        log_error "Missing required --snapshot-id"
        print_usage
        exit 1
    fi

    # Ensure site directory exists
    mkdir -p "${site_dir}"

    log_info "Generating rollback report..."
    log_info "  Site dir: ${site_dir}"
    log_info "  Failed run: ${failed_run_id:-N/A}"
    log_info "  Snapshot: ${snapshot_id}"
    log_info "  Reason: ${reason}"

    generate_rollback_report \
        "${site_dir}" \
        "${failed_run_id}" \
        "${snapshot_id}" \
        "${reason}" \
        "${reason_detail}" \
        "${verbose}"
}

main "$@"
