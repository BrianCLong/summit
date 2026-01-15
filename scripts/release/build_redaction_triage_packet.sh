#!/usr/bin/env bash
# build_redaction_triage_packet.sh v1.0.0
# Generates a triage packet when redaction health is WARN or FAIL
#
# The packet contains everything needed to diagnose and remediate
# redaction issues quickly: reports, policy snapshots, diffs, and
# a standardized remediation checklist.
#
# Authority: docs/ci/REDACTION_TRIAGE_PACKET.md

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

Generates a triage packet for redaction issues.

OPTIONS:
    --run-id ID         GitHub workflow run ID
    --site-dir DIR      Site build directory (default: site/release-ops)
    --out-dir DIR       Output directory for packet
    --policy FILE       Redaction policy file
    --alert-policy FILE Alert policy file (optional)
    --verbose           Enable verbose logging
    --help              Show this help message

EXAMPLES:
    # Generate packet for a failed run
    $0 --run-id 20806007405 --site-dir site/release-ops --out-dir artifacts/triage

    # Generate with custom policies
    $0 --run-id 12345 --policy docs/ci/REDACTION_POLICY.yml
EOF
}

# --- Packet Generation ---

generate_manifest() {
    local out_dir="$1"
    local run_id="$2"
    local timestamp
    local git_sha

    timestamp=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
    git_sha=$(git rev-parse HEAD 2>/dev/null || echo "unknown")

    cat > "${out_dir}/manifest.json" <<EOF
{
  "version": "1.0",
  "type": "redaction_triage_packet",
  "generated_at": "${timestamp}",
  "run_id": ${run_id:-null},
  "git_sha": "${git_sha}",
  "contents": [
    "manifest.json",
    "remediation_checklist.md",
    "reports/",
    "policies/",
    "diffs/"
  ]
}
EOF
}

