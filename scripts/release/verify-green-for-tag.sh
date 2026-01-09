#!/usr/bin/env bash
# verify-green-for-tag.sh v3.2.0
# Verifies that a commit has passed all required CI workflows before tag/promotion
#
# Authority: docs/ci/REQUIRED_CHECKS.md
# Policy: docs/ci/REQUIRED_CHECKS_POLICY.yml (primary) or .json (fallback)
# Purpose: Prevent RC→GA promotion unless commit is proven green
# Contract: Exit 0 = safe to promote, Exit 1 = blocked, Exit 2 = invalid args

set -euo pipefail

# --- Configuration ---
SCRIPT_VERSION="3.2.0"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(git rev-parse --show-toplevel 2>/dev/null || echo ".")"
POLICY_FILE_YAML="${REPO_ROOT}/docs/ci/REQUIRED_CHECKS_POLICY.yml"
POLICY_FILE_JSON="${REPO_ROOT}/docs/ci/REQUIRED_CHECKS_POLICY.json"
POLICY_FILE=""  # Will be set based on what exists and tools available
POLICY_IS_YAML=false

# Offline/test mode configuration
OFFLINE_MODE=false
OFFLINE_STATUS_FILE=""
OFFLINE_CHANGED_FILES=""
OFFLINE_POLICY_FILE=""

# Report-only mode (outputs JSON instead of truth table)
REPORT_ONLY=false

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

OFFLINE/TEST MODE:
    --offline-status-file FILE   JSON file mapping workflow names to status
    --offline-changed-files FILE File with list of changed files (one per line)
    --offline-policy-file FILE   Custom policy file path (YAML or JSON)

    In offline mode, the script skips GitHub API calls and uses the
    provided status map. This enables deterministic testing.

OUTPUT MODE:
    --report-only            Output JSON report instead of truth table
                             Suitable for machine consumption (dashboard, automation)

EXAMPLES:
    # Verify current HEAD for RC tag (auto-detect base)
    $0 --tag v4.1.2-rc.1

    # Verify specific commit with explicit base
    $0 --tag v4.1.2-rc.1 --commit a8b1963 --base origin/main~5

    # Verify with verbose output
    $0 --tag v4.1.2-rc.1 --verbose

POLICY:
    The script loads check requirements from:
    ${POLICY_FILE_YAML} (YAML, preferred with yq)
    ${POLICY_FILE_JSON} (JSON, fallback)

    - always_required: Must pass for every commit
    - conditional_required: Must pass if specific paths changed
    - informational: Not blocking for promotion

BASE COMPUTATION:
    If --base is not provided, it is computed automatically:
    - For RC tags: previous RC, previous GA, or merge-base with main
    - For GA tags: same base as corresponding RC (lineage)
    - See compute_base_for_commit.sh for algorithm details

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
    # In offline mode, only jq is required
    if [[ "${OFFLINE_MODE}" != "true" ]]; then
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
    fi

    if ! command -v jq &> /dev/null; then
        log_error "jq is not installed"
        log_info "Install with: brew install jq  (macOS)"
        exit 2
    fi

    # Use custom policy file if specified (offline mode)
    if [[ -n "${OFFLINE_POLICY_FILE}" ]]; then
        if [[ ! -f "${OFFLINE_POLICY_FILE}" ]]; then
            log_error "Offline policy file not found: ${OFFLINE_POLICY_FILE}"
            exit 2
        fi
        POLICY_FILE="${OFFLINE_POLICY_FILE}"
        if [[ "${POLICY_FILE}" == *.yml ]] || [[ "${POLICY_FILE}" == *.yaml ]]; then
            POLICY_IS_YAML=true
        else
            POLICY_IS_YAML=false
        fi
        log_info "Using custom policy: ${POLICY_FILE}"
        return
    fi

    # Determine which policy file to use
    # Prefer YAML if yq is available
    if [[ -f "${POLICY_FILE_YAML}" ]] && command -v yq &> /dev/null; then
        POLICY_FILE="${POLICY_FILE_YAML}"
        POLICY_IS_YAML=true
        log_info "Using YAML policy: ${POLICY_FILE}"
    elif [[ -f "${POLICY_FILE_JSON}" ]]; then
        POLICY_FILE="${POLICY_FILE_JSON}"
        POLICY_IS_YAML=false
        log_info "Using JSON policy: ${POLICY_FILE}"
    elif [[ -f "${POLICY_FILE_YAML}" ]]; then
        # YAML exists but no yq - try to convert
        POLICY_FILE="${POLICY_FILE_YAML}"
        POLICY_IS_YAML=true
        log_warn "yq not installed, will use basic YAML parsing"
    else
        log_error "Policy file not found: ${POLICY_FILE_YAML} or ${POLICY_FILE_JSON}"
        exit 2
    fi
}

