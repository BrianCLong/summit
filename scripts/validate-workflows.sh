#!/bin/bash

################################################################################
# Workflow Validation Script
#
# Purpose: Validates GitHub Actions workflows for syntax errors, best practices,
#          and security issues before deployment.
#
# Usage: ./scripts/validate-workflows.sh
#
# Exit Codes:
#   0 - All validations passed
#   1 - Validation errors found
#   2 - Missing dependencies
################################################################################

set -euo pipefail

# Colors
readonly RED='\033[0;31m'
readonly GREEN='\033[0;32m'
readonly YELLOW='\033[1;33m'
readonly BLUE='\033[0;34m'
readonly NC='\033[0m'

# Configuration
readonly WORKFLOWS_DIR=".github/workflows"
readonly SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
readonly PROJECT_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"

# Counters
ERRORS=0
WARNINGS=0
CHECKS=0

################################################################################
# Logging Functions
################################################################################

log_info() {
  echo -e "${BLUE}[INFO]${NC} $*"
}

log_success() {
  echo -e "${GREEN}[✓]${NC} $*"
}

log_warning() {
  echo -e "${YELLOW}[⚠]${NC} $*"
  ((WARNINGS++))
}

log_error() {
  echo -e "${RED}[✗]${NC} $*"
  ((ERRORS++))
}

################################################################################
# Dependency Checks
################################################################################

