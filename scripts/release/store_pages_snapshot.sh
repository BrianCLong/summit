#!/usr/bin/env bash
# store_pages_snapshot.sh v1.0.0
# Manages Pages site snapshots for rollback capability
#
# This script stores and restores known-good site snapshots to enable
# automatic rollback when redaction health is FAIL.
#
# Storage: Uses a dedicated branch `release-ops-pages-snapshots`
# Structure:
#   snapshots/
#     LATEST              # Contains ID of latest known-good snapshot
#     <snapshot_id>/      # Individual snapshot directories
#       SHA256SUMS        # Integrity checksums
#       index.html
#       release_ops_single_page.html
#       release_ops_single_page.md
#       cycle_summary.md
#       dashboard_summary.json
#       redaction_health.json
#
# Authority: docs/ci/PAGES_ROLLBACK.md

set -euo pipefail

# --- Configuration ---
SCRIPT_VERSION="1.0.0"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(git rev-parse --show-toplevel 2>/dev/null || echo ".")"

# Snapshot branch name
SNAPSHOT_BRANCH="release-ops-pages-snapshots"
# Directory within branch for snapshots
SNAPSHOT_DIR="snapshots"
# Maximum snapshots to retain
MAX_SNAPSHOTS=10

# Files allowed in snapshots (must match PAGES_PUBLISH_ALLOWLIST.md)
ALLOWED_FILES=(
    "index.html"
    "release_ops_single_page.html"
    "release_ops_single_page.md"
    "cycle_summary.md"
    "dashboard_summary.json"
    "redaction_health.json"
    "rollback_report.md"
    "rollback_report.json"
    "deployment_marker.json"
    "deployment_marker.html"
)

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
Usage: $0 --mode <store|restore> [OPTIONS]

Manages Pages site snapshots for rollback capability.

MODES:
    store               Store current site as a new snapshot
    restore             Restore the latest known-good snapshot

OPTIONS:
    --mode MODE         Required: store or restore
    --site-dir DIR      Site directory (default: site/release-ops)
    --snapshot-id ID    Snapshot ID for store (default: auto-generated)
    --run-id ID         GitHub run ID (for snapshot metadata)
    --dry-run           Show what would be done without making changes
    --verbose           Enable verbose logging
    --help              Show this help message

EXAMPLES:
    # Store current site as snapshot
    $0 --mode store --site-dir site/release-ops --run-id 12345

    # Restore latest snapshot
    $0 --mode restore --site-dir site/release-ops

    # Dry run restore
    $0 --mode restore --site-dir site/release-ops --dry-run
EOF
}

# --- Utilities ---

generate_snapshot_id() {
    local run_id="$1"
    local timestamp
    timestamp=$(date -u +%Y%m%d-%H%M%S)

    if [[ -n "${run_id}" ]]; then
        echo "${timestamp}-${run_id}"
    else
        echo "${timestamp}"
    fi
}

verify_allowed_files() {
    local site_dir="$1"
    local verbose="$2"

    log_info "Verifying site contains only allowed files..."

    local has_violations=false

    # Check each file in site dir
    while IFS= read -r -d '' file; do
        local filename
        filename=$(basename "${file}")
        local rel_path="${file#${site_dir}/}"

        # Skip directories
        [[ -d "${file}" ]] && continue

        # Check if file is in allowed list
        local allowed=false
        for allowed_file in "${ALLOWED_FILES[@]}"; do
            if [[ "${filename}" == "${allowed_file}" ]]; then
                allowed=true
                break
            fi
        done

        if [[ "${allowed}" != "true" ]]; then
            log_error "File not in allowlist: ${rel_path}"
            has_violations=true
        elif [[ "${verbose}" == "true" ]]; then
            log_info "  Allowed: ${rel_path}"
        fi
    done < <(find "${site_dir}" -type f -print0 2>/dev/null)

    if [[ "${has_violations}" == "true" ]]; then
        log_error "Site contains files not in allowlist - cannot store snapshot"
        return 1
    fi

    log_info "All files verified against allowlist"
    return 0
}

generate_checksums() {
    local site_dir="$1"
    local checksum_file="$2"

    log_info "Generating SHA256 checksums..."

    # Generate checksums for all files
    (cd "${site_dir}" && find . -type f ! -name "SHA256SUMS" -exec sha256sum {} \;) > "${checksum_file}"
}

