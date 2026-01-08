#!/usr/bin/env bash
# verify-green-for-tag.sh v1.0.0
# Verifies that a commit has passed all required CI workflows before tag/promotion
#
# Authority: docs/ci/REQUIRED_CHECKS.md
# Purpose: Prevent RC→GA promotion unless commit is proven green
# Contract: Exit 0 = safe to promote, Exit 1 = blocked

set -euo pipefail

# --- Configuration ---
SCRIPT_VERSION="1.0.0"
REPO_ROOT="$(git rev-parse --show-toplevel)"

# Required workflows that MUST be green for promotion
REQUIRED_WORKFLOWS=(
    "Release Readiness Gate"
    "Workflow Lint"
    "GA Gate"
    "Unit Tests & Coverage"
    "CI Core (Primary Gate)"
)

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

Verifies that a commit has passed all required CI workflows.

OPTIONS:
    --tag TAG          Tag to verify (e.g., v4.1.2-rc.1)
    --commit SHA       Commit SHA to verify (default: HEAD)
    --branch BRANCH    Branch context (default: main)
    --verbose          Enable verbose logging
    --help             Show this help message

EXAMPLES:
    # Verify current HEAD for RC tag
    $0 --tag v4.1.2-rc.1

    # Verify specific commit
    $0 --tag v4.1.2-rc.1 --commit a8b1963

    # Verify with verbose output
    $0 --tag v4.1.2-rc.1 --verbose

REQUIRED WORKFLOWS:
    - Release Readiness Gate
    - Workflow Lint
    - GA Gate
    - Unit Tests & Coverage
    - CI Core (Primary Gate)

EXIT CODES:
    0  All required checks passed (green for promotion)
    1  One or more checks failed/missing (blocked)
    2  Invalid arguments or environment

REFERENCES:
    Required Checks:  docs/ci/REQUIRED_CHECKS.md
    Promotion Guide:  docs/releases/MVP-4_STABILIZATION_PROMOTION.md
EOF
}

check_gh_cli() {
    if ! command -v gh &> /dev/null; then
        log_error "GitHub CLI (gh) is not installed"
        log_info "Install with: brew install gh  (macOS)"
        log_info "Or visit: https://cli.github.com/"
        exit 2
    fi

    # Verify authentication
    if ! gh auth status &> /dev/null; then
        log_error "GitHub CLI is not authenticated"
        log_info "Run: gh auth login"
        exit 2
    fi
}

get_repo_info() {
    local owner
    local repo

    # Get repo from git remote
    local remote_url
    remote_url=$(git remote get-url origin)

    if [[ "${remote_url}" =~ github\.com[:/]([^/]+)/([^/\.]+) ]]; then
        owner="${BASH_REMATCH[1]}"
        repo="${BASH_REMATCH[2]}"
        echo "${owner}/${repo}"
    else
        log_error "Could not parse GitHub repo from remote URL: ${remote_url}"
        exit 2
    fi
}

fetch_workflow_runs() {
    local commit_sha="$1"
    local repo="$2"

    log_info "Fetching workflow runs for commit ${commit_sha:0:7}..."

    # Fetch all workflow runs for this commit
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

    # If status is not completed, check current status
    if [[ "${status}" != "completed" ]]; then
        printf "%s\t%s\t%s" "${status^^}" "${status}" "${url}"
        return
    fi

    # Return conclusion for completed runs
    printf "%s\t%s\t%s" "${conclusion^^}" "${status}" "${url}"
}

