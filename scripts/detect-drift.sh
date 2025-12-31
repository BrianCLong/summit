#!/bin/bash

# Summit GA - Post-Release Drift Detection Script
# Version: 1.0
# Description: Detects drift in dependencies, configuration, policies, and CI/CD workflows.

set -euo pipefail

# --- Configuration ---
BASELINE_DIR="./baselines"
mkdir -p "$BASELINE_DIR"

# Critical workflow files to monitor for drift
WORKFLOW_FILES=(
    ".github/workflows/ga-release.yml"
    ".github/workflows/pr-quality-gate.yml"
    ".github/workflows/post-release-canary.yml"
)

# Critical config files to monitor
CONFIG_FILES=(
    "helm/summit/values.yaml"
    "helm/summit/values.production.yaml"
    "policy/main.rego"
)

# --- Colors for Output ---
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# --- Logging Functions ---
log_info() { echo -e "\n${BLUE}== $1 ==${NC}"; }
log_success() { echo -e "${GREEN}✅ $1${NC}"; }
log_error() { echo -e "${RED}❌ $1${NC}"; }
log_warning() { echo -e "${YELLOW}⚠️  $1${NC}"; }

# --- Drift Detection Functions ---

# Compares a checksum file with a baseline.
# Arguments: $1 = current checksums file, $2 = baseline file path
compare_baselines() {
    local current_file="$1"
    local baseline_file="$2"
    local drift_detected=false

    if [[ ! -f "$baseline_file" ]]; then
        log_warning "Baseline file not found. Creating new baseline at '$baseline_file'."
        cp "$current_file" "$baseline_file"
        return 0
    fi

    if ! diff -q "$baseline_file" "$current_file" >/dev/null; then
        log_error "Drift detected!"
        diff --unified=3 "$baseline_file" "$current_file" || true # diff exits 1 on difference
        drift_detected=true
    fi

    if [[ "$drift_detected" = false ]]; then
        log_success "No drift detected."
    fi
}

# 1. Dependency Drift (SBOM / Lockfile)
check_dependency_drift() {
    log_info "Checking for Dependency Drift..."
    local current_lockfile_hash
    current_lockfile_hash=$(sha256sum pnpm-lock.yaml)

    local temp_file
    temp_file=$(mktemp)
    echo "$current_lockfile_hash" > "$temp_file"

    compare_baselines "$temp_file" "$BASELINE_DIR/dependency.baseline"
    rm "$temp_file"
}

# 2. Config Drift
check_config_drift() {
    log_info "Checking for Configuration Drift..."
    local temp_file
    temp_file=$(mktemp)

    for file in "${CONFIG_FILES[@]}"; do
        if [[ -f "$file" ]]; then
            sha256sum "$file" >> "$temp_file"
        else
            log_warning "Config file not found: $file"
        fi
    done

    compare_baselines "$temp_file" "$BASELINE_DIR/config.baseline"
    rm "$temp_file"
}

# 3. Policy Drift
check_policy_drift() {
    log_info "Checking for Policy Drift..."
    local temp_file
    temp_file=$(mktemp)

    if [[ -d "policy" ]]; then
        find policy -name '*.rego' -print0 | xargs -0 sha256sum >> "$temp_file"
    fi

    compare_baselines "$temp_file" "$BASELINE_DIR/policy.baseline"
    rm "$temp_file"
}

# 4. CI/Workflow Drift
check_workflow_drift() {
    log_info "Checking for CI/Workflow Drift..."
    local temp_file
    temp_file=$(mktemp)

    for file in "${WORKFLOW_FILES[@]}"; do
        if [[ -f "$file" ]]; then
            sha256sum "$file" >> "$temp_file"
        else
            log_warning "Workflow file not found: $file"
        fi
    done

    compare_baselines "$temp_file" "$BASELINE_DIR/workflow.baseline"
    rm "$temp_file"
}

# --- Main Execution ---
main() {
    log_info "Starting Post-GA Drift Detection..."

    check_dependency_drift
    check_config_drift
    check_policy_drift
    check_workflow_drift

    log_info "Drift detection complete."
    log_warning "If drift is detected, investigate immediately. If changes are approved, update the baselines."
}

main "$@"
