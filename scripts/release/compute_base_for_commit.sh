#!/usr/bin/env bash
# compute_base_for_commit.sh v1.0.0
# Computes the deterministic base reference for changed file detection.
#
# This script determines the appropriate base commit for computing
# which files changed, which in turn determines conditional required checks.
#
# Authority: docs/ci/REQUIRED_CHECKS_POLICY.yml
# Purpose: Ensure consistent base selection across RC and GA pipelines

set -euo pipefail

SCRIPT_VERSION="1.0.0"

# --- Color output ---
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

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

print_usage() {
    cat <<EOF
Usage: $0 [OPTIONS]

Computes the deterministic base reference for changed file detection.
Used by promotion guard to determine which conditional checks are required.

OPTIONS:
    --tag TAG          Tag being verified (e.g., v4.1.2-rc.1 or v4.1.2)
    --commit SHA       Commit SHA (default: resolved from tag)
    --main-branch BR   Main branch name (default: main)
    --verbose          Enable verbose logging
    --json             Output result as JSON
    --help             Show this help message

OUTPUT:
    Prints the computed base reference to stdout.
    Use: BASE=\$(./compute_base_for_commit.sh --tag v4.1.2-rc.1)

ALGORITHM:
    For RC tags (v*.*.*-rc.*):
      1. Look for previous RC tag with same base version
      2. If none, look for previous GA tag in release line
      3. If none, use merge-base with main

    For GA tags (v*.*.*):
      1. Look for corresponding RC tag (lineage)
      2. Use RC tag's base for consistency
      3. This ensures GA checks match RC checks

EXAMPLES:
    # Get base for RC tag
    $0 --tag v4.1.2-rc.1

    # Get base for GA tag
    $0 --tag v4.1.2

    # With verbose output
    $0 --tag v4.1.2-rc.2 --verbose

EXIT CODES:
    0  Base computed successfully
    1  Failed to compute base
    2  Invalid arguments
EOF
}

# Extract version components from tag
parse_tag() {
    local tag="$1"

    if [[ "${tag}" =~ ^v([0-9]+)\.([0-9]+)\.([0-9]+)(-rc\.([0-9]+))?$ ]]; then
        MAJOR="${BASH_REMATCH[1]}"
        MINOR="${BASH_REMATCH[2]}"
        PATCH="${BASH_REMATCH[3]}"
        RC_SUFFIX="${BASH_REMATCH[4]:-}"
        RC_NUM="${BASH_REMATCH[5]:-}"
        BASE_VERSION="${MAJOR}.${MINOR}.${PATCH}"

        if [[ -n "${RC_SUFFIX}" ]]; then
            TAG_TYPE="rc"
        else
            TAG_TYPE="ga"
        fi
        return 0
    else
        return 1
    fi
}

# Find previous RC tag for same version
find_previous_rc() {
    local base_version="$1"
    local current_rc_num="$2"

    if [[ -z "${current_rc_num}" ]]; then
        # Looking for any RC for this version
        git tag -l "v${base_version}-rc.*" --sort=-v:refname 2>/dev/null | head -n1 || echo ""
    elif [[ "${current_rc_num}" -gt 1 ]]; then
        # Looking for previous RC (e.g., rc.1 for rc.2)
        local prev_num=$((current_rc_num - 1))
        local prev_tag="v${base_version}-rc.${prev_num}"
        if git rev-parse "${prev_tag}" &>/dev/null; then
            echo "${prev_tag}"
        else
            echo ""
        fi
    else
        echo ""
    fi
}

# Find previous GA tag in release line
find_previous_ga() {
    local major="$1"
    local minor="$2"
    local patch="$3"

    # Try previous patch version
    if [[ "${patch}" -gt 0 ]]; then
        local prev_patch=$((patch - 1))
        local prev_tag="v${major}.${minor}.${prev_patch}"
        if git rev-parse "${prev_tag}" &>/dev/null; then
            echo "${prev_tag}"
            return
        fi
    fi

    # Try previous minor version
    if [[ "${minor}" -gt 0 ]]; then
        local prev_minor=$((minor - 1))
        # Find highest patch in previous minor
        local pattern="v${major}.${prev_minor}.*"
        git tag -l "${pattern}" --sort=-v:refname 2>/dev/null | grep -E "^v${major}\.${prev_minor}\.[0-9]+$" | head -n1 || echo ""
        return
    fi

    echo ""
}

# Compute base for RC tag
compute_rc_base() {
    local tag="$1"
    local verbose="$2"

    [[ "${verbose}" == "true" ]] && log_info "Computing base for RC tag: ${tag}"

    # Step 1: Look for previous RC with same base version
    local prev_rc
    prev_rc=$(find_previous_rc "${BASE_VERSION}" "${RC_NUM}")
    if [[ -n "${prev_rc}" ]]; then
        [[ "${verbose}" == "true" ]] && log_info "Found previous RC: ${prev_rc}"
        echo "${prev_rc}"
        return 0
    fi

    # Step 2: Look for previous GA in release line
    local prev_ga
    prev_ga=$(find_previous_ga "${MAJOR}" "${MINOR}" "${PATCH}")
    if [[ -n "${prev_ga}" ]]; then
        [[ "${verbose}" == "true" ]] && log_info "Found previous GA: ${prev_ga}"
        echo "${prev_ga}"
        return 0
    fi

    # Step 3: Use merge-base with main
    [[ "${verbose}" == "true" ]] && log_info "No previous tag found, using merge-base with ${MAIN_BRANCH}"
    local merge_base
    merge_base=$(git merge-base "origin/${MAIN_BRANCH}" HEAD 2>/dev/null || git merge-base "${MAIN_BRANCH}" HEAD 2>/dev/null || echo "")

    if [[ -n "${merge_base}" ]]; then
        echo "${merge_base}"
        return 0
    fi

    # Fallback: parent commit
    [[ "${verbose}" == "true" ]] && log_warn "Merge-base failed, using parent commit"
    echo "HEAD^"
}

