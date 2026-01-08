#!/usr/bin/env bash
# verify-green-for-tag.sh v2.0.0
# Verifies that a commit has passed all required CI workflows before tag/promotion
#
# Authority: docs/ci/REQUIRED_CHECKS.md
# Policy: docs/ci/REQUIRED_CHECKS_POLICY.json
# Purpose: Prevent RC→GA promotion unless commit is proven green
# Contract: Exit 0 = safe to promote, Exit 1 = blocked, Exit 2 = invalid args

set -euo pipefail

# --- Configuration ---
SCRIPT_VERSION="2.0.0"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(git rev-parse --show-toplevel)"
POLICY_FILE="${REPO_ROOT}/docs/ci/REQUIRED_CHECKS_POLICY.json"

# Global state (populated by compute_required_workflows)
declare -a ALWAYS_REQUIRED_WORKFLOWS=()
declare -A CONDITIONAL_WORKFLOW_STATUS=()

# --- Color output ---
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# --- Logging functions ---
log_info() {
    echo -e "${BLUE}[INFO]${NC} $*" >&2
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $*"
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

Verifies that a commit has passed all required CI workflows based on
the conditional checks policy.

OPTIONS:
    --tag TAG          Tag to verify (e.g., v4.1.2-rc.1)
    --commit SHA       Commit SHA to verify (default: HEAD)
    --base REF         Base reference for diff (default: auto-detect parent)
    --branch BRANCH    Branch context (default: main)
    --verbose          Enable verbose logging
    --help             Show this help message

EXAMPLES:
    # Verify current HEAD for RC tag (auto-detect base)
    $0 --tag v4.1.2-rc.1

    # Verify specific commit with explicit base
    $0 --tag v4.1.2-rc.1 --commit a8b1963 --base origin/main~5

    # Verify with verbose output
    $0 --tag v4.1.2-rc.1 --verbose

POLICY:
    The script loads check requirements from:
    ${POLICY_FILE}

    - always_required: Must pass for every commit
    - conditional_required: Must pass if specific paths changed
    - informational: Not blocking for promotion

EXIT CODES:
    0  All required checks passed (green for promotion)
    1  One or more required checks failed/missing (blocked)
    2  Invalid arguments or environment

REFERENCES:
    Required Checks:  docs/ci/REQUIRED_CHECKS.md
    Policy File:      docs/ci/REQUIRED_CHECKS_POLICY.json
    Promotion Guide:  docs/releases/MVP-4_STABILIZATION_PROMOTION.md
EOF
}

check_dependencies() {
    if ! command -v gh &> /dev/null; then
        log_error "GitHub CLI (gh) is not installed"
        log_info "Install with: brew install gh  (macOS)"
        log_info "Or visit: https://cli.github.com/"
        exit 2
    fi

    if ! gh auth status &> /dev/null; then
        log_error "GitHub CLI is not authenticated"
        log_info "Run: gh auth login"
        exit 2
    fi

    if ! command -v jq &> /dev/null; then
        log_error "jq is not installed"
        log_info "Install with: brew install jq  (macOS)"
        exit 2
    fi

    if [[ ! -f "${POLICY_FILE}" ]]; then
        log_error "Policy file not found: ${POLICY_FILE}"
        exit 2
    fi
}

get_repo_info() {
    local remote_url
    remote_url=$(git remote get-url origin)

    if [[ "${remote_url}" =~ github\.com[:/]([^/]+)/([^/\.]+) ]]; then
        echo "${BASH_REMATCH[1]}/${BASH_REMATCH[2]}"
    else
        log_error "Could not parse GitHub repo from remote URL: ${remote_url}"
        exit 2
    fi
}

# --- Changed Files Detection ---
get_changed_files() {
    local base_ref="$1"
    local commit_sha="$2"

    git diff --name-only "${base_ref}..${commit_sha}" 2>/dev/null || {
        # Fallback: if base doesn't exist, get files from commit
        git diff-tree --no-commit-id --name-only -r "${commit_sha}" 2>/dev/null || echo ""
    }
}

