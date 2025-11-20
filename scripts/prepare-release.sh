#!/bin/bash

################################################################################
# Prepare Release Script
#
# Purpose: Prepares the codebase for a new release by updating version numbers,
#          creating release notes, and validating the release configuration.
#
# Called by: semantic-release as part of the automated release pipeline
#
# Usage: ./prepare-release.sh <VERSION>
#
# Example: ./prepare-release.sh 1.2.3
#
# Exit Codes:
#   0 - Success
#   1 - Invalid arguments or validation failure
#   2 - Node.js not available
#   3 - File operation failure
################################################################################

# Enable strict error handling
# -e: Exit on any error
# -u: Exit on undefined variable
# -o pipefail: Exit on pipe failures
set -euo pipefail

################################################################################
# CONFIGURATION
################################################################################

# Script metadata
readonly SCRIPT_NAME="$(basename "${BASH_SOURCE[0]}")"
readonly SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
readonly PROJECT_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"

# Release configuration
readonly RELEASE_NOTES_FILE="${PROJECT_ROOT}/RELEASE_NOTES.md"
readonly CHANGELOG_FILE="${PROJECT_ROOT}/CHANGELOG.md"
readonly RELEASES_DIR="${PROJECT_ROOT}/releases"

# Logging configuration
readonly LOG_FILE="${PROJECT_ROOT}/logs/prepare-release.log"

# Colors for output
readonly RED='\033[0;31m'
readonly GREEN='\033[0;32m'
readonly YELLOW='\033[1;33m'
readonly BLUE='\033[0;34m'
readonly NC='\033[0m' # No Color

################################################################################
# LOGGING FUNCTIONS
################################################################################

# Initialize logging directory
init_logging() {
  mkdir -p "$(dirname "${LOG_FILE}")"
  echo "[$(date -u +%Y-%m-%dT%H:%M:%SZ)] Starting release preparation" >> "${LOG_FILE}"
}

# Log to both console and file
log() {
  local level="$1"
  shift
  local message="$*"
  local timestamp
  timestamp="$(date -u +%Y-%m-%dT%H:%M:%SZ)"

  echo "[${timestamp}] [${level}] ${message}" >> "${LOG_FILE}"

  case "${level}" in
    ERROR)
      echo -e "${RED}[ERROR]${NC} ${message}" >&2
      ;;
    WARN)
      echo -e "${YELLOW}[WARN]${NC} ${message}"
      ;;
    INFO)
      echo -e "${BLUE}[INFO]${NC} ${message}"
      ;;
    SUCCESS)
      echo -e "${GREEN}[SUCCESS]${NC} ${message}"
      ;;
    *)
      echo "${message}"
      ;;
  esac
}

log_error() { log "ERROR" "$@"; }
log_warn() { log "WARN" "$@"; }
log_info() { log "INFO" "$@"; }
log_success() { log "SUCCESS" "$@"; }

################################################################################
# ERROR HANDLING
################################################################################

# Global error handler
handle_error() {
  local exit_code=$?
  local line_number=$1
  log_error "Script failed at line ${line_number} with exit code ${exit_code}"
  log_error "Release preparation failed for version ${VERSION:-unknown}"

  # Cleanup on error
  cleanup_on_error

  exit "${exit_code}"
}

# Cleanup function for error scenarios
cleanup_on_error() {
  log_info "Performing error cleanup..."

  # Remove partial release notes if created
  if [[ -f "${RELEASE_NOTES_FILE}.tmp" ]]; then
    rm -f "${RELEASE_NOTES_FILE}.tmp"
    log_info "Removed temporary release notes"
  fi
}

# Set up error trap
trap 'handle_error ${LINENO}' ERR

################################################################################
# VALIDATION FUNCTIONS
################################################################################

# Validate semantic version format
validate_version_format() {
  local version="$1"

  # Semantic version regex: MAJOR.MINOR.PATCH with optional pre-release
  local semver_regex='^([0-9]+)\.([0-9]+)\.([0-9]+)(-[0-9A-Za-z-]+(\.[0-9A-Za-z-]+)*)?$'

  if [[ ! "${version}" =~ ${semver_regex} ]]; then
    log_error "Invalid version format: ${version}"
    log_error "Expected format: MAJOR.MINOR.PATCH (e.g., 1.2.3, 2.0.0-beta.1)"
    return 1
  fi

  log_info "Version format validated: ${version}"
  return 0
}

