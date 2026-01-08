#!/usr/bin/env bash
# prepare-stabilization-rc.sh v2.0.0
# Prepares a MVP-4 Post-GA Stabilization Release Candidate
#
# Authority: docs/releases/MVP-4_POST_GA_STABILIZATION_PLAN.md
# Scope: Creates release artifacts for stabilization RCs only
# Deterministic: Same commit SHA produces identical output

set -euo pipefail

# --- Configuration ---
SCRIPT_VERSION="2.0.0"
DRY_RUN="${DRY_RUN:-true}"  # Default to dry-run for safety
VERBOSE="${VERBOSE:-false}"
JSON_OUTPUT="${JSON_OUTPUT:-false}"  # Output JSON for CI integration
REPO_ROOT="$(git rev-parse --show-toplevel)"
ARTIFACTS_DIR="${REPO_ROOT}/artifacts/release"
TARGET_COMMIT=""  # Optional: specific commit SHA to tag

# --- Color output ---
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# --- Logging functions ---
log_info() {
    echo -e "${BLUE}[INFO]${NC} $*"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $*"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $*"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $*" >&2
}

log_verbose() {
    if [[ "${VERBOSE}" == "true" ]]; then
        echo -e "${BLUE}[VERBOSE]${NC} $*"
    fi
}

# --- Helper functions ---
print_usage() {
    cat <<EOF
Usage: $0 [OPTIONS]

Prepares a MVP-4 Post-GA Stabilization Release Candidate.

OPTIONS:
    --dry-run           Default mode. Prepare artifacts without tagging (default: true)
    --live              Execute actual git tag and commits
    --verbose           Enable verbose logging
    --version VERSION   Override version (e.g., v4.1.2-rc.1)
    --commit SHA        Target commit SHA (default: HEAD)
    --json              Output JSON for CI integration
    --help              Show this help message

EXAMPLES:
    # Dry run (safe, no mutations)
    $0 --dry-run

    # Live run with auto-detected version
    $0 --live

    # Live run with explicit version and commit
    $0 --live --version v4.1.2-rc.2 --commit a8b1963

    # CI mode with JSON output
    $0 --dry-run --json --commit \$(git rev-parse HEAD)

ENVIRONMENT VARIABLES:
    DRY_RUN     Set to 'false' for live mode (default: true)
    VERBOSE     Set to 'true' for verbose output (default: false)
    JSON_OUTPUT Set to 'true' for JSON output (default: false)

REFERENCES:
    Tagging Guide:  docs/releases/MVP-4_STABILIZATION_TAGGING.md
    Release Notes:  docs/releases/MVP-4_STABILIZATION_RELEASE_NOTES.md
    Evidence Pack:  docs/releases/MVP-4_STABILIZATION_EVIDENCE_PACK.md
EOF
}

check_working_tree() {
    log_info "Checking working tree status..."

    if ! git diff-index --quiet HEAD --; then
        log_error "Working tree is not clean. Commit or stash changes first."
        log_info "Uncommitted changes:"
        git status --short
        exit 1
    fi

    log_success "Working tree is clean"
}

detect_next_version() {
    log_info "Detecting next version..."

    # Find latest semver tag (vX.Y.Z or vX.Y.Z-rc.N)
    local latest_tag
    latest_tag=$(git tag --list 'v*.*.*' --sort=-v:refname | grep -E '^v[0-9]+\.[0-9]+\.[0-9]+(-rc\.[0-9]+)?$' | head -n1 || echo "")

    if [[ -z "${latest_tag}" ]]; then
        log_warn "No semver tags found, using package.json version as base"
        local pkg_version
        pkg_version=$(grep '"version"' "${REPO_ROOT}/package.json" | head -n1 | sed 's/.*"version": "\(.*\)".*/\1/')
        echo "v${pkg_version}-rc.1"
        return
    fi

    log_verbose "Latest tag: ${latest_tag}"

    # Parse tag
    local version="${latest_tag#v}"  # Remove 'v' prefix

    # Check if it's an RC tag
    if [[ "${version}" =~ ^([0-9]+)\.([0-9]+)\.([0-9]+)-rc\.([0-9]+)$ ]]; then
        # It's an RC - increment RC number
        local major="${BASH_REMATCH[1]}"
        local minor="${BASH_REMATCH[2]}"
        local patch="${BASH_REMATCH[3]}"
        local rc="${BASH_REMATCH[4]}"
        local next_rc=$((rc + 1))
        echo "v${major}.${minor}.${patch}-rc.${next_rc}"
    elif [[ "${version}" =~ ^([0-9]+)\.([0-9]+)\.([0-9]+)$ ]]; then
        # It's a GA tag - increment patch and start at rc.1
        local major="${BASH_REMATCH[1]}"
        local minor="${BASH_REMATCH[2]}"
        local patch="${BASH_REMATCH[3]}"
        local next_patch=$((patch + 1))
        echo "v${major}.${minor}.${next_patch}-rc.1"
    else
        log_error "Cannot parse tag: ${latest_tag}"
        exit 1
    fi
}