verify_checksums() {
    local site_dir="$1"
    local checksum_file="$2"

    log_info "Verifying SHA256 checksums..."

    if [[ ! -f "${checksum_file}" ]]; then
        log_error "Checksum file not found: ${checksum_file}"
        return 1
    fi

    (cd "${site_dir}" && sha256sum -c "${checksum_file}") || {
        log_error "Checksum verification failed!"
        return 1
    }

    log_info "Checksum verification passed"
    return 0
}

# --- Snapshot Branch Management ---

ensure_snapshot_branch() {
    local dry_run="$1"

    # Check if snapshot branch exists
    if git show-ref --verify --quiet "refs/heads/${SNAPSHOT_BRANCH}" 2>/dev/null; then
        log_info "Snapshot branch exists: ${SNAPSHOT_BRANCH}"
        return 0
    fi

    # Check if it exists remotely
    if git ls-remote --exit-code --heads origin "${SNAPSHOT_BRANCH}" &>/dev/null; then
        log_info "Fetching snapshot branch from remote..."
        if [[ "${dry_run}" != "true" ]]; then
            git fetch origin "${SNAPSHOT_BRANCH}:${SNAPSHOT_BRANCH}"
        fi
        return 0
    fi

    # Create orphan branch
    log_info "Creating new snapshot branch: ${SNAPSHOT_BRANCH}"

    if [[ "${dry_run}" == "true" ]]; then
        log_info "[DRY RUN] Would create orphan branch ${SNAPSHOT_BRANCH}"
        return 0
    fi

    # Save current branch
    local current_branch
    current_branch=$(git rev-parse --abbrev-ref HEAD)

    # Create orphan branch with initial structure
    git checkout --orphan "${SNAPSHOT_BRANCH}"
    git rm -rf . 2>/dev/null || true
    mkdir -p "${SNAPSHOT_DIR}"
    echo "# Release Ops Pages Snapshots" > README.md
    echo "" >> README.md
    echo "This branch stores known-good snapshots of the Release Ops Pages site." >> README.md
    echo "Snapshots are used for automatic rollback when redaction health is FAIL." >> README.md
    echo "" >> README.md
    echo "See: docs/ci/PAGES_ROLLBACK.md" >> README.md

    git add README.md
    git commit -m "chore: initialize pages snapshot branch"

    # Return to original branch
    git checkout "${current_branch}"

    log_info "Created snapshot branch: ${SNAPSHOT_BRANCH}"
}

checkout_snapshot_branch() {
    local work_dir="$1"
    local dry_run="$2"

    if [[ "${dry_run}" == "true" ]]; then
        log_info "[DRY RUN] Would checkout ${SNAPSHOT_BRANCH} to ${work_dir}"
        return 0
    fi

    # Clone just the snapshot branch to a work directory
    mkdir -p "${work_dir}"

    # Use worktree for cleaner separation
    if git worktree list | grep -q "${work_dir}"; then
        log_info "Worktree already exists, removing..."
        git worktree remove "${work_dir}" --force 2>/dev/null || true
    fi

    git worktree add "${work_dir}" "${SNAPSHOT_BRANCH}"
}

cleanup_worktree() {
    local work_dir="$1"

    if [[ -d "${work_dir}" ]]; then
        git worktree remove "${work_dir}" --force 2>/dev/null || true
    fi
}

# --- Store Mode ---