# Check required commands are available
check_dependencies() {
  local missing_deps=()

  # Required commands
  local required_commands=("node" "git" "find" "jq")

  for cmd in "${required_commands[@]}"; do
    if ! command -v "${cmd}" &> /dev/null; then
      missing_deps+=("${cmd}")
    fi
  done

  if [[ ${#missing_deps[@]} -gt 0 ]]; then
    log_error "Missing required dependencies: ${missing_deps[*]}"
    log_error "Please install the missing dependencies and try again"
    return 2
  fi

  log_info "All dependencies verified"
  return 0
}

# Validate we're in a git repository
validate_git_repo() {
  if ! git -C "${PROJECT_ROOT}" rev-parse --git-dir &> /dev/null; then
    log_error "Not in a git repository"
    return 1
  fi

  log_info "Git repository validated"
  return 0
}

################################################################################
# VERSION UPDATE FUNCTIONS
################################################################################

# Update version in a single package.json file
update_package_json() {
  local file="$1"
  local version="$2"

  log_info "Updating ${file}..."

  # Create backup
  cp "${file}" "${file}.bak"

  # Update version using Node.js for safe JSON manipulation
  if ! node -e "
    const fs = require('fs');
    const file = '${file}';

    try {
      const pkg = JSON.parse(fs.readFileSync(file, 'utf8'));
      pkg.version = '${version}';

      // Preserve formatting
      fs.writeFileSync(file, JSON.stringify(pkg, null, 2) + '\n');

      console.log('Updated version in ' + file + ' to ${version}');
      process.exit(0);
    } catch (error) {
      console.error('Failed to update ' + file + ': ' + error.message);
      process.exit(1);
    }
  "; then
    log_error "Failed to update ${file}"
    # Restore backup
    mv "${file}.bak" "${file}"
    return 3
  fi

  # Remove backup on success
  rm -f "${file}.bak"
  return 0
}

# Update all package.json files in the monorepo
update_all_packages() {
  local version="$1"
  local updated_count=0
  local failed_count=0

  log_info "Updating package.json files in monorepo..."

  # Find all package.json files (excluding node_modules)
  while IFS= read -r file; do
    if update_package_json "${file}" "${version}"; then
      ((updated_count++))
    else
      ((failed_count++))
      log_warn "Failed to update ${file}"
    fi
  done < <(find "${PROJECT_ROOT}" -name "package.json" -not -path "*/node_modules/*" -type f)

  log_info "Updated ${updated_count} package.json files"

  if [[ ${failed_count} -gt 0 ]]; then
    log_warn "${failed_count} files failed to update"
    return 3
  fi

  return 0
}

################################################################################
# RELEASE NOTES FUNCTIONS
################################################################################

# Extract breaking changes from changelog
extract_breaking_changes() {
  if [[ ! -f "${CHANGELOG_FILE}" ]]; then
    echo "No breaking changes found"
    return 0
  fi

  # Extract breaking changes section from changelog
  awk '/^## \[.*\]/ { found=1; next }
       found && /^### BREAKING CHANGE/ { print; getline; while($0 !~ /^###/ && $0 !~ /^##/) { print; if(getline <= 0) break } exit }' \
       "${CHANGELOG_FILE}" || echo "No breaking changes in this release"
}

# Generate release notes template
generate_release_notes() {
  local version="$1"
  local breaking_changes

  log_info "Generating release notes..."

  # Extract breaking changes
  breaking_changes=$(extract_breaking_changes)

  # Create release notes
  cat > "${RELEASE_NOTES_FILE}" << EOF
# Release v${version}

> Generated on $(date -u +"%Y-%m-%d %H:%M:%S UTC")

## 📋 What's Changed

See [CHANGELOG.md](./CHANGELOG.md) for detailed changes.

## ⚠️ Breaking Changes

${breaking_changes}

## 📦 Installation

### Docker Images

\`\`\`bash
# Pull API service
docker pull ghcr.io/brianelong/summit/api:${version}

# Pull Web service
docker pull ghcr.io/brianelong/summit/web:${version}

# Pull Worker service
docker pull ghcr.io/brianelong/summit/worker:${version}
\`\`\`

### Helm Chart

\`\`\`bash
# Add repository
helm repo add intelgraph https://charts.intelgraph.io

# Install/upgrade
helm upgrade --install intelgraph intelgraph/intelgraph \\
  --version ${version} \\
  --namespace intelgraph-production
\`\`\`

## 🚀 Deployment

### Staging Deployment (Automatic)

Staging deployment will trigger automatically after release creation.

Monitor at: https://github.com/BrianCLong/summit/actions

### Production Deployment (Manual Approval Required)

\`\`\`bash
# Via GitHub CLI
gh workflow run deploy-production.yml -f version=${version}

# Via GitHub UI
# Navigate to Actions → Deploy to Production → Run workflow
\`\`\`

**Important:** Production deployment requires manual approval from authorized personnel.

## ✅ Verification

### Health Checks

\`\`\`bash
# Check API health
curl https://intelgraph.io/health

# Check version endpoint
curl https://intelgraph.io/api/version
# Expected: {"version": "${version}"}

# Run smoke tests
./scripts/smoke-tests.sh https://intelgraph.io
\`\`\`

### Monitoring

- **Grafana Dashboard:** https://grafana.intelgraph.io/d/releases
- **Logs:** \`kubectl logs -n intelgraph-production -l version=${version}\`
- **Metrics:** Check error rates and latency in Prometheus

## 🔄 Rollback

If issues are detected:

\`\`\`bash
# Automatic rollback (triggered by health check failures)
# Or manual rollback:
./scripts/rollback-deployment.sh production

# Rollback to specific version
./scripts/rollback-deployment.sh production v<previous-version>
\`\`\`

## 📚 Documentation

- [Release Process](./docs/deployment/RELEASE_PROCESS.md)
- [Feature Flags Guide](./docs/deployment/FEATURE_FLAGS.md)
- [Migration Guide](./docs/deployment/MIGRATION_v${version}.md)

## 🐛 Known Issues

Check the [GitHub Issues](https://github.com/BrianCLong/summit/issues?q=is%3Aissue+is%3Aopen+label%3Av${version}) for known issues with this release.

## 👥 Contributors

Thank you to all contributors who made this release possible!

---

**Full Changelog**: https://github.com/BrianCLong/summit/compare/v<previous>...v${version}
EOF

  log_success "Release notes generated: ${RELEASE_NOTES_FILE}"
}

################################################################################
# MANIFEST FUNCTIONS
################################################################################

# Create release manifest for tracking
create_release_manifest() {
  local version="$1"

  log_info "Creating release manifest..."

  # Ensure releases directory exists
  mkdir -p "${RELEASES_DIR}"

  # Get git information
  local git_commit
  local git_branch
  git_commit=$(git -C "${PROJECT_ROOT}" rev-parse HEAD)
  git_branch=$(git -C "${PROJECT_ROOT}" rev-parse --abbrev-ref HEAD)

  # Create manifest
  cat > "${RELEASES_DIR}/${version}.json" << EOF
{
  "version": "${version}",
  "createdAt": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "git": {
    "commit": "${git_commit}",
    "branch": "${git_branch}"
  },
  "images": {
    "api": "ghcr.io/brianelong/summit/api:${version}",
    "web": "ghcr.io/brianelong/summit/web:${version}",
    "worker": "ghcr.io/brianelong/summit/worker:${version}"
  },
  "status": "prepared",
  "environments": {
    "staging": {
      "deployed": false,
      "url": "https://staging.intelgraph.io"
    },
    "production": {
      "deployed": false,
      "url": "https://intelgraph.io",
      "requiresApproval": true
    }
  }
}
EOF

  log_success "Release manifest created: ${RELEASES_DIR}/${version}.json"
}

################################################################################
# MAIN EXECUTION
################################################################################

main() {
  local version="${1:-}"

  # Initialize logging
  init_logging

  log_info "========================================="
  log_info "Release Preparation Script"
  log_info "========================================="
  log_info "Script: ${SCRIPT_NAME}"
  log_info "Project: ${PROJECT_ROOT}"
  log_info "========================================="

  # Validate arguments
  if [[ -z "${version}" ]]; then
    log_error "Usage: ${SCRIPT_NAME} <VERSION>"
    log_error "Example: ${SCRIPT_NAME} 1.2.3"
    exit 1
  fi

  log_info "Preparing release v${version}..."

  # Run validations
  log_info "Running pre-flight checks..."
  validate_version_format "${version}" || exit 1
  check_dependencies || exit 2
  validate_git_repo || exit 1

  # Update versions
  log_info "Updating version numbers..."
  update_all_packages "${version}" || exit 3

  # Generate release artifacts
  log_info "Generating release artifacts..."
  generate_release_notes "${version}" || exit 3
  create_release_manifest "${version}" || exit 3

  # Final validation
  log_info "Validating release preparation..."
  if [[ ! -f "${RELEASE_NOTES_FILE}" ]]; then
    log_error "Release notes were not created"
    exit 3
  fi

  if [[ ! -f "${RELEASES_DIR}/${version}.json" ]]; then
    log_error "Release manifest was not created"
    exit 3
  fi

  # Success summary
  log_success "========================================="
  log_success "Release v${version} prepared successfully!"
  log_success "========================================="
  log_info "Release notes: ${RELEASE_NOTES_FILE}"
  log_info "Release manifest: ${RELEASES_DIR}/${version}.json"
  log_info "Log file: ${LOG_FILE}"
  log_success "========================================="

  # Output for semantic-release
  echo "RELEASE_VERSION=${version}"
  echo "RELEASE_NOTES=${RELEASE_NOTES_FILE}"
  echo "RELEASE_MANIFEST=${RELEASES_DIR}/${version}.json"

  return 0
}

# Script entry point
# Only run main if script is executed directly (not sourced)
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
  main "$@"
fi