get_commit_range() {
    local base_tag="$1"

    log_info "Determining commit range..."

    # Find the last semver tag before current HEAD
    local last_semver_tag
    last_semver_tag=$(git tag --list 'v*.*.*' --sort=-v:refname --merged HEAD | grep -E '^v[0-9]+\.[0-9]+\.[0-9]+(-rc\.[0-9]+)?$' | head -n1 || echo "")

    if [[ -z "${last_semver_tag}" ]]; then
        log_warn "No previous semver tag found, using last 50 commits"
        echo "HEAD~50..HEAD"
    else
        log_verbose "Base tag: ${last_semver_tag}"
        echo "${last_semver_tag}..HEAD"
    fi
}

generate_commit_list() {
    local range="$1"
    local output_file="$2"

    log_info "Generating commit list for range: ${range}"

    git log --oneline --no-merges "${range}" > "${output_file}"
    local commit_count
    commit_count=$(wc -l < "${output_file}" | tr -d ' ')

    log_success "Generated ${commit_count} commits to ${output_file}"
}

generate_evidence_json() {
    local tag="$1"
    local commit_sha="$2"
    local output_file="$3"

    log_info "Generating evidence.json..."

    cat > "${output_file}" <<EOF
{
  "version": "1.0.0",
  "release": {
    "tag": "${tag}",
    "commit_sha": "${commit_sha}",
    "generated_at": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
    "generated_by": "prepare-stabilization-rc.sh v${SCRIPT_VERSION}"
  },
  "verification": {
    "commands": [
      "pnpm ga:verify",
      "pnpm --filter intelgraph-server test:ci",
      "pnpm run security:check",
      "pnpm run generate:sbom",
      "docker build -t intelgraph:${tag} ."
    ],
    "ci_workflows": [
      ".github/workflows/ci-core.yml",
      ".github/workflows/unit-test-coverage.yml",
      ".github/workflows/workflow-lint.yml",
      ".github/workflows/supply-chain-integrity.yml",
      ".github/workflows/ga-gate.yml"
    ]
  },
  "deterministic": true,
  "reproducible": {
    "command": "git checkout ${commit_sha} && ./scripts/release/prepare-stabilization-rc.sh --dry-run",
    "note": "Same commit SHA produces identical artifacts"
  }
}
EOF

    log_success "Generated evidence.json"
}