store_snapshot() {
    local site_dir="$1"
    local snapshot_id="$2"
    local run_id="$3"
    local dry_run="$4"
    local verbose="$5"

    log_info "=== Storing Snapshot ==="
    log_info "  Site dir: ${site_dir}"
    log_info "  Snapshot ID: ${snapshot_id}"
    log_info "  Run ID: ${run_id:-N/A}"

    # Verify site exists
    if [[ ! -d "${site_dir}" ]]; then
        log_error "Site directory not found: ${site_dir}"
        return 1
    fi

    # Verify only allowed files
    verify_allowed_files "${site_dir}" "${verbose}" || return 1

    # Ensure snapshot branch exists
    ensure_snapshot_branch "${dry_run}"

    if [[ "${dry_run}" == "true" ]]; then
        log_info "[DRY RUN] Would store snapshot ${snapshot_id}"
        log_info "[DRY RUN] Files to store:"
        ls -la "${site_dir}/"
        return 0
    fi

    # Create work directory for snapshot branch
    local work_dir="${REPO_ROOT}/.snapshot-work"
    checkout_snapshot_branch "${work_dir}" "${dry_run}"

    # Create snapshot directory
    local snapshot_path="${work_dir}/${SNAPSHOT_DIR}/${snapshot_id}"
    mkdir -p "${snapshot_path}"

    # Copy allowed files
    for allowed_file in "${ALLOWED_FILES[@]}"; do
        if [[ -f "${site_dir}/${allowed_file}" ]]; then
            cp "${site_dir}/${allowed_file}" "${snapshot_path}/"
            [[ "${verbose}" == "true" ]] && log_info "  Copied: ${allowed_file}"
        fi
    done

    # Generate checksums
    generate_checksums "${snapshot_path}" "${snapshot_path}/SHA256SUMS"

    # Write metadata
    cat > "${snapshot_path}/metadata.json" <<EOF
{
  "snapshot_id": "${snapshot_id}",
  "run_id": ${run_id:-null},
  "created_at": "$(date -u +"%Y-%m-%dT%H:%M:%SZ")",
  "git_sha": "$(git rev-parse HEAD 2>/dev/null || echo "unknown")",
  "script_version": "${SCRIPT_VERSION}"
}
EOF

    # Update LATEST pointer
    echo "${snapshot_id}" > "${work_dir}/${SNAPSHOT_DIR}/LATEST"

    # Commit to snapshot branch
    (
        cd "${work_dir}"
        git add .
        git commit -m "snapshot: ${snapshot_id}"
    )

    # Push if remote exists
    if git remote get-url origin &>/dev/null; then
        log_info "Pushing snapshot to remote..."
        (cd "${work_dir}" && git push origin "${SNAPSHOT_BRANCH}")
    fi

    # Cleanup old snapshots
    cleanup_old_snapshots "${work_dir}" "${verbose}"

    # Cleanup worktree
    cleanup_worktree "${work_dir}"

    log_info "Snapshot stored: ${snapshot_id}"
    echo "${snapshot_id}"
}

