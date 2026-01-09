#!/usr/bin/env bash
# generate_release_train_dashboard.sh v1.0.0
# Generates a policy-driven Release Train Dashboard
#
# Uses the same REQUIRED_CHECKS_POLICY.yml + base-selection + verify-green-for-tag
# logic as RC/GA pipelines to compute promotability for all release candidates.
#
# Authority: docs/ci/RELEASE_TRAIN_DASHBOARD.md
# Policy: docs/ci/REQUIRED_CHECKS_POLICY.yml
#
# Outputs:
#   - docs/releases/RELEASE_TRAIN_DASHBOARD.md (human-readable)
#   - artifacts/release-train/dashboard.json (machine-readable)

set -euo pipefail

# --- Configuration ---
SCRIPT_VERSION="1.0.0"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(git rev-parse --show-toplevel 2>/dev/null || echo ".")"

# Output paths
DASHBOARD_MD="${REPO_ROOT}/docs/releases/RELEASE_TRAIN_DASHBOARD.md"
DASHBOARD_JSON_DIR="${REPO_ROOT}/artifacts/release-train"
DASHBOARD_JSON="${DASHBOARD_JSON_DIR}/dashboard.json"

# Policy paths
POLICY_FILE_YAML="${REPO_ROOT}/docs/ci/REQUIRED_CHECKS_POLICY.yml"
POLICY_FILE_JSON="${REPO_ROOT}/docs/ci/REQUIRED_CHECKS_POLICY.json"

# Scripts
VERIFY_GREEN_SCRIPT="${SCRIPT_DIR}/verify-green-for-tag.sh"
COMPUTE_BASE_SCRIPT="${SCRIPT_DIR}/compute_base_for_commit.sh"

# Temporary directory for intermediate files
TMP_DIR=""

# --- Color output ---
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# --- Logging ---
log_info() {
    echo -e "${BLUE}[INFO]${NC} $*" >&2
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $*" >&2
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $*" >&2
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $*" >&2
}

# --- Helper functions ---
print_usage() {
    cat <<EOF
Usage: $0 [OPTIONS]

Generates a Release Train Dashboard showing promotability status for all
release candidates using the same policy engine as RC/GA pipelines.

OPTIONS:
    --output-dir DIR     Override output directory for dashboard.json
    --skip-api           Skip GitHub API calls (use cached/offline data)
    --verbose            Enable verbose logging
    --dry-run            Show what would be generated without writing files
    --help               Show this help message

OUTPUTS:
    docs/releases/RELEASE_TRAIN_DASHBOARD.md   Human-readable dashboard
    artifacts/release-train/dashboard.json     Machine-readable for automation

EXAMPLES:
    # Generate dashboard with live GitHub data
    $0

    # Generate dashboard in dry-run mode
    $0 --dry-run --verbose

    # Generate with custom output directory
    $0 --output-dir /tmp/dashboard

EOF
}

cleanup() {
    if [[ -n "${TMP_DIR}" ]] && [[ -d "${TMP_DIR}" ]]; then
        rm -rf "${TMP_DIR}"
    fi
}