print_truth_table() {
    local runs_json="$1"
    local commit_sha="$2"
    local tag="$3"

    echo ""
    echo "╔════════════════════════════════════════════════════════════════════════════════╗"
    echo "║                          PROMOTION GATE TRUTH TABLE                            ║"
    echo "╠════════════════════════════════════════════════════════════════════════════════╣"
    echo "║ Tag:    ${tag}"
    echo "║ Commit: ${commit_sha:0:7} (${commit_sha})"
    echo "╚════════════════════════════════════════════════════════════════════════════════╝"
    echo ""

    printf "%-35s | %-12s | %-10s | %s\n" "WORKFLOW" "CONCLUSION" "STATUS" "RUN URL"
    printf "%s\n" "────────────────────────────────────────────────────────────────────────────────────────────────"

    local all_green=true
    local blocking_failures=()

    for workflow in "${REQUIRED_WORKFLOWS[@]}"; do
        local result
        result=$(check_workflow_status "${workflow}" "${runs_json}")

        IFS=$'\t' read -r conclusion status url <<< "${result}"

        # Determine status symbol
        local symbol
        local color="${NC}"

        if [[ "${conclusion}" == "SUCCESS" ]]; then
            symbol="✅"
            color="${GREEN}"
        elif [[ "${conclusion}" == "MISSING" ]]; then
            symbol="❌"
            color="${RED}"
            all_green=false
            blocking_failures+=("${workflow}: MISSING (workflow did not run)")
        elif [[ "${conclusion}" == "IN_PROGRESS" ]] || [[ "${conclusion}" == "QUEUED" ]] || [[ "${conclusion}" == "WAITING" ]] || [[ "${conclusion}" == "PENDING" ]]; then
            symbol="⏳"
            color="${YELLOW}"
            all_green=false
            blocking_failures+=("${workflow}: ${conclusion} (not completed)")
        elif [[ "${conclusion}" == "FAILURE" ]] || [[ "${conclusion}" == "TIMED_OUT" ]] || [[ "${conclusion}" == "CANCELLED" ]]; then
            symbol="❌"
            color="${RED}"
            all_green=false
            blocking_failures+=("${workflow}: ${conclusion}")
        else
            symbol="⚠️"
            color="${YELLOW}"
            all_green=false
            blocking_failures+=("${workflow}: ${conclusion} (unexpected state)")
        fi

        printf "${color}%-35s${NC} | ${color}%-12s${NC} | %-10s | %s\n" \
            "${workflow:0:35}" \
            "${symbol} ${conclusion}" \
            "${status}" \
            "${url}"
    done

    echo ""
    echo "════════════════════════════════════════════════════════════════════════════════════════════════"
    echo ""

    if [[ "${all_green}" == "true" ]]; then
        log_success "PROMOTION ALLOWED: All required checks passed ✅"
        echo ""
        log_info "This commit is safe to promote:"
        log_info "  • All required workflows completed successfully"
        log_info "  • No blocking failures detected"
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
        log_warn "  1. Review failed workflow runs above"
        log_warn "  2. Fix any test/build/lint failures"
        log_warn "  3. Ensure all workflows complete successfully"
        log_warn "  4. Re-run this verification script"
        return 1
    fi
}

# --- Main execution ---
main() {
    local tag=""
    local commit_sha=""
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

    # Default commit to HEAD if not specified
    if [[ -z "${commit_sha}" ]]; then
        commit_sha=$(git rev-parse HEAD)
        log_info "Using current HEAD: ${commit_sha:0:7}"
    else
        # Resolve short SHA to full SHA
        commit_sha=$(git rev-parse "${commit_sha}")
    fi

    log_info "=== Promotion Gate Verification ==="
    log_info "Script version: ${SCRIPT_VERSION}"
    log_info "Tag: ${tag}"
    log_info "Commit: ${commit_sha:0:7} (${commit_sha})"
    log_info "Branch: ${branch}"
    echo ""

    # Pre-flight checks
    check_gh_cli

    # Get repo info
    local repo
    repo=$(get_repo_info)
    log_info "Repository: ${repo}"
    echo ""

    # Fetch workflow runs
    local runs_json
    runs_json=$(fetch_workflow_runs "${commit_sha}" "${repo}")

    if [[ "${verbose}" == "true" ]]; then
        log_info "Raw workflow data:"
        echo "${runs_json}" | jq '.'
        echo ""
    fi

    # Print truth table and check status
    if print_truth_table "${runs_json}" "${commit_sha}" "${tag}"; then
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