check_dependencies() {
  log_info "Checking dependencies..."

  local missing_deps=()

  # Check for yq (YAML processor)
  if ! command -v yq &> /dev/null; then
    missing_deps+=("yq")
  fi

  # Check for actionlint (GitHub Actions linter)
  if ! command -v actionlint &> /dev/null; then
    log_warning "actionlint not found - install for better validation"
    log_info "  brew install actionlint  (macOS)"
    log_info "  go install github.com/rhysd/actionlint/cmd/actionlint@latest"
  fi

  # Check for shellcheck
  if ! command -v shellcheck &> /dev/null; then
    log_warning "shellcheck not found - install for script validation"
  fi

  if [[ ${#missing_deps[@]} -gt 0 ]]; then
    log_error "Missing required dependencies: ${missing_deps[*]}"
    return 2
  fi

  log_success "All required dependencies found"
  return 0
}

################################################################################
# Workflow Validation Functions
################################################################################

validate_yaml_syntax() {
  local workflow_file="$1"
  ((CHECKS++))

  log_info "Validating YAML syntax: $(basename "$workflow_file")"

  if ! yq eval '.' "$workflow_file" > /dev/null 2>&1; then
    log_error "Invalid YAML syntax in $workflow_file"
    return 1
  fi

  log_success "YAML syntax valid"
  return 0
}

validate_workflow_structure() {
  local workflow_file="$1"
  ((CHECKS++))

  log_info "Validating workflow structure: $(basename "$workflow_file")"

  # Check required fields
  local name
  name=$(yq eval '.name' "$workflow_file")

  if [[ "$name" == "null" || -z "$name" ]]; then
    log_error "Workflow missing 'name' field"
    return 1
  fi

  # Check for on: trigger
  local on_trigger
  on_trigger=$(yq eval '.on' "$workflow_file")

  if [[ "$on_trigger" == "null" ]]; then
    log_error "Workflow missing 'on' trigger"
    return 1
  fi

  # Check for jobs
  local jobs
  jobs=$(yq eval '.jobs | length' "$workflow_file")

  if [[ "$jobs" -eq 0 ]]; then
    log_error "Workflow has no jobs defined"
    return 1
  fi

  log_success "Workflow structure valid"
  return 0
}

validate_secrets_usage() {
  local workflow_file="$1"
  ((CHECKS++))

  log_info "Validating secrets usage: $(basename "$workflow_file")"

  # Check for hardcoded secrets (should use ${{ secrets.* }})
  if grep -iE '(password|token|key|secret)["\s]*[:=]["\s]*[a-zA-Z0-9]{8,}' "$workflow_file" > /dev/null; then
    log_warning "Potential hardcoded secrets found in $workflow_file"
    log_warning "  Use \${{ secrets.SECRET_NAME }} instead"
  fi

  # Check for AWS credentials
  if grep -qE '\${{ secrets\.(AWS_ACCESS_KEY_ID|AWS_SECRET_ACCESS_KEY)' "$workflow_file"; then
    log_warning "Using AWS access keys - consider using OIDC with aws-actions/configure-aws-credentials"
  fi

  log_success "Secrets usage validated"
  return 0
}

validate_permissions() {
  local workflow_file="$1"
  ((CHECKS++))

  log_info "Validating permissions: $(basename "$workflow_file")"

  # Check if permissions are defined
  local permissions
  permissions=$(yq eval '.permissions' "$workflow_file")

  if [[ "$permissions" == "null" ]]; then
    log_warning "No permissions defined - workflow will use default permissions"
    log_info "  Consider adding explicit permissions for better security"
  else
    # Check for overly permissive settings
    local write_all
    write_all=$(yq eval '.permissions | select(. == "write-all")' "$workflow_file")

    if [[ -n "$write_all" ]]; then
      log_warning "Workflow has 'write-all' permissions - consider limiting scope"
    fi
  fi

  log_success "Permissions validated"
  return 0
}

validate_timeout() {
  local workflow_file="$1"
  ((CHECKS++))

  log_info "Validating timeouts: $(basename "$workflow_file")"

  # Check for timeout-minutes on jobs
  local jobs_without_timeout
  jobs_without_timeout=$(yq eval '.jobs | to_entries | .[] | select(.value.timeout-minutes == null) | .key' "$workflow_file")

  if [[ -n "$jobs_without_timeout" ]]; then
    log_warning "Jobs without timeout-minutes:"
    echo "$jobs_without_timeout" | while IFS= read -r job; do
      log_warning "  - $job"
    done
    log_info "  Consider adding 'timeout-minutes' to prevent stuck workflows"
  fi

  log_success "Timeouts validated"
  return 0
}

validate_caching() {
  local workflow_file="$1"
  ((CHECKS++))

  log_info "Validating caching strategy: $(basename "$workflow_file")"

  # Check if workflow uses npm/pnpm/yarn but doesn't cache
  if grep -qE '(npm|pnpm|yarn) install' "$workflow_file"; then
    if ! grep -qE 'actions/cache|actions/setup-node.*cache' "$workflow_file"; then
      log_warning "Workflow installs dependencies but doesn't use caching"
      log_info "  Add caching to improve workflow performance"
    fi
  fi

  log_success "Caching strategy validated"
  return 0
}

validate_actionlint() {
  local workflow_file="$1"

  if ! command -v actionlint &> /dev/null; then
    return 0
  fi

  ((CHECKS++))
  log_info "Running actionlint: $(basename "$workflow_file")"

  if ! actionlint "$workflow_file"; then
    log_error "actionlint found issues in $workflow_file"
    return 1
  fi

  log_success "actionlint passed"
  return 0
}

validate_shell_scripts() {
  ((CHECKS++))
  log_info "Validating shell scripts..."

  if ! command -v shellcheck &> /dev/null; then
    log_warning "shellcheck not installed - skipping shell script validation"
    return 0
  fi

  local script_errors=0

  # Find and validate shell scripts
  find "$PROJECT_ROOT/scripts" -type f -name "*.sh" | while IFS= read -r script; do
    log_info "  Checking $(basename "$script")..."

    if ! shellcheck -x "$script"; then
      log_error "shellcheck found issues in $script"
      ((script_errors++))
    fi
  done

  if [[ $script_errors -gt 0 ]]; then
    log_error "$script_errors shell script(s) have issues"
    return 1
  fi

  log_success "All shell scripts validated"
  return 0
}

validate_reusable_workflows() {
  ((CHECKS++))
  log_info "Validating reusable workflows..."

  # Check for reusable workflows that are referenced but don't exist
  find "$WORKFLOWS_DIR" -type f -name "*.yml" -o -name "*.yaml" | while IFS= read -r workflow; do
    local uses_workflows
    uses_workflows=$(yq eval '.jobs[].uses' "$workflow" 2>/dev/null | grep -v "null" | grep "^\./" || true)

    while IFS= read -r used_workflow; do
      if [[ -n "$used_workflow" ]]; then
        local workflow_path="${used_workflow#./}"
        local full_path="$WORKFLOWS_DIR/$workflow_path"

        if [[ ! -f "$full_path" ]]; then
          log_error "Referenced workflow not found: $used_workflow"
          log_error "  Referenced in: $(basename "$workflow")"
        fi
      fi
    done <<< "$uses_workflows"
  done

  log_success "Reusable workflows validated"
  return 0
}

################################################################################
# Main Validation
################################################################################

main() {
  log_info "========================================="
  log_info "GitHub Actions Workflow Validation"
  log_info "========================================="
  log_info "Project: $PROJECT_ROOT"
  log_info "Workflows: $WORKFLOWS_DIR"
  log_info "========================================="
  echo ""

  # Check dependencies
  if ! check_dependencies; then
    exit 2
  fi

  echo ""

  # Validate each workflow file
  if [[ ! -d "$WORKFLOWS_DIR" ]]; then
    log_error "Workflows directory not found: $WORKFLOWS_DIR"
    exit 1
  fi

  local workflow_count=0
  while IFS= read -r workflow_file; do
    ((workflow_count++))

    echo ""
    log_info "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    log_info "Validating: $(basename "$workflow_file")"
    log_info "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

    validate_yaml_syntax "$workflow_file" || true
    validate_workflow_structure "$workflow_file" || true
    validate_secrets_usage "$workflow_file" || true
    validate_permissions "$workflow_file" || true
    validate_timeout "$workflow_file" || true
    validate_caching "$workflow_file" || true
    validate_actionlint "$workflow_file" || true

  done < <(find "$WORKFLOWS_DIR" -type f \( -name "*.yml" -o -name "*.yaml" \))

  # Validate shell scripts
  echo ""
  log_info "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  log_info "Validating Shell Scripts"
  log_info "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  validate_shell_scripts || true

  # Validate reusable workflows
  echo ""
  log_info "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  validate_reusable_workflows || true

  # Summary
  echo ""
  log_info "========================================="
  log_info "Validation Summary"
  log_info "========================================="
  log_info "Workflows validated: $workflow_count"
  log_info "Total checks: $CHECKS"
  log_info "Errors: $ERRORS"
  log_info "Warnings: $WARNINGS"
  log_info "========================================="

  if [[ $ERRORS -gt 0 ]]; then
    echo ""
    log_error "Validation failed with $ERRORS error(s)"
    exit 1
  elif [[ $WARNINGS -gt 0 ]]; then
    echo ""
    log_warning "Validation passed with $WARNINGS warning(s)"
    log_info "Consider addressing warnings for better practices"
    exit 0
  else
    echo ""
    log_success "All validations passed! ✨"
    exit 0
  fi
}

# Run main function
main "$@"
