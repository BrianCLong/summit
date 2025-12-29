#!/bin/bash
#
# Release Verification Script
#
# This script runs a series of checks to ensure the repository is in a
# consistent and healthy state before a new release is cut. It is intended
# to be run by a Release Captain from the root of the repository.
#
# Checks performed:
#   1. Workspace Version Consistency: Ensures all packages in the pnpm workspace
#      share the same version number as the root package.json.
#   2. Artifact Existence: Verifies that critical release artifacts, such as
#      the schemas directory and the main documentation index, are present.
#   3. Build and Test: Runs the main build command and a quick test script
#      to catch any obvious regressions.
#

set -e
set -o pipefail

# --- Logging Functions ---
# ANSI color codes
BLUE='\033[0;34m'
GREEN='\033[0;32m'
RED='\033[0;31m'
NC='\033[0m' # No Color

log_info() {
  echo -e "${BLUE}INFO: $1${NC}"
}

log_success() {
  echo -e "${GREEN}SUCCESS: $1${NC}"
}

log_error() {
  echo -e "${RED}ERROR: $1${NC}" >&2
}

# --- Verification Logic ---

# 1. Check Workspace Version Consistency
check_versions() {
  log_info "Starting workspace version consistency check..."

  local root_version
  root_version=$(jq -r .version package.json)

  if [ -z "$root_version" ]; then
    log_error "Could not determine root package.json version."
    exit 1
  fi

  log_info "Root version is: $root_version"

  local inconsistent_packages=0

  # Use pnpm ls to get all workspace packages and their versions
  # Filter out the root package itself from the check
  packages_json=$(pnpm list -r --depth -1 --json | jq -c '.[] | select(.name != "intelgraph-platform")')

  for row in $(echo "${packages_json}" | jq -r '. | @base64'); do
    _jq() {
     echo "${row}" | base64 --decode | jq -r "${1}"
    }

    local name=$(_jq '.name')
    local version=$(_jq '.version')

    if [ "$version" != "$root_version" ]; then
      log_error "Version mismatch for package '$name'. Expected '$root_version', but found '$version'."
      inconsistent_packages=$((inconsistent_packages + 1))
    else
      log_info "  - Package '$name' version ($version) is consistent."
    fi
  done

  if [ "$inconsistent_packages" -gt 0 ]; then
    log_error "Found $inconsistent_packages inconsistent package version(s). Aborting."
    exit 1
  fi

  log_success "All workspace package versions are consistent."
}

# 2. Check for Required Artifacts
check_artifacts() {
  log_info "Starting artifact existence check..."

  local required_files=(
    "schemas"
    "docs/README.md"
  )

  local missing_artifacts=0

  for artifact in "${required_files[@]}"; do
    if [ ! -e "$artifact" ]; then
      log_error "Required artifact '$artifact' is missing."
      missing_artifacts=$((missing_artifacts + 1))
    else
      log_info "  - Found required artifact: '$artifact'."
    fi
  done

  if [ "$missing_artifacts" -gt 0 ]; then
    log_error "Found $missing_artifacts missing artifact(s). Aborting."
    exit 1
  fi

  log_success "All required artifacts are present."
}

# 3. Run Build and Quick Test
run_build_and_test() {
  log_info "Starting build process..."
  pnpm build
  log_success "Build completed successfully."

  log_info "Running quick test suite..."
  pnpm test:quick
  log_success "Quick test suite passed."
}

# --- Main Execution ---
main() {
  log_info "--- Release Verification Script ---"

  check_versions
  check_artifacts
  run_build_and_test

  log_success "--- All release verification checks passed! ---"
}

main