# --- Conditional Check Evaluation ---
check_path_matches() {
    local changed_files="$1"
    local patterns_json="$2"

    # Extract patterns from JSON array
    local patterns
    patterns=$(echo "${patterns_json}" | jq -r '.[]')

    while IFS= read -r pattern; do
        [[ -z "${pattern}" ]] && continue
        # Check if any changed file matches this regex pattern
        while IFS= read -r file; do
            [[ -z "${file}" ]] && continue
            if echo "${file}" | grep -qE "${pattern}"; then
                return 0  # Match found
            fi
        done <<< "${changed_files}"
    done <<< "${patterns}"

    return 1  # No match
}

compute_required_workflows() {
    local changed_files="$1"

    # Clear global arrays
    ALWAYS_REQUIRED_WORKFLOWS=()
    CONDITIONAL_WORKFLOW_STATUS=()

    # Load always_required workflows
    while IFS= read -r wf_name; do
        [[ -n "${wf_name}" ]] && ALWAYS_REQUIRED_WORKFLOWS+=("${wf_name}")
    done < <(jq -r '.always_required[].name' "${POLICY_FILE}")

    # Check conditional_required workflows
    while IFS= read -r conditional; do
        [[ -z "${conditional}" ]] && continue

        local wf_name
        local patterns
        wf_name=$(echo "${conditional}" | jq -r '.name')
        patterns=$(echo "${conditional}" | jq -c '.required_when_paths_match')

        # Check if any changed file matches the patterns
        if check_path_matches "${changed_files}" "${patterns}"; then
            CONDITIONAL_WORKFLOW_STATUS["${wf_name}"]="REQUIRED"
        else
            CONDITIONAL_WORKFLOW_STATUS["${wf_name}"]="SKIPPED"
        fi
    done < <(jq -c '.conditional_required[]' "${POLICY_FILE}")
}

# --- Workflow Status Checking ---
fetch_workflow_runs() {
    local commit_sha="$1"
    local repo="$2"

    log_info "Fetching workflow runs for commit ${commit_sha:0:7}..."

    gh run list \
        --repo "${repo}" \
        --commit "${commit_sha}" \
        --json name,conclusion,status,workflowName,url,createdAt \
        --limit 100
}