generate_remediation_checklist() {
    local out_dir="$1"
    local run_id="$2"
    local health_level="${3:-UNKNOWN}"
    local timestamp
    timestamp=$(date -u +"%Y-%m-%dT%H:%M:%SZ")

    cat > "${out_dir}/remediation_checklist.md" <<EOF
# Redaction Triage Checklist

**Generated:** ${timestamp}
**Run ID:** ${run_id:-N/A}
**Health Level:** ${health_level}

---

## Immediate Actions

### 1. Confirm the Issue

- [ ] Review \`reports/redaction_health.json\` for the triggered level
- [ ] Check \`reports/redaction_alert_report.json\` for specific triggers
- [ ] Note which threshold(s) fired:
  - \`forbidden_hits > 0\` → FAIL (blocking)
  - Threshold exceeded → WARN (review needed)

### 2. Run Local Tests

\`\`\`bash
# Run the full redaction test suite
scripts/release/tests/redaction_layer.test.sh --verbose

# Verify a specific file
scripts/release/redact_release_ops_content.sh \\
  --in <input_file> \\
  --verify-only
\`\`\`

### 3. Check Recent Changes

- [ ] Review recent commits to:
  - \`docs/ci/REDACTION_POLICY.yml\`
  - \`scripts/release/redact_release_ops_content.sh\`
  - \`docs/ci/PAGES_PUBLISH_ALLOWLIST.md\`
- [ ] Check \`diffs/\` folder for policy diffs (if available)

### 4. Identify Root Cause

**For FAIL (forbidden_hits > 0):**
- [ ] Which pattern was detected?
- [ ] Is it a new pattern type not covered by policy?
- [ ] Is the sanitizer not handling a section correctly?

**For WARN (threshold exceeded):**
- [ ] Is the content legitimately larger (new features, more blockers)?
- [ ] Should thresholds be adjusted? (requires justification)
- [ ] Is there duplicate/unexpected content?

### 5. Apply Fix

- [ ] Update \`REDACTION_POLICY.yml\` if new patterns needed
- [ ] Update \`redact_release_ops_content.sh\` if sanitizer logic needs fixing
- [ ] Run local tests again to verify fix

### 6. Re-deploy

- [ ] Push fix to branch
- [ ] Wait for redaction tests to pass
- [ ] Re-run Pages publish workflow:
  \`\`\`bash
  gh workflow run publish-release-ops-pages.yml
  \`\`\`
- [ ] Verify Pages site updated correctly

---

## Escalation

If you cannot resolve the issue:

1. Create an issue with label \`redaction-alert\`
2. Include this triage packet as attachment
3. Tag \`@platform-team\` for assistance

---

## Reference Links

- [Redaction Policy](../../docs/ci/REDACTION_POLICY.yml)
- [Redaction Documentation](../../docs/ci/RELEASE_OPS_REDACTION.md)
- [Pages Allowlist](../../docs/ci/PAGES_PUBLISH_ALLOWLIST.md)
EOF

    if [[ -n "${run_id}" ]]; then
        cat >> "${out_dir}/remediation_checklist.md" <<EOF
- [Workflow Run](https://github.com/\${GITHUB_REPOSITORY}/actions/runs/${run_id})
EOF
    fi
}

collect_reports() {
    local site_dir="$1"
    local out_dir="$2"
    local verbose="$3"

    mkdir -p "${out_dir}/reports"

    # Collect available reports
    local reports=(
        "redaction_health.json"
        "redaction_alert_report.json"
        "redaction_alert_report.md"
        "redaction_diff_report.json"
        "redaction_diff_report.md"
        "dashboard_summary.json"
    )

    for report in "${reports[@]}"; do
        if [[ -f "${site_dir}/${report}" ]]; then
            cp "${site_dir}/${report}" "${out_dir}/reports/"
            [[ "${verbose}" == "true" ]] && log_info "Collected: ${report}"
        fi
    done

    # Also check artifacts dir
    local artifacts_dir="${site_dir}/../release-train"
    if [[ -d "${artifacts_dir}" ]]; then
        for report in site_safety_report.json site_safety_report.md; do
            if [[ -f "${artifacts_dir}/${report}" ]]; then
                cp "${artifacts_dir}/${report}" "${out_dir}/reports/"
                [[ "${verbose}" == "true" ]] && log_info "Collected: ${report}"
            fi
        done
    fi
}

collect_policies() {
    local policy_file="$1"
    local alert_policy="$2"
    local out_dir="$3"
    local verbose="$4"

    mkdir -p "${out_dir}/policies"

    # Copy current policies
    if [[ -f "${policy_file}" ]]; then
        cp "${policy_file}" "${out_dir}/policies/REDACTION_POLICY.yml"
        [[ "${verbose}" == "true" ]] && log_info "Collected: REDACTION_POLICY.yml"
    fi

    if [[ -n "${alert_policy}" ]] && [[ -f "${alert_policy}" ]]; then
        cp "${alert_policy}" "${out_dir}/policies/REDACTION_ALERT_POLICY.yml"
        [[ "${verbose}" == "true" ]] && log_info "Collected: REDACTION_ALERT_POLICY.yml"
    fi

    # Copy allowlist
    local allowlist="${REPO_ROOT}/docs/ci/PAGES_PUBLISH_ALLOWLIST.md"
    if [[ -f "${allowlist}" ]]; then
        cp "${allowlist}" "${out_dir}/policies/"
        [[ "${verbose}" == "true" ]] && log_info "Collected: PAGES_PUBLISH_ALLOWLIST.md"
    fi
}

generate_policy_diffs() {
    local policy_file="$1"
    local out_dir="$2"
    local verbose="$3"

    mkdir -p "${out_dir}/diffs"

    # Try to generate diffs from git history
    if ! command -v git &>/dev/null; then
        echo "Git not available - diffs not generated" > "${out_dir}/diffs/README.txt"
        return 0
    fi

    # Check if we're in a git repo
    if ! git rev-parse --git-dir &>/dev/null; then
        echo "Not in a git repository - diffs not generated" > "${out_dir}/diffs/README.txt"
        return 0
    fi

    # Generate diff for redaction policy
    if [[ -f "${policy_file}" ]]; then
        local rel_path
        rel_path=$(realpath --relative-to="${REPO_ROOT}" "${policy_file}" 2>/dev/null || basename "${policy_file}")

        git diff HEAD~5..HEAD -- "${rel_path}" > "${out_dir}/diffs/redaction_policy.diff" 2>/dev/null || true

        if [[ ! -s "${out_dir}/diffs/redaction_policy.diff" ]]; then
            echo "No changes in last 5 commits" > "${out_dir}/diffs/redaction_policy.diff"
        fi

        [[ "${verbose}" == "true" ]] && log_info "Generated: redaction_policy.diff"
    fi

    # Generate diff for redaction script
    local script_path="${REPO_ROOT}/scripts/release/redact_release_ops_content.sh"
    if [[ -f "${script_path}" ]]; then
        git diff HEAD~5..HEAD -- "scripts/release/redact_release_ops_content.sh" > "${out_dir}/diffs/redaction_script.diff" 2>/dev/null || true

        if [[ ! -s "${out_dir}/diffs/redaction_script.diff" ]]; then
            echo "No changes in last 5 commits" > "${out_dir}/diffs/redaction_script.diff"
        fi

        [[ "${verbose}" == "true" ]] && log_info "Generated: redaction_script.diff"
    fi

    # Generate diff for allowlist
    git diff HEAD~5..HEAD -- "docs/ci/PAGES_PUBLISH_ALLOWLIST.md" > "${out_dir}/diffs/allowlist.diff" 2>/dev/null || true

    if [[ ! -s "${out_dir}/diffs/allowlist.diff" ]]; then
        echo "No changes in last 5 commits" > "${out_dir}/diffs/allowlist.diff"
    fi
}

add_test_commands() {
    local out_dir="$1"

    cat > "${out_dir}/run_tests.sh" <<'EOF'
#!/usr/bin/env bash
# Quick test runner for triage
set -euo pipefail

REPO_ROOT="$(git rev-parse --show-toplevel)"

echo "=== Running Redaction Tests ==="
"${REPO_ROOT}/scripts/release/tests/redaction_layer.test.sh" --verbose

echo ""
echo "=== Verifying Sample File ==="
if [[ -f "reports/redaction_health.json" ]]; then
    "${REPO_ROOT}/scripts/release/redact_release_ops_content.sh" \
        --in reports/redaction_health.json \
        --verify-only \
        --policy "${REPO_ROOT}/docs/ci/REDACTION_POLICY.yml"
fi

echo ""
echo "Tests complete."
EOF

    chmod +x "${out_dir}/run_tests.sh"
}

create_archive() {
    local out_dir="$1"
    local archive_name="$2"
    local verbose="$3"

    local parent_dir
    parent_dir=$(dirname "${out_dir}")
    local dir_name
    dir_name=$(basename "${out_dir}")

    if command -v tar &>/dev/null; then
        tar -czf "${parent_dir}/${archive_name}.tar.gz" -C "${parent_dir}" "${dir_name}"
        [[ "${verbose}" == "true" ]] && log_info "Created archive: ${archive_name}.tar.gz"
    fi
}

# --- Main ---
main() {
    local run_id=""
    local site_dir="site/release-ops"
    local out_dir=""
    local policy_file="${REPO_ROOT}/docs/ci/REDACTION_POLICY.yml"
    local alert_policy="${REPO_ROOT}/docs/ci/REDACTION_ALERT_POLICY.yml"
    local verbose=false

    # Parse arguments
    while [[ $# -gt 0 ]]; do
        case $1 in
            --run-id)
                run_id="$2"
                shift 2
                ;;
            --site-dir)
                site_dir="$2"
                shift 2
                ;;
            --out-dir)
                out_dir="$2"
                shift 2
                ;;
            --policy)
                policy_file="$2"
                shift 2
                ;;
            --alert-policy)
                alert_policy="$2"
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

    # Set default output directory
    if [[ -z "${out_dir}" ]]; then
        local timestamp
        timestamp=$(date -u +%Y-%m-%d)
        out_dir="artifacts/redaction-triage/${timestamp}-${run_id:-unknown}"
    fi

    log_info "Building redaction triage packet..."
    log_info "  Run ID: ${run_id:-N/A}"
    log_info "  Site dir: ${site_dir}"
    log_info "  Output: ${out_dir}"

    # Create output directory
    mkdir -p "${out_dir}"

    # Read health level if available
    local health_level="UNKNOWN"
    local health_json="${site_dir}/redaction_health.json"
    if [[ -f "${health_json}" ]] && command -v jq &>/dev/null; then
        health_level=$(jq -r '.level // "UNKNOWN"' "${health_json}" 2>/dev/null || echo "UNKNOWN")
    fi

    log_info "  Health level: ${health_level}"

    # Generate packet contents
    generate_manifest "${out_dir}" "${run_id}"
    generate_remediation_checklist "${out_dir}" "${run_id}" "${health_level}"
    collect_reports "${site_dir}" "${out_dir}" "${verbose}"
    collect_policies "${policy_file}" "${alert_policy}" "${out_dir}" "${verbose}"
    generate_policy_diffs "${policy_file}" "${out_dir}" "${verbose}"
    add_test_commands "${out_dir}"

    # Create archive
    local archive_name="redaction-triage-${run_id:-$(date -u +%Y%m%d%H%M%S)}"
    create_archive "${out_dir}" "${archive_name}" "${verbose}"

    # Summary
    echo ""
    log_info "=== Triage Packet Complete ==="
    log_info "Directory: ${out_dir}"
    log_info "Contents:"
    ls -la "${out_dir}/"

    echo ""
    log_info "Next steps:"
    log_info "  1. Review remediation_checklist.md"
    log_info "  2. Check reports/ for alert details"
    log_info "  3. Review diffs/ for recent policy changes"
    log_info "  4. Run ./run_tests.sh to verify locally"
}

main "$@"