# Compute base for GA tag
compute_ga_base() {
    local tag="$1"
    local commit="$2"
    local verbose="$3"

    [[ "${verbose}" == "true" ]] && log_info "Computing base for GA tag: ${tag}"

    # Step 1: Find corresponding RC tag (lineage)
    local rc_pattern="v${BASE_VERSION}-rc.*"
    local matching_rc=""

    # Find RC tags with same SHA
    while IFS= read -r rc_tag; do
        [[ -z "${rc_tag}" ]] && continue
        local rc_sha
        rc_sha=$(git rev-parse "${rc_tag}^{}" 2>/dev/null || git rev-parse "${rc_tag}" 2>/dev/null || echo "")
        if [[ "${rc_sha}" == "${commit}" ]]; then
            matching_rc="${rc_tag}"
            break
        fi
    done < <(git tag -l "${rc_pattern}" --sort=-v:refname 2>/dev/null)

    if [[ -n "${matching_rc}" ]]; then
        [[ "${verbose}" == "true" ]] && log_info "Found matching RC tag: ${matching_rc} (same SHA)"

        # Parse RC tag to get its base
        local rc_rc_num
        if [[ "${matching_rc}" =~ -rc\.([0-9]+)$ ]]; then
            rc_rc_num="${BASH_REMATCH[1]}"
        fi

        # For GA, use same base as RC to ensure identical checks
        # If RC was rc.1, base is previous GA or merge-base
        # If RC was rc.2+, base is previous RC
        if [[ -n "${rc_rc_num}" ]] && [[ "${rc_rc_num}" -gt 1 ]]; then
            local prev_rc_num=$((rc_rc_num - 1))
            local prev_rc="v${BASE_VERSION}-rc.${prev_rc_num}"
            if git rev-parse "${prev_rc}" &>/dev/null; then
                [[ "${verbose}" == "true" ]] && log_info "Using RC's base: ${prev_rc}"
                echo "${prev_rc}"
                return 0
            fi
        fi

        # RC.1 case: use same logic as RC base computation
        local prev_ga
        prev_ga=$(find_previous_ga "${MAJOR}" "${MINOR}" "${PATCH}")
        if [[ -n "${prev_ga}" ]]; then
            [[ "${verbose}" == "true" ]] && log_info "Using previous GA: ${prev_ga}"
            echo "${prev_ga}"
            return 0
        fi
    else
        [[ "${verbose}" == "true" ]] && log_warn "No matching RC found for GA ${tag}"
    fi

    # Fallback: merge-base with main
    [[ "${verbose}" == "true" ]] && log_info "Using merge-base with ${MAIN_BRANCH}"
    local merge_base
    merge_base=$(git merge-base "origin/${MAIN_BRANCH}" HEAD 2>/dev/null || git merge-base "${MAIN_BRANCH}" HEAD 2>/dev/null || echo "")

    if [[ -n "${merge_base}" ]]; then
        echo "${merge_base}"
        return 0
    fi

    echo "HEAD^"
}

# --- Main execution ---
main() {
    local tag=""
    local commit=""
    local verbose=false
    local json_output=false
    MAIN_BRANCH="main"

    # Parse arguments
    while [[ $# -gt 0 ]]; do
        case $1 in
            --tag)
                tag="$2"
                shift 2
                ;;
            --commit)
                commit="$2"
                shift 2
                ;;
            --main-branch)
                MAIN_BRANCH="$2"
                shift 2
                ;;
            --verbose)
                verbose=true
                shift
                ;;
            --json)
                json_output=true
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

    # Parse tag
    if ! parse_tag "${tag}"; then
        log_error "Invalid tag format: ${tag}. Expected vX.Y.Z or vX.Y.Z-rc.N"
        exit 1
    fi

    [[ "${verbose}" == "true" ]] && log_info "Tag type: ${TAG_TYPE}"
    [[ "${verbose}" == "true" ]] && log_info "Base version: ${BASE_VERSION}"

    # Resolve commit if not provided
    if [[ -z "${commit}" ]]; then
        commit=$(git rev-parse "${tag}^{}" 2>/dev/null || git rev-parse "${tag}" 2>/dev/null || git rev-parse HEAD)
    fi

    [[ "${verbose}" == "true" ]] && log_info "Commit: ${commit}"

    # Compute base based on tag type
    local base
    if [[ "${TAG_TYPE}" == "rc" ]]; then
        base=$(compute_rc_base "${tag}" "${verbose}")
    else
        base=$(compute_ga_base "${tag}" "${commit}" "${verbose}")
    fi

    if [[ -z "${base}" ]]; then
        log_error "Failed to compute base reference"
        exit 1
    fi

    # Output result
    if [[ "${json_output}" == "true" ]]; then
        cat <<EOF
{
  "tag": "${tag}",
  "tag_type": "${TAG_TYPE}",
  "base_version": "${BASE_VERSION}",
  "commit": "${commit}",
  "base": "${base}",
  "computed_at": "$(date -u +%Y-%m-%dT%H:%M:%SZ)"
}
EOF
    else
        echo "${base}"
    fi

    [[ "${verbose}" == "true" ]] && log_success "Computed base: ${base}"
}

main "$@"