cleanup_old_snapshots() {
    local work_dir="$1"
    local verbose="$2"

    local snapshot_base="${work_dir}/${SNAPSHOT_DIR}"

    # List snapshots by directory (excludes LATEST file)
    local count=0
    local to_delete=()

    while IFS= read -r snapshot_dir; do
        [[ -z "${snapshot_dir}" ]] && continue
        [[ ! -d "${snapshot_dir}" ]] && continue

        count=$((count + 1))
        if [[ ${count} -gt ${MAX_SNAPSHOTS} ]]; then
            to_delete+=("${snapshot_dir}")
        fi
    done < <(ls -1dt "${snapshot_base}"/*/ 2>/dev/null | grep -v "^$")

    if [[ ${#to_delete[@]} -gt 0 ]]; then
        log_info "Cleaning up ${#to_delete[@]} old snapshot(s)..."
        for dir in "${to_delete[@]}"; do
            [[ "${verbose}" == "true" ]] && log_info "  Removing: $(basename "${dir}")"
            rm -rf "${dir}"
        done

        (
            cd "${work_dir}"
            git add .
            git commit -m "chore: cleanup old snapshots" --allow-empty
        )
    fi
}

# --- Restore Mode ---

restore_snapshot() {
    local site_dir="$1"
    local dry_run="$2"
    local verbose="$3"

    log_info "=== Restoring Snapshot ==="
    log_info "  Site dir: ${site_dir}"

    # Ensure snapshot branch exists
    if ! git show-ref --verify --quiet "refs/heads/${SNAPSHOT_BRANCH}" 2>/dev/null; then
        if ! git ls-remote --exit-code --heads origin "${SNAPSHOT_BRANCH}" &>/dev/null; then
            log_error "No snapshot branch found: ${SNAPSHOT_BRANCH}"
            log_error ""
            log_error "This is likely a first-run scenario where no snapshots exist."
            log_error ""
            log_error "To bootstrap:"
            log_error "  1. Ensure redaction health is OK or WARN"
            log_error "  2. Run the Pages publish workflow"
            log_error "  3. A snapshot will be stored automatically"
            log_error ""
            log_error "Manual bootstrap:"
            log_error "  $0 --mode store --site-dir <path-to-valid-site>"
            return 1
        fi
        git fetch origin "${SNAPSHOT_BRANCH}:${SNAPSHOT_BRANCH}"
    fi

    # Create work directory
    local work_dir="${REPO_ROOT}/.snapshot-work"
    checkout_snapshot_branch "${work_dir}" "${dry_run}"

    # Read LATEST pointer
    local latest_file="${work_dir}/${SNAPSHOT_DIR}/LATEST"
    if [[ ! -f "${latest_file}" ]]; then
        cleanup_worktree "${work_dir}"
        log_error "No LATEST snapshot pointer found"
        log_error "No snapshots have been stored yet."
        log_error ""
        log_error "To create first snapshot, run with OK/WARN health:"
        log_error "  gh workflow run publish-release-ops-pages.yml"
        return 1
    fi

    local snapshot_id
    snapshot_id=$(cat "${latest_file}")
    local snapshot_path="${work_dir}/${SNAPSHOT_DIR}/${snapshot_id}"

    if [[ ! -d "${snapshot_path}" ]]; then
        cleanup_worktree "${work_dir}"
        log_error "Snapshot directory not found: ${snapshot_id}"
        return 1
    fi

    log_info "  Restoring snapshot: ${snapshot_id}"

    # Verify checksums
    verify_checksums "${snapshot_path}" "${snapshot_path}/SHA256SUMS" || {
        cleanup_worktree "${work_dir}"
        return 1
    }

    if [[ "${dry_run}" == "true" ]]; then
        log_info "[DRY RUN] Would restore snapshot ${snapshot_id} to ${site_dir}"
        log_info "[DRY RUN] Files to restore:"
        ls -la "${snapshot_path}/"
        cleanup_worktree "${work_dir}"
        return 0
    fi

    # Clear site directory
    rm -rf "${site_dir}"
    mkdir -p "${site_dir}"

    # Copy files (exclude metadata and checksums from public site)
    for file in "${snapshot_path}"/*; do
        local filename
        filename=$(basename "${file}")

        # Skip metadata files
        [[ "${filename}" == "SHA256SUMS" ]] && continue
        [[ "${filename}" == "metadata.json" ]] && continue

        cp "${file}" "${site_dir}/"
        [[ "${verbose}" == "true" ]] && log_info "  Restored: ${filename}"
    done

    # Cleanup worktree
    cleanup_worktree "${work_dir}"

    log_info "Snapshot restored: ${snapshot_id}"
    echo "${snapshot_id}"
}

# --- Main ---
main() {
    local mode=""
    local site_dir="site/release-ops"
    local snapshot_id=""
    local run_id=""
    local dry_run=false
    local verbose=false

    # Parse arguments
    while [[ $# -gt 0 ]]; do
        case $1 in
            --mode)
                mode="$2"
                shift 2
                ;;
            --site-dir)
                site_dir="$2"
                shift 2
                ;;
            --snapshot-id)
                snapshot_id="$2"
                shift 2
                ;;
            --run-id)
                run_id="$2"
                shift 2
                ;;
            --dry-run)
                dry_run=true
                shift
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

    # Validate mode
    if [[ -z "${mode}" ]]; then
        log_error "Missing required --mode"
        print_usage
        exit 1
    fi

    case "${mode}" in
        store)
            # Generate snapshot ID if not provided
            if [[ -z "${snapshot_id}" ]]; then
                snapshot_id=$(generate_snapshot_id "${run_id}")
            fi
            store_snapshot "${site_dir}" "${snapshot_id}" "${run_id}" "${dry_run}" "${verbose}"
            ;;
        restore)
            restore_snapshot "${site_dir}" "${dry_run}" "${verbose}"
            ;;
        *)
            log_error "Invalid mode: ${mode}"
            log_error "Mode must be 'store' or 'restore'"
            exit 1
            ;;
    esac
}

main "$@"