check_workflow_status() {
    local workflow_name="$1"
    local runs_json="$2"

    # Find the most recent run for this workflow
    local workflow_data
    workflow_data=$(echo "${runs_json}" | jq -r --arg name "${workflow_name}" '
        map(select(.workflowName == $name or .name == $name)) |
        sort_by(.createdAt) |
        reverse |
        first // {}
    ')

    if [[ "${workflow_data}" == "{}" ]]; then
        printf "MISSING\tN/A\tN/A"
        return
    fi

    local conclusion
    local status
    local url

    conclusion=$(echo "${workflow_data}" | jq -r '.conclusion // "N/A"')
    status=$(echo "${workflow_data}" | jq -r '.status // "N/A"')
    url=$(echo "${workflow_data}" | jq -r '.url // "N/A"')

    # If status is not completed, use status as conclusion
    if [[ "${status}" != "completed" ]]; then
        printf "%s\t%s\t%s" "${status^^}" "${status}" "${url}"
        return
    fi

    # Return conclusion for completed runs
    printf "%s\t%s\t%s" "${conclusion^^}" "${status}" "${url}"
}

# --- Truth Table Rendering ---
print_truth_table() {
    local runs_json="$1"
    local commit_sha="$2"
    local tag="$3"
    local base_ref="$4"
    local changed_count="$5"

    echo ""
    echo "╔════════════════════════════════════════════════════════════════════════════════╗"
    echo "║                          PROMOTION GATE TRUTH TABLE                            ║"
    echo "╠════════════════════════════════════════════════════════════════════════════════╣"
    echo "║ Tag:     ${tag}"
    echo "║ Commit:  ${commit_sha:0:7} (${commit_sha})"
    echo "║ Base:    ${base_ref}"
    echo "║ Changed: ${changed_count} files"
    echo "╚════════════════════════════════════════════════════════════════════════════════╝"
    echo ""

    printf "%-35s | %-11s | %-12s | %s\n" "WORKFLOW" "REQUIRED" "STATUS" "RESULT"
    printf "%s\n" "────────────────────────────────────────────────────────────────────────────────────────────────────"

    local all_required_pass=true
    local blocking_failures=()

    # Process always_required workflows
    for wf_name in "${ALWAYS_REQUIRED_WORKFLOWS[@]}"; do
        local result
        result=$(check_workflow_status "${wf_name}" "${runs_json}")

        local conclusion status url
        IFS=$'\t' read -r conclusion status url <<< "${result}"

        local symbol result_text color
        if [[ "${conclusion}" == "SUCCESS" ]]; then
            symbol="✅"
            result_text="PASS"
            color="${GREEN}"
        elif [[ "${conclusion}" == "MISSING" ]] || [[ "${conclusion}" == "QUEUED" ]] || \
             [[ "${conclusion}" == "IN_PROGRESS" ]] || [[ "${conclusion}" == "PENDING" ]] || \
             [[ "${conclusion}" == "WAITING" ]]; then
            symbol="⏳"
            result_text="WAITING"
            color="${YELLOW}"
            all_required_pass=false
            blocking_failures+=("${wf_name}: ${conclusion} (not completed)")
        else
            symbol="❌"
            result_text="FAIL"
            color="${RED}"
            all_required_pass=false
            blocking_failures+=("${wf_name}: ${conclusion}")
        fi

        printf "${color}%-35s${NC} | %-11s | ${color}%-12s${NC} | ${color}%s${NC}\n" \
            "${wf_name:0:35}" \
            "ALWAYS" \
            "${symbol} ${conclusion}" \
            "${result_text}"
    done

    # Process conditional_required workflows
    for wf_name in "${!CONDITIONAL_WORKFLOW_STATUS[@]}"; do
        local is_required="${CONDITIONAL_WORKFLOW_STATUS[${wf_name}]}"

        local result
        result=$(check_workflow_status "${wf_name}" "${runs_json}")

        local conclusion status url
        IFS=$'\t' read -r conclusion status url <<< "${result}"

        local symbol result_text color required_label

        if [[ "${is_required}" == "SKIPPED" ]]; then
            # Not required for this commit
            symbol="⏭️"
            result_text="N/A"
            color="${CYAN}"
            required_label="SKIP"
        elif [[ "${conclusion}" == "SUCCESS" ]]; then
            symbol="✅"
            result_text="PASS"
            color="${GREEN}"
            required_label="COND"
        elif [[ "${conclusion}" == "MISSING" ]] || [[ "${conclusion}" == "QUEUED" ]] || \
             [[ "${conclusion}" == "IN_PROGRESS" ]] || [[ "${conclusion}" == "PENDING" ]] || \
             [[ "${conclusion}" == "WAITING" ]]; then
            symbol="⏳"
            result_text="WAITING"
            color="${YELLOW}"
            all_required_pass=false
            blocking_failures+=("${wf_name}: ${conclusion} (required but not completed)")
            required_label="COND"
        else
            symbol="❌"
            result_text="FAIL"
            color="${RED}"
            all_required_pass=false
            blocking_failures+=("${wf_name}: ${conclusion}")
            required_label="COND"
        fi

        printf "${color}%-35s${NC} | %-11s | ${color}%-12s${NC} | ${color}%s${NC}\n" \
            "${wf_name:0:35}" \
            "${required_label}" \
            "${symbol} ${conclusion}" \
            "${result_text}"
    done

    echo ""
    echo "════════════════════════════════════════════════════════════════════════════════════════════════════"
    echo ""

    # Legend
    echo "Legend: ALWAYS=always required | COND=conditionally required | SKIP=not required for this commit"
    echo ""

    if [[ "${all_required_pass}" == "true" ]]; then
        log_success "PROMOTION ALLOWED: All required checks passed ✅"
        echo ""
        log_info "This commit is safe to promote:"
        log_info "  • All always-required workflows completed successfully"
        log_info "  • All conditionally-required workflows (for changed paths) passed"
        log_info "  • Tag ${tag} can be created/promoted"
        return 0
    else
        log_error "PROMOTION BLOCKED: One or more required checks failed ❌"
        echo ""
        log_error "Blocking failures:"
        for failure in "${blocking_failures[@]}"; do
            echo -e "  ${RED}•${NC} ${failure}"
        done
        echo ""
        log_warn "Actions required:"
        log_warn "  1. Review failed/pending workflow runs above"
        log_warn "  2. Wait for in-progress workflows to complete"
        log_warn "  3. Fix any test/build/lint failures"
        log_warn "  4. Re-run this verification script"
        return 1
    fi
}

# --- Main execution ---
main() {
    local tag=""
    local commit_sha=""
    local base_ref=""
    local branch="main"
    local verbose=false

    # Parse arguments
    while [[ $# -gt 0 ]]; do
        case $1 in
            --tag)
                tag="$2"
                shift 2
                ;;
            --commit)
                commit_sha="$2"
                shift 2
                ;;
            --base)
                base_ref="$2"
                shift 2
                ;;
            --branch)
                branch="$2"
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
                exit 2
                ;;
        esac
    done

    # Validate required arguments
    if [[ -z "${tag}" ]]; then
        log_error "Missing required argument: --tag"
        print_usage
        exit 2
    fi

    # Pre-flight checks
    check_dependencies

    # Default commit to HEAD if not specified
    if [[ -z "${commit_sha}" ]]; then
        commit_sha=$(git rev-parse HEAD)
        log_info "Using current HEAD: ${commit_sha:0:7}"
    else
        # Resolve short SHA to full SHA
        commit_sha=$(git rev-parse "${commit_sha}")
    fi

    # Default base to parent commit if not specified
    if [[ -z "${base_ref}" ]]; then
        base_ref="${commit_sha}^"
        log_info "Using parent commit as base: ${base_ref}"
    fi

    log_info "=== Promotion Gate Verification ==="
    log_info "Script version: ${SCRIPT_VERSION}"
    log_info "Policy file: ${POLICY_FILE}"
    log_info "Tag: ${tag}"
    log_info "Commit: ${commit_sha:0:7} (${commit_sha})"
    log_info "Base: ${base_ref}"
    log_info "Branch: ${branch}"
    echo ""

    # Get repo info
    local repo
    repo=$(get_repo_info)
    log_info "Repository: ${repo}"
    echo ""

    # Get changed files
    log_info "Computing changed files..."
    local changed_files
    changed_files=$(get_changed_files "${base_ref}" "${commit_sha}")
    local changed_count
    changed_count=$(echo "${changed_files}" | grep -c . || echo "0")
    log_info "Found ${changed_count} changed files"

    if [[ "${verbose}" == "true" ]] && [[ -n "${changed_files}" ]]; then
        log_info "Changed files:"
        echo "${changed_files}" | while IFS= read -r file; do
            echo "  - ${file}"
        done
        echo ""
    fi

    # Compute required workflows based on changed files
    log_info "Computing required workflows based on policy..."
    compute_required_workflows "${changed_files}"

    if [[ "${verbose}" == "true" ]]; then
        log_info "Always-required workflows: ${#ALWAYS_REQUIRED_WORKFLOWS[@]}"
        for wf in "${ALWAYS_REQUIRED_WORKFLOWS[@]}"; do
            echo "  - ${wf}"
        done
        echo ""
        log_info "Conditional workflow status:"
        for wf in "${!CONDITIONAL_WORKFLOW_STATUS[@]}"; do
            echo "  - ${wf}: ${CONDITIONAL_WORKFLOW_STATUS[${wf}]}"
        done
        echo ""
    fi

    # Fetch workflow runs
    local runs_json
    runs_json=$(fetch_workflow_runs "${commit_sha}" "${repo}")

    if [[ "${verbose}" == "true" ]]; then
        log_info "Raw workflow data:"
        echo "${runs_json}" | jq '.'
        echo ""
    fi

    # Print truth table and check status
    if print_truth_table "${runs_json}" "${commit_sha}" "${tag}" "${base_ref}" "${changed_count}"; then
        echo ""
        log_success "════════════════════════════════════════════════════════════════"
        log_success "  ✅ GREEN FOR PROMOTION"
        log_success "════════════════════════════════════════════════════════════════"
        exit 0
    else
        echo ""
        log_error "════════════════════════════════════════════════════════════════"
        log_error "  ❌ BLOCKED - NOT SAFE FOR PROMOTION"
        log_error "════════════════════════════════════════════════════════════════"
        exit 1
    fi
}

# Run main
main "$@"