create_release_artifacts() {
    local tag="$1"
    local commit_sha="$2"

    log_info "Creating release artifacts for ${tag}..."

    local artifact_dir="${ARTIFACTS_DIR}/${tag}"
    mkdir -p "${artifact_dir}"

    log_verbose "Artifact directory: ${artifact_dir}"

    # Generate commit range
    local commit_range
    commit_range=$(get_commit_range "${tag}")

    # Generate commit list
    generate_commit_list "${commit_range}" "${artifact_dir}/commits.txt"

    # Generate evidence JSON
    generate_evidence_json "${tag}" "${commit_sha}" "${artifact_dir}/evidence.json"

    # Copy release notes template
    if [[ -f "${REPO_ROOT}/docs/releases/MVP-4_STABILIZATION_RELEASE_NOTES.md" ]]; then
        cp "${REPO_ROOT}/docs/releases/MVP-4_STABILIZATION_RELEASE_NOTES.md" "${artifact_dir}/release_notes.md"
        log_success "Copied release notes template"
    fi

    # Copy evidence pack template
    if [[ -f "${REPO_ROOT}/docs/releases/MVP-4_STABILIZATION_EVIDENCE_PACK.md" ]]; then
        cp "${REPO_ROOT}/docs/releases/MVP-4_STABILIZATION_EVIDENCE_PACK.md" "${artifact_dir}/evidence_pack.md"
        log_success "Copied evidence pack template"
    fi

    # Generate GitHub release payload
    cat > "${artifact_dir}/github_release.md" <<EOF
# ${tag}

MVP-4 Post-GA Stabilization Release Candidate

## Quick Start

\`\`\`bash
# Verify the release
pnpm ga:verify

# Check CI status
gh run list --commit ${commit_sha}
\`\`\`

## Documentation

- [Full Release Notes](${artifact_dir}/release_notes.md)
- [Evidence Pack](${artifact_dir}/evidence_pack.md)
- [Commits](${artifact_dir}/commits.txt)

## Verification

This RC must pass all gates before promotion to GA. See evidence pack for details.

---

Generated by: prepare-stabilization-rc.sh v${SCRIPT_VERSION}
Commit: ${commit_sha}
EOF

    # Generate operator commands script
    cat > "${artifact_dir}/commands.sh" <<EOF
#!/usr/bin/env bash
# RC Preparation Commands for ${tag}
# Generated: $(date -u +%Y-%m-%dT%H:%M:%SZ)
# Commit: ${commit_sha}
#
# Run these commands to create and publish the RC tag.

set -euo pipefail

echo "=== RC Preparation: ${tag} ==="
echo "Commit: ${commit_sha}"
echo ""

# Step 1: Create the annotated tag
echo "Step 1: Creating tag ${tag}..."
git tag -a "${tag}" ${commit_sha} -m "MVP-4 Stabilization Release Candidate ${tag}

Stabilization focus:
- CI hardening and workflow reliability
- Test determinism improvements
- Docker build optimization
- TypeScript strict mode compliance

Commit: ${commit_sha}
Date: \$(date -u +%Y-%m-%dT%H:%M:%SZ)
Generated by: prepare-stabilization-rc.sh v${SCRIPT_VERSION}"

echo "✅ Tag created: ${tag}"

# Step 2: Push the tag
echo ""
echo "Step 2: Pushing tag to origin..."
git push origin "${tag}"
echo "✅ Tag pushed: ${tag}"

# Step 3: Create GitHub Release (optional)
echo ""
echo "Step 3: Creating GitHub Release..."
gh release create "${tag}" \\
  --title "${tag} - MVP-4 Stabilization RC" \\
  --notes-file "${artifact_dir}/github_release.md" \\
  --prerelease
echo "✅ GitHub Release created"

echo ""
echo "=== RC ${tag} Published Successfully ==="
echo ""
echo "Next steps:"
echo "  1. Monitor CI: gh run list --commit ${commit_sha}"
echo "  2. Wait 24-48h for stability"
echo "  3. Promote to GA: ./scripts/release/build-promotion-bundle.sh --tag ${tag} --commit ${commit_sha}"
EOF
    chmod +x "${artifact_dir}/commands.sh"
    log_success "Generated commands.sh"

    # Generate summary JSON for CI
    cat > "${artifact_dir}/summary.json" <<EOF
{
  "tag": "${tag}",
  "commit_sha": "${commit_sha}",
  "commit_short": "${commit_sha:0:7}",
  "generated_at": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "script_version": "${SCRIPT_VERSION}",
  "artifact_dir": "${artifact_dir}",
  "files": [
    "commits.txt",
    "evidence.json",
    "github_release.md",
    "commands.sh",
    "summary.json"
  ],
  "next_steps": {
    "create_tag": "git tag -a ${tag} ${commit_sha} -m 'RC ${tag}'",
    "push_tag": "git push origin ${tag}",
    "create_release": "gh release create ${tag} --prerelease"
  }
}
EOF
    log_success "Generated summary.json"

    log_success "Release artifacts created in ${artifact_dir}/"
}

print_next_steps() {
    local tag="$1"
    local commit_sha="$2"
    local mode="$3"

    echo ""
    log_success "=================================="
    log_success "Release preparation complete!"
    log_success "=================================="
    echo ""
    log_info "Tag: ${tag}"
    log_info "Commit: ${commit_sha}"
    log_info "Mode: ${mode}"
    echo ""

    if [[ "${mode}" == "DRY-RUN" ]]; then
        log_warn "This was a DRY RUN. No git tags were created."
        echo ""
        log_info "Artifacts generated in: ${ARTIFACTS_DIR}/${tag}/"
        echo ""
        log_info "NEXT STEPS (when CI is green):"
        echo ""
        echo "  1. Verify CI is green:"
        echo "     ${BLUE}gh run list --commit ${commit_sha}${NC}"
        echo ""
        echo "  2. Run local verification:"
        echo "     ${BLUE}pnpm ga:verify${NC}"
        echo ""
        echo "  3. Create the RC tag (LIVE MODE):"
        echo "     ${BLUE}DRY_RUN=false $0${NC}"
        echo ""
        echo "  4. Push the tag:"
        echo "     ${BLUE}git push origin ${tag}${NC}"
        echo ""
    else
        log_success "Tag ${tag} created successfully!"
        echo ""
        log_info "NEXT STEPS:"
        echo ""
        echo "  1. Push the tag to origin:"
        echo "     ${BLUE}git push origin ${tag}${NC}"
        echo ""
        echo "  2. Monitor CI workflows:"
        echo "     ${BLUE}gh run watch${NC}"
        echo ""
        echo "  3. Review evidence pack:"
        echo "     ${BLUE}cat ${ARTIFACTS_DIR}/${tag}/evidence_pack.md${NC}"
        echo ""
        echo "  4. After 24-48 hours of stability, promote to GA:"
        echo "     ${BLUE}See docs/releases/MVP-4_STABILIZATION_PROMOTION.md${NC}"
        echo ""
    fi
}

# --- Main execution ---
main() {
    local version_override=""

    # Parse arguments
    while [[ $# -gt 0 ]]; do
        case $1 in
            --dry-run)
                DRY_RUN=true
                shift
                ;;
            --live)
                DRY_RUN=false
                shift
                ;;
            --verbose)
                VERBOSE=true
                shift
                ;;
            --json)
                JSON_OUTPUT=true
                shift
                ;;
            --version)
                version_override="$2"
                shift 2
                ;;
            --commit)
                TARGET_COMMIT="$2"
                shift 2
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

    log_info "=== MVP-4 Stabilization RC Preparation ==="
    log_info "Script version: ${SCRIPT_VERSION}"
    log_info "Mode: $([ "${DRY_RUN}" == "true" ] && echo "DRY-RUN" || echo "LIVE")"
    echo ""

    # Pre-flight checks (skip in CI if using explicit commit)
    if [[ -z "${TARGET_COMMIT}" ]]; then
        check_working_tree
    fi

    # Detect or use override version
    local next_version
    if [[ -n "${version_override}" ]]; then
        # Ensure version has 'v' prefix
        if [[ "${version_override}" != v* ]]; then
            next_version="v${version_override}"
        else
            next_version="${version_override}"
        fi
        log_info "Using version override: ${next_version}"
    else
        next_version=$(detect_next_version)
        log_success "Auto-detected next version: ${next_version}"
    fi

    # Get commit SHA (use TARGET_COMMIT if provided, otherwise HEAD)
    local commit_sha
    if [[ -n "${TARGET_COMMIT}" ]]; then
        commit_sha=$(git rev-parse "${TARGET_COMMIT}")
        log_info "Using target commit: ${commit_sha}"
    else
        commit_sha=$(git rev-parse HEAD)
        log_info "Current commit: ${commit_sha}"
    fi
    echo ""

    # Create release artifacts
    create_release_artifacts "${next_version}" "${commit_sha}"

    # Create git tag (if not dry-run)
    if [[ "${DRY_RUN}" != "true" ]]; then
        log_info "Creating git tag ${next_version}..."

        git tag -a "${next_version}" -m "MVP-4 Stabilization Release Candidate ${next_version}

Stabilization focus:
- CI hardening and workflow reliability
- Test determinism improvements
- Docker build optimization
- TypeScript strict mode compliance

Commit: ${commit_sha}
Date: $(date -u +%Y-%m-%dT%H:%M:%SZ)
Generated by: prepare-stabilization-rc.sh v${SCRIPT_VERSION}"

        log_success "Tag ${next_version} created"
    fi

    # Print next steps (unless JSON mode)
    if [[ "${JSON_OUTPUT}" != "true" ]]; then
        print_next_steps "${next_version}" "${commit_sha}" "$([ "${DRY_RUN}" == "true" ] && echo "DRY-RUN" || echo "LIVE")"
    fi

    # Output JSON for CI integration
    if [[ "${JSON_OUTPUT}" == "true" ]]; then
        cat <<EOF
{
  "status": "success",
  "tag": "${next_version}",
  "commit_sha": "${commit_sha}",
  "commit_short": "${commit_sha:0:7}",
  "artifact_dir": "${ARTIFACTS_DIR}/${next_version}",
  "dry_run": ${DRY_RUN},
  "generated_at": "$(date -u +%Y-%m-%dT%H:%M:%SZ)"
}
EOF
    fi
}

# Run main
main "$@"