# Load policy data into JSON format for processing
load_policy_as_json() {
    if [[ "${POLICY_IS_YAML}" == "true" ]]; then
        if command -v yq &> /dev/null; then
            # Use yq to convert YAML to JSON
            yq -o=json "${POLICY_FILE}"
        else
            # Basic YAML to JSON conversion using awk/sed
            # This handles our specific policy format
            log_warn "Falling back to basic YAML parsing"
            # For CI environments, we should have yq installed
            # This is a simplified fallback
            python3 -c "import sys, yaml, json; json.dump(yaml.safe_load(open('${POLICY_FILE}')), sys.stdout)" 2>/dev/null || {
                log_error "Cannot parse YAML policy - install yq or python3 with PyYAML"
                exit 2
            }
        fi
    else
        cat "${POLICY_FILE}"
    fi
}

# Compute base reference if not provided
compute_base_if_needed() {
    local tag="$1"
    local commit="$2"
    local provided_base="$3"

    if [[ -n "${provided_base}" ]]; then
        echo "${provided_base}"
        return
    fi

    # Use compute_base_for_commit.sh if available
    local compute_script="${SCRIPT_DIR}/compute_base_for_commit.sh"
    if [[ -x "${compute_script}" ]]; then
        "${compute_script}" --tag "${tag}" --commit "${commit}" 2>/dev/null || {
            # Fallback to parent
            echo "${commit}^"
        }
    else
        # Fallback: use parent commit
        echo "${commit}^"
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

    # Load policy as JSON (handles both YAML and JSON sources)
    local policy_json
    policy_json=$(load_policy_as_json)

    # Load always_required workflows
    while IFS= read -r wf_name; do
        [[ -n "${wf_name}" ]] && ALWAYS_REQUIRED_WORKFLOWS+=("${wf_name}")
    done < <(echo "${policy_json}" | jq -r '.always_required[].name')

    # Check conditional_required workflows
    # Note: YAML uses 'when_paths_match', JSON uses 'required_when_paths_match'
    while IFS= read -r conditional; do
        [[ -z "${conditional}" ]] && continue

        local wf_name
        local patterns
        wf_name=$(echo "${conditional}" | jq -r '.name')
        # Support both YAML and JSON field names
        patterns=$(echo "${conditional}" | jq -c '.when_paths_match // .required_when_paths_match // []')

        # Check if any changed file matches the patterns
        if check_path_matches "${changed_files}" "${patterns}"; then
            CONDITIONAL_WORKFLOW_STATUS["${wf_name}"]="REQUIRED"
        else
            CONDITIONAL_WORKFLOW_STATUS["${wf_name}"]="SKIPPED"
        fi
    done < <(echo "${policy_json}" | jq -c '.conditional_required[]')
}

# --- Workflow Status Checking ---
fetch_workflow_runs() {
    local commit_sha="$1"
    local repo="$2"

    # In offline mode, convert status file to workflow runs format
    if [[ "${OFFLINE_MODE}" == "true" ]] && [[ -n "${OFFLINE_STATUS_FILE}" ]]; then
        log_info "Using offline status file: ${OFFLINE_STATUS_FILE}"
        # Convert status map to workflow runs format
        # Input: {"Workflow Name": "success", ...}
        # Output: [{"workflowName": "Workflow Name", "conclusion": "success", "status": "completed"}, ...]
        jq 'to_entries | map({
            workflowName: .key,
            name: .key,
            conclusion: .value,
            status: "completed",
            url: "offline://test",
            createdAt: "2026-01-08T00:00:00Z"
        })' "${OFFLINE_STATUS_FILE}"
        return
    fi

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