check_dependencies() {
    local missing=()

    if ! command -v jq &> /dev/null; then
        missing+=("jq")
    fi

    if ! command -v gh &> /dev/null; then
        missing+=("gh (GitHub CLI)")
    fi

    if ! command -v git &> /dev/null; then
        missing+=("git")
    fi

    if [[ ${#missing[@]} -gt 0 ]]; then
        log_error "Missing required dependencies: ${missing[*]}"
        exit 2
    fi

    # Check gh auth (warn but don't fail - we can degrade gracefully)
    if ! gh auth status &> /dev/null 2>&1; then
        log_warn "GitHub CLI not authenticated - API calls may fail"
        log_warn "Run: gh auth login"
    fi

    # Check for verify-green-for-tag.sh
    if [[ ! -x "${VERIFY_GREEN_SCRIPT}" ]]; then
        log_error "verify-green-for-tag.sh not found or not executable: ${VERIFY_GREEN_SCRIPT}"
        exit 2
    fi
}

get_repo_info() {
    local remote_url
    remote_url=$(git remote get-url origin 2>/dev/null || echo "")

    if [[ "${remote_url}" =~ github\.com[:/]([^/]+)/([^/\.]+) ]]; then
        echo "${BASH_REMATCH[1]}/${BASH_REMATCH[2]}"
    else
        echo "unknown/unknown"
    fi
}

# --- Data Collection ---
get_main_head() {
    git rev-parse origin/main 2>/dev/null || git rev-parse main 2>/dev/null || echo ""
}

get_release_branches() {
    # Get all release/* branches
    git branch -r --list 'origin/release/*' 2>/dev/null | sed 's/origin\///' | tr -d ' ' || echo ""
}

get_rc_tags() {
    # Get all RC tags sorted by version
    git tag -l 'v*-rc.*' --sort=-v:refname 2>/dev/null || echo ""
}

get_ga_tags() {
    # Get all GA tags (no -rc suffix) sorted by version
    git tag -l 'v[0-9]*.[0-9]*.[0-9]*' --sort=-v:refname 2>/dev/null | grep -v '\-' || echo ""
}

get_latest_rc_per_version() {
    # For each version line (e.g., v4.1), get the latest RC
    local rc_tags
    rc_tags=$(get_rc_tags)

    local seen_versions=()
    local result=()

    while IFS= read -r tag; do
        [[ -z "${tag}" ]] && continue

        # Extract version prefix (e.g., v4.1 from v4.1.2-rc.3)
        local version_prefix
        version_prefix=$(echo "${tag}" | sed -E 's/^(v[0-9]+\.[0-9]+)\..*/\1/')

        # Skip if we've already seen this version
        local seen=false
        for v in "${seen_versions[@]:-}"; do
            if [[ "${v}" == "${version_prefix}" ]]; then
                seen=true
                break
            fi
        done

        if [[ "${seen}" == "false" ]]; then
            seen_versions+=("${version_prefix}")
            result+=("${tag}")
        fi
    done <<< "${rc_tags}"

    printf '%s\n' "${result[@]:-}"
}

get_tag_commit() {
    local tag="$1"
    git rev-parse "${tag}^{commit}" 2>/dev/null || echo ""
}

get_changed_files() {
    local base="$1"
    local commit="$2"

    git diff --name-only "${base}..${commit}" 2>/dev/null || \
        git diff-tree --no-commit-id --name-only -r "${commit}" 2>/dev/null || \
        echo ""
}

# --- Workflow Status Fetching ---
fetch_workflow_status() {
    local commit="$1"
    local repo="$2"
    local output_file="$3"

    log_info "Fetching workflow status for ${commit:0:7}..."

    # Try to fetch from GitHub API
    if gh run list \
        --repo "${repo}" \
        --commit "${commit}" \
        --json name,conclusion,status,workflowName \
        --limit 100 > "${output_file}.tmp" 2>/dev/null; then

        # Convert to status map format: {"Workflow Name": "success", ...}
        jq 'map({key: (.workflowName // .name), value: (.conclusion // .status // "unknown")}) |
            from_entries' "${output_file}.tmp" > "${output_file}"
        rm -f "${output_file}.tmp"
        return 0
    else
        log_warn "Failed to fetch workflow status for ${commit:0:7}"
        # Create empty status map
        echo '{}' > "${output_file}"
        return 1
    fi
}

# --- Candidate Evaluation ---
evaluate_candidate() {
    local tag="$1"
    local commit="$2"
    local base="$3"
    local changed_files_file="$4"
    local status_file="$5"
    local policy_file="$6"

    log_info "Evaluating ${tag} (${commit:0:7})..."

    # Run verify-green in report-only mode
    local report
    report=$("${VERIFY_GREEN_SCRIPT}" \
        --tag "${tag}" \
        --commit "${commit}" \
        --base "${base}" \
        --offline-policy-file "${policy_file}" \
        --offline-status-file "${status_file}" \
        --offline-changed-files "${changed_files_file}" \
        --report-only 2>/dev/null) || true

    echo "${report}"
}

# --- Dashboard Generation ---
generate_dashboard() {
    local repo="$1"
    local skip_api="$2"
    local verbose="$3"

    log_info "Generating Release Train Dashboard..."
    log_info "Repository: ${repo}"

    # Determine policy file
    local policy_file="${POLICY_FILE_JSON}"
    if [[ -f "${POLICY_FILE_YAML}" ]] && command -v yq &> /dev/null; then
        # Convert YAML to JSON for offline use
        policy_file="${TMP_DIR}/policy.json"
        yq -o=json "${POLICY_FILE_YAML}" > "${policy_file}"
    elif [[ -f "${POLICY_FILE_JSON}" ]]; then
        policy_file="${POLICY_FILE_JSON}"
    else
        log_error "No policy file found"
        exit 2
    fi

    # Collect candidates
    local candidates=()
    local candidates_json="[]"

    # 1. Main HEAD
    local main_head
    main_head=$(get_main_head)
    if [[ -n "${main_head}" ]]; then
        log_info "Found main HEAD: ${main_head:0:7}"
        candidates+=("main:${main_head}")
    fi

    # 2. Latest RC tags per version line
    local rc_tags
    rc_tags=$(get_latest_rc_per_version)
    while IFS= read -r tag; do
        [[ -z "${tag}" ]] && continue
        local commit
        commit=$(get_tag_commit "${tag}")
        if [[ -n "${commit}" ]]; then
            log_info "Found RC tag: ${tag} (${commit:0:7})"
            candidates+=("${tag}:${commit}")
        fi
    done <<< "${rc_tags}"

    # 3. Latest GA tags (for reference)
    local ga_tags
    ga_tags=$(get_ga_tags | head -3)
    while IFS= read -r tag; do
        [[ -z "${tag}" ]] && continue
        local commit
        commit=$(get_tag_commit "${tag}")
        if [[ -n "${commit}" ]]; then
            log_info "Found GA tag: ${tag} (${commit:0:7})"
            # GA tags are informational - don't need promotability check
        fi
    done <<< "${ga_tags}"

    # Evaluate each candidate
    local evaluated_candidates="[]"

    for candidate in "${candidates[@]}"; do
        local tag="${candidate%%:*}"
        local commit="${candidate##*:}"

        # Compute base
        local base
        if [[ -x "${COMPUTE_BASE_SCRIPT}" ]] && [[ "${tag}" != "main" ]]; then
            base=$("${COMPUTE_BASE_SCRIPT}" --tag "${tag}" --commit "${commit}" 2>/dev/null) || base="${commit}^"
        else
            base="${commit}^"
        fi

        # Get changed files
        local changed_files_file="${TMP_DIR}/changed_${commit:0:7}.txt"
        get_changed_files "${base}" "${commit}" > "${changed_files_file}"
        local changed_count
        changed_count=$(wc -l < "${changed_files_file}" | tr -d ' ')

        # Fetch workflow status
        local status_file="${TMP_DIR}/status_${commit:0:7}.json"
        if [[ "${skip_api}" != "true" ]]; then
            fetch_workflow_status "${commit}" "${repo}" "${status_file}" || true
        else
            echo '{}' > "${status_file}"
        fi

        # Evaluate candidate
        local report
        report=$(evaluate_candidate "${tag}" "${commit}" "${base}" "${changed_files_file}" "${status_file}" "${policy_file}")

        if [[ -n "${report}" ]] && echo "${report}" | jq -e . &>/dev/null; then
            # Add candidate type
            local candidate_type="rc"
            [[ "${tag}" == "main" ]] && candidate_type="main"

            report=$(echo "${report}" | jq --arg type "${candidate_type}" '. + {candidate_type: $type}')
            evaluated_candidates=$(echo "${evaluated_candidates}" | jq --argjson candidate "${report}" '. + [$candidate]')
        else
            log_warn "Failed to evaluate ${tag}"
        fi
    done

    # Build final dashboard JSON
    local dashboard_json
    dashboard_json=$(jq -n \
        --arg repo "${repo}" \
        --arg timestamp "$(date -u +%Y-%m-%dT%H:%M:%SZ)" \
        --arg version "${SCRIPT_VERSION}" \
        --argjson candidates "${evaluated_candidates}" \
        '{
            repository: $repo,
            generated_at: $timestamp,
            generator_version: $version,
            candidates: $candidates,
            summary: {
                total_candidates: ($candidates | length),
                promotable: ([$candidates[] | select(.promotable_state == "success")] | length),
                blocked: ([$candidates[] | select(.promotable_state == "blocked")] | length),
                pending: ([$candidates[] | select(.promotable_state == "pending")] | length)
            }
        }')

    echo "${dashboard_json}"
}

generate_markdown() {
    local dashboard_json="$1"

    local timestamp
    timestamp=$(echo "${dashboard_json}" | jq -r '.generated_at')
    local repo
    repo=$(echo "${dashboard_json}" | jq -r '.repository')
    local total
    total=$(echo "${dashboard_json}" | jq -r '.summary.total_candidates')
    local promotable
    promotable=$(echo "${dashboard_json}" | jq -r '.summary.promotable')
    local blocked
    blocked=$(echo "${dashboard_json}" | jq -r '.summary.blocked')
    local pending
    pending=$(echo "${dashboard_json}" | jq -r '.summary.pending')

    cat <<EOF
# Release Train Dashboard

**Generated:** ${timestamp}
**Repository:** ${repo}
**Policy:** [REQUIRED_CHECKS_POLICY.yml](../../docs/ci/REQUIRED_CHECKS_POLICY.yml)

---

## Summary

| Metric | Count |
|--------|-------|
| Total Candidates | ${total} |
| Promotable | ${promotable} |
| Blocked | ${blocked} |
| Pending | ${pending} |

---

## Release Candidates

EOF

    # Generate table for each candidate
    echo "| Tag | Commit | State | Top Blocker | Changed Files |"
    echo "|-----|--------|-------|-------------|---------------|"

    echo "${dashboard_json}" | jq -r '.candidates[] | [
        .tag,
        .commit_sha[0:7],
        .promotable_state,
        (.top_blocker // "-"),
        .changed_files_count
    ] | @tsv' | while IFS=$'\t' read -r tag commit state blocker changed; do
        local state_icon
        case "${state}" in
            success) state_icon="✅ Promotable" ;;
            blocked) state_icon="❌ Blocked" ;;
            pending) state_icon="⏳ Pending" ;;
            *) state_icon="❓ Unknown" ;;
        esac
        echo "| ${tag} | \`${commit}\` | ${state_icon} | ${blocker} | ${changed} |"
    done

    cat <<EOF

---

## Detailed Check Status

EOF

    # For each candidate, show detailed checks
    echo "${dashboard_json}" | jq -c '.candidates[]' | while IFS= read -r candidate; do
        local tag
        tag=$(echo "${candidate}" | jq -r '.tag')
        local commit
        commit=$(echo "${candidate}" | jq -r '.commit_sha[0:7]')
        local state
        state=$(echo "${candidate}" | jq -r '.promotable_state')

        echo "### ${tag} (\`${commit}\`)"
        echo ""
        echo "**State:** ${state}"
        echo ""
        echo "| Check | Required | Status |"
        echo "|-------|----------|--------|"

        echo "${candidate}" | jq -r '.checks[] | [
            .name,
            .required,
            .status
        ] | @tsv' | while IFS=$'\t' read -r name required status; do
            local status_icon
            case "${status}" in
                success) status_icon="✅" ;;
                failure) status_icon="❌" ;;
                pending) status_icon="⏳" ;;
                skipped) status_icon="⏭️" ;;
                *) status_icon="❓" ;;
            esac
            echo "| ${name} | ${required} | ${status_icon} ${status} |"
        done

        echo ""
    done

    cat <<EOF

---

## Action Queue

EOF

    # List blocked candidates with their top blockers
    local blocked_count
    blocked_count=$(echo "${dashboard_json}" | jq '[.candidates[] | select(.promotable_state == "blocked")] | length')

    if [[ "${blocked_count}" -gt 0 ]]; then
        echo "### Blocked - Requires Action"
        echo ""
        echo "${dashboard_json}" | jq -r '.candidates[] | select(.promotable_state == "blocked") |
            "- **\(.tag)**: \(.top_blocker // "Unknown blocker")"'
        echo ""
    else
        echo "No blocked candidates."
        echo ""
    fi

    # List pending candidates
    local pending_count
    pending_count=$(echo "${dashboard_json}" | jq '[.candidates[] | select(.promotable_state == "pending")] | length')

    if [[ "${pending_count}" -gt 0 ]]; then
        echo "### Pending - Waiting for CI"
        echo ""
        echo "${dashboard_json}" | jq -r '.candidates[] | select(.promotable_state == "pending") |
            "- **\(.tag)**: Waiting for \(.top_blocker // "checks to complete")"'
        echo ""
    fi

    cat <<EOF