# --- JSON Report Generation ---
generate_json_report() {
    local runs_json="$1"
    local commit_sha="$2"
    local tag="$3"
    local base_ref="$4"
    local changed_count="$5"
    local changed_files="$6"

    local all_required_pass=true
    local has_pending=false
    local top_blocker=""
    local checks_json="[]"

    # Process always_required workflows
    for wf_name in "${ALWAYS_REQUIRED_WORKFLOWS[@]}"; do
        local result
        result=$(check_workflow_status "${wf_name}" "${runs_json}")

        local conclusion status url
        IFS=$'\t' read -r conclusion status url <<< "${result}"

        local check_status="success"
        if [[ "${conclusion}" == "SUCCESS" ]]; then
            check_status="success"
        elif [[ "${conclusion}" == "MISSING" ]] || [[ "${conclusion}" == "QUEUED" ]] || \
             [[ "${conclusion}" == "IN_PROGRESS" ]] || [[ "${conclusion}" == "PENDING" ]] || \
             [[ "${conclusion}" == "WAITING" ]]; then
            check_status="pending"
            all_required_pass=false
            has_pending=true
            [[ -z "${top_blocker}" ]] && top_blocker="${wf_name}"
        else
            check_status="failure"
            all_required_pass=false
            [[ -z "${top_blocker}" ]] && top_blocker="${wf_name}"
        fi

        checks_json=$(echo "${checks_json}" | jq --arg name "${wf_name}" \
            --arg required "always" \
            --arg status "${check_status}" \
            --arg conclusion "${conclusion}" \
            --arg url "${url}" \
            '. + [{
                name: $name,
                required: $required,
                status: $status,
                conclusion: $conclusion,
                url: $url
            }]')
    done

    # Process conditional_required workflows
    for wf_name in "${!CONDITIONAL_WORKFLOW_STATUS[@]}"; do
        local is_required="${CONDITIONAL_WORKFLOW_STATUS[${wf_name}]}"

        local result
        result=$(check_workflow_status "${wf_name}" "${runs_json}")

        local conclusion status url
        IFS=$'\t' read -r conclusion status url <<< "${result}"

        local check_status required_type

        if [[ "${is_required}" == "SKIPPED" ]]; then
            check_status="skipped"
            required_type="conditional_skipped"
        elif [[ "${conclusion}" == "SUCCESS" ]]; then
            check_status="success"
            required_type="conditional"
        elif [[ "${conclusion}" == "MISSING" ]] || [[ "${conclusion}" == "QUEUED" ]] || \
             [[ "${conclusion}" == "IN_PROGRESS" ]] || [[ "${conclusion}" == "PENDING" ]] || \
             [[ "${conclusion}" == "WAITING" ]]; then
            check_status="pending"
            required_type="conditional"
            all_required_pass=false
            has_pending=true
            [[ -z "${top_blocker}" ]] && top_blocker="${wf_name}"
        else
            check_status="failure"
            required_type="conditional"
            all_required_pass=false
            [[ -z "${top_blocker}" ]] && top_blocker="${wf_name}"
        fi

        checks_json=$(echo "${checks_json}" | jq --arg name "${wf_name}" \
            --arg required "${required_type}" \
            --arg status "${check_status}" \
            --arg conclusion "${conclusion}" \
            --arg url "${url}" \
            '. + [{
                name: $name,
                required: $required,
                status: $status,
                conclusion: $conclusion,
                url: $url
            }]')
    done

    # Determine promotable_state
    local promotable_state
    if [[ "${all_required_pass}" == "true" ]]; then
        promotable_state="success"
    elif [[ "${has_pending}" == "true" ]]; then
        promotable_state="pending"
    else
        promotable_state="blocked"
    fi

    # Build final JSON report
    local report
    report=$(jq -n \
        --arg state "${promotable_state}" \
        --arg blocker "${top_blocker}" \
        --arg tag "${tag}" \
        --arg commit "${commit_sha}" \
        --arg base "${base_ref}" \
        --argjson changed_count "${changed_count}" \
        --argjson checks "${checks_json}" \
        --arg timestamp "$(date -u +%Y-%m-%dT%H:%M:%SZ)" \
        --arg version "${SCRIPT_VERSION}" \
        '{
            promotable_state: $state,
            top_blocker: (if $blocker == "" then null else $blocker end),
            tag: $tag,
            commit_sha: $commit,
            base_sha: $base,
            changed_files_count: $changed_count,
            checks: $checks,
            generated_at: $timestamp,
            generator_version: $version
        }')

    echo "${report}"

    # Return appropriate exit code
    if [[ "${promotable_state}" == "success" ]]; then
        return 0
    else
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
            --report-only)
                REPORT_ONLY=true
                shift
                ;;
            --offline-status-file)
                OFFLINE_STATUS_FILE="$2"
                OFFLINE_MODE=true
                shift 2
                ;;
            --offline-changed-files)
                OFFLINE_CHANGED_FILES="$2"
                OFFLINE_MODE=true
                shift 2
                ;;
            --offline-policy-file)
                OFFLINE_POLICY_FILE="$2"
                OFFLINE_MODE=true
                shift 2
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

    # Enable offline mode if any offline flag is set
    if [[ -n "${OFFLINE_STATUS_FILE}" ]] || [[ -n "${OFFLINE_CHANGED_FILES}" ]] || [[ -n "${OFFLINE_POLICY_FILE}" ]]; then
        OFFLINE_MODE=true
        log_info "Running in OFFLINE/TEST mode"
    fi

    # Validate required arguments
    if [[ -z "${tag}" ]]; then
        log_error "Missing required argument: --tag"
        print_usage
        exit 2
    fi

    # Pre-flight checks
    check_dependencies

    # Default commit to HEAD if not specified (use placeholder in offline mode)
    if [[ -z "${commit_sha}" ]]; then
        if [[ "${OFFLINE_MODE}" == "true" ]]; then
            commit_sha="0000000000000000000000000000000000000000"
            log_info "Using placeholder commit for offline mode"
        else
            commit_sha=$(git rev-parse HEAD)
            log_info "Using current HEAD: ${commit_sha:0:7}"
        fi
    else
        # Resolve short SHA to full SHA (skip in offline mode)
        if [[ "${OFFLINE_MODE}" != "true" ]]; then
            commit_sha=$(git rev-parse "${commit_sha}")
        fi
    fi

    # Compute base reference (uses policy-defined algorithm)
    # In offline mode with explicit base, skip computation
    if [[ -z "${base_ref}" ]]; then
        if [[ "${OFFLINE_MODE}" == "true" ]]; then
            base_ref="offline-base"
            log_info "Using placeholder base for offline mode"
        else
            log_info "Computing base reference..."
            base_ref=$(compute_base_if_needed "${tag}" "${commit_sha}" "${base_ref}")
        fi
    fi
    log_info "Using base: ${base_ref}"

    log_info "=== Promotion Gate Verification ==="
    log_info "Script version: ${SCRIPT_VERSION}"
    log_info "Policy file: ${POLICY_FILE}"
    log_info "Tag: ${tag}"
    log_info "Commit: ${commit_sha:0:7} (${commit_sha})"
    log_info "Base: ${base_ref}"
    log_info "Branch: ${branch}"
    echo ""

    # Get repo info (use placeholder in offline mode)
    local repo
    if [[ "${OFFLINE_MODE}" == "true" ]]; then
        repo="offline/test-repo"
        log_info "Repository: ${repo} (offline mode)"
    else
        repo=$(get_repo_info)
        log_info "Repository: ${repo}"
    fi
    echo ""

    # Get changed files (use file input in offline mode)
    log_info "Computing changed files..."
    local changed_files
    if [[ "${OFFLINE_MODE}" == "true" ]] && [[ -n "${OFFLINE_CHANGED_FILES}" ]]; then
        if [[ -f "${OFFLINE_CHANGED_FILES}" ]]; then
            changed_files=$(cat "${OFFLINE_CHANGED_FILES}")
            log_info "Using offline changed files from: ${OFFLINE_CHANGED_FILES}"
        else
            log_error "Offline changed files not found: ${OFFLINE_CHANGED_FILES}"
            exit 2
        fi
    elif [[ "${OFFLINE_MODE}" == "true" ]]; then
        # No changed files specified in offline mode - assume empty
        changed_files=""
        log_info "No changed files specified (offline mode)"
    else
        changed_files=$(get_changed_files "${base_ref}" "${commit_sha}")
    fi
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

    # Generate output based on mode
    if [[ "${REPORT_ONLY}" == "true" ]]; then
        # JSON report mode - output to stdout, no decorations
        if generate_json_report "${runs_json}" "${commit_sha}" "${tag}" "${base_ref}" "${changed_count}" "${changed_files}"; then
            exit 0
        else
            exit 1
        fi
    else
        # Interactive truth table mode
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
    fi
}

# Run main
main "$@"