---

## How This Dashboard Works

This dashboard uses the same policy engine as the RC and GA promotion pipelines:

1. **Policy Source:** \`docs/ci/REQUIRED_CHECKS_POLICY.yml\`
2. **Base Selection:** Computed via \`compute_base_for_commit.sh\`
3. **Requiredness:** Determined by changed files + conditional path patterns
4. **Evaluation:** \`verify-green-for-tag.sh --report-only\`

### State Definitions

| State | Meaning |
|-------|---------|
| ✅ Promotable | All required checks passed - safe to promote |
| ❌ Blocked | One or more required checks failed |
| ⏳ Pending | Checks still running or not yet started |

### References

- [Required Checks Policy](../../docs/ci/REQUIRED_CHECKS.md)
- [RC Pipeline](../../docs/ci/RELEASE_RC_PIPELINE.md)
- [GA Pipeline](../../docs/ci/RELEASE_GA_PIPELINE.md)
- [Promotion Guide](../../docs/releases/MVP-4_STABILIZATION_PROMOTION.md)

---

**Document Authority:** Release Engineering (auto-generated)
**Refresh:** Hourly via \`.github/workflows/release-train-dashboard.yml\`
EOF
}

# --- Main ---
main() {
    local skip_api=false
    local verbose=false
    local dry_run=false
    local output_dir=""

    # Parse arguments
    while [[ $# -gt 0 ]]; do
        case $1 in
            --output-dir)
                output_dir="$2"
                shift 2
                ;;
            --skip-api)
                skip_api=true
                shift
                ;;
            --verbose)
                verbose=true
                shift
                ;;
            --dry-run)
                dry_run=true
                shift
                ;;
            --help)
                print_usage
                exit 0
                ;;
            *)
                log_error "Unknown option: $1"
                print_usage
                exit 2
                ;;
        esac
    done

    # Override output paths if specified
    if [[ -n "${output_dir}" ]]; then
        DASHBOARD_JSON_DIR="${output_dir}"
        DASHBOARD_JSON="${DASHBOARD_JSON_DIR}/dashboard.json"
    fi

    # Pre-flight
    check_dependencies

    # Create temp directory
    TMP_DIR=$(mktemp -d)
    trap cleanup EXIT

    # Get repo info
    local repo
    repo=$(get_repo_info)

    # Generate dashboard
    local dashboard_json
    dashboard_json=$(generate_dashboard "${repo}" "${skip_api}" "${verbose}")

    if [[ "${verbose}" == "true" ]]; then
        log_info "Dashboard JSON:"
        echo "${dashboard_json}" | jq '.' >&2
    fi

    # Generate markdown
    local dashboard_md
    dashboard_md=$(generate_markdown "${dashboard_json}")

    if [[ "${dry_run}" == "true" ]]; then
        log_info "Dry run - would write to:"
        log_info "  ${DASHBOARD_JSON}"
        log_info "  ${DASHBOARD_MD}"
        echo ""
        echo "=== dashboard.json ==="
        echo "${dashboard_json}" | jq '.'
        echo ""
        echo "=== RELEASE_TRAIN_DASHBOARD.md ==="
        echo "${dashboard_md}"
    else
        # Create output directories
        mkdir -p "${DASHBOARD_JSON_DIR}"
        mkdir -p "$(dirname "${DASHBOARD_MD}")"

        # Write files
        echo "${dashboard_json}" | jq '.' > "${DASHBOARD_JSON}"
        echo "${dashboard_md}" > "${DASHBOARD_MD}"

        log_success "Dashboard generated:"
        log_success "  ${DASHBOARD_JSON}"
        log_success "  ${DASHBOARD_MD}"

        # Output summary
        local promotable blocked pending
        promotable=$(echo "${dashboard_json}" | jq -r '.summary.promotable')
        blocked=$(echo "${dashboard_json}" | jq -r '.summary.blocked')
        pending=$(echo "${dashboard_json}" | jq -r '.summary.pending')

        echo ""
        log_info "Summary: ${promotable} promotable, ${blocked} blocked, ${pending} pending"
    fi
}

main "$@"
