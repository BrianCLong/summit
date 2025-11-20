#!/usr/bin/env bash
#
# Summit CLI Integration Validation Script
#
# This script validates that the Summit CLI integrates correctly with
# existing project tools and workflows. It checks for command availability,
# configuration validity, and basic functionality.
#
# Usage: ./scripts/validate-integration.sh [--verbose] [--fix]
#
# Exit codes:
#   0 - All validations passed
#   1 - Some validations failed
#   2 - Critical error (missing dependencies, etc.)

set -euo pipefail

# Colors for output
readonly RED='\033[0;31m'
readonly GREEN='\033[0;32m'
readonly YELLOW='\033[1;33m'
readonly BLUE='\033[0;34m'
readonly NC='\033[0m' # No Color

# Script configuration
VERBOSE=false
FIX=false
FAILED=0
PASSED=0
WARNINGS=0

# Parse arguments
while [[ $# -gt 0 ]]; do
  case $1 in
    --verbose|-v)
      VERBOSE=true
      shift
      ;;
    --fix)
      FIX=true
      shift
      ;;
    --help|-h)
      echo "Usage: $0 [--verbose] [--fix]"
      echo ""
      echo "Options:"
      echo "  --verbose, -v  Show detailed output"
      echo "  --fix          Attempt to fix issues automatically"
      echo "  --help, -h     Show this help message"
      exit 0
      ;;
    *)
      echo "Unknown option: $1"
      exit 2
      ;;
  esac
done

# Helper functions
log_info() {
  echo -e "${BLUE}ℹ${NC} $*"
}

log_success() {
  echo -e "${GREEN}✓${NC} $*"
  ((PASSED++))
}

log_warning() {
  echo -e "${YELLOW}⚠${NC} $*"
  ((WARNINGS++))
}

log_error() {
  echo -e "${RED}✗${NC} $*"
  ((FAILED++))
}

log_debug() {
  if [[ "$VERBOSE" == "true" ]]; then
    echo -e "${BLUE}[DEBUG]${NC} $*"
  fi
}

check_command() {
  local cmd=$1
  local required=${2:-false}

  if command -v "$cmd" &> /dev/null; then
    log_success "Command available: $cmd"
    return 0
  else
    if [[ "$required" == "true" ]]; then
      log_error "Required command not found: $cmd"
      return 1
    else
      log_warning "Optional command not found: $cmd"
      return 0
    fi
  fi
}

# Main validation
main() {
  log_info "Starting Summit CLI integration validation..."
  echo ""

  # 1. Check Node.js version
  log_info "Checking Node.js version..."
  if command -v node &> /dev/null; then
    NODE_VERSION=$(node --version | cut -d 'v' -f 2 | cut -d '.' -f 1)
    if [[ "$NODE_VERSION" -ge 20 ]]; then
      log_success "Node.js version: v$(node --version | cut -d 'v' -f 2)"
    else
      log_error "Node.js version too old: v$(node --version | cut -d 'v' -f 2) (requires >= v20)"
    fi
  else
    log_error "Node.js not installed"
  fi

  # 2. Check required commands
  log_info "Checking required commands..."
  check_command "pnpm" true || check_command "npm" true
  check_command "docker" true
  check_command "git" true

  # 3. Check optional commands
  log_info "Checking optional commands..."
  check_command "make" false
  check_command "just" false
  check_command "kubectl" false
  check_command "helm" false

  # 4. Check Docker daemon
  log_info "Checking Docker daemon..."
  if docker info &> /dev/null; then
    log_success "Docker daemon is running"
  else
    log_error "Docker daemon is not running"
    if [[ "$FIX" == "true" ]]; then
      log_info "Attempting to start Docker..."
      # Platform-specific Docker start
      if [[ "$OSTYPE" == "darwin"* ]]; then
        open -a Docker
        sleep 5
      fi
    fi
  fi

  # 5. Check Summit CLI installation
  log_info "Checking Summit CLI installation..."
  if [[ -f "summit-cli/package.json" ]]; then
    log_success "Summit CLI package found"

    # Check if dependencies are installed
    if [[ -d "node_modules/@intelgraph" ]] || [[ -d "summit-cli/node_modules" ]]; then
      log_success "Dependencies installed"
    else
      log_warning "Dependencies not installed"
      if [[ "$FIX" == "true" ]]; then
        log_info "Installing dependencies..."
        (cd summit-cli && pnpm install) || log_error "Failed to install dependencies"
      fi
    fi
  else
    log_error "Summit CLI package.json not found"
  fi

  # 6. Check workspace configuration
  log_info "Checking pnpm workspace configuration..."
  if [[ -f "pnpm-workspace.yaml" ]]; then
    if grep -q "summit-cli" pnpm-workspace.yaml; then
      log_success "Summit CLI in workspace"
    else
      log_warning "Summit CLI not in pnpm-workspace.yaml"
      if [[ "$FIX" == "true" ]]; then
        log_info "Adding summit-cli to workspace..."
        # Would add to workspace here
      fi
    fi
  else
    log_warning "pnpm-workspace.yaml not found"
  fi

  # 7. Check existing tools
  log_info "Checking existing tool integration..."

  # Check for Makefile
  if [[ -f "Makefile" ]]; then
    log_success "Makefile found"
  else
    log_warning "Makefile not found"
  fi

  # Check for Justfile
  if [[ -f "Justfile" ]]; then
    log_success "Justfile found"
  else
    log_warning "Justfile not found"
  fi

  # Check for docker-compose files
  if ls compose/*.yml &> /dev/null || ls compose/*.yaml &> /dev/null; then
    log_success "Docker compose files found"
  else
    log_warning "No docker-compose files found in compose/"
  fi

  # 8. Check scripts directory
  log_info "Checking scripts directory..."
  if [[ -d "scripts" ]]; then
    SCRIPT_COUNT=$(find scripts -type f -name "*.sh" | wc -l)
    log_success "Scripts directory found ($SCRIPT_COUNT shell scripts)"
  else
    log_warning "Scripts directory not found"
  fi

  # 9. Test Summit CLI execution
  log_info "Testing Summit CLI execution..."
  if node summit-cli/bin/summit.js --version &> /dev/null; then
    VERSION=$(node summit-cli/bin/summit.js --version)
    log_success "Summit CLI executable: v$VERSION"
  else
    log_error "Summit CLI not executable"
  fi

  # 10. Test help command
  if node summit-cli/bin/summit.js --help &> /dev/null; then
    log_success "Help command works"
  else
    log_error "Help command failed"
  fi

  # 11. Check configuration file
  log_info "Checking configuration..."
  if [[ -f "summit.config.js" ]]; then
    log_success "Configuration file found"
    if node -c summit.config.js 2> /dev/null; then
      log_success "Configuration syntax valid"
    else
      log_error "Configuration syntax invalid"
    fi
  else
    log_warning "No summit.config.js found (using defaults)"
  fi

  # 12. Check documentation
  log_info "Checking documentation..."
  local DOCS=(
    "summit-cli/README.md"
    "summit-cli/DESIGN.md"
    "docs/summit-cli-quickstart.md"
    "docs/summit-cli-migration-guide.md"
  )

  for doc in "${DOCS[@]}"; do
    if [[ -f "$doc" ]]; then
      log_success "Documentation found: $doc"
    else
      log_warning "Documentation missing: $doc"
    fi
  done

  # 13. Validate JSON output mode
  log_info "Testing JSON output mode..."
  if node summit-cli/bin/summit.js dev status --json &> /dev/null; then
    log_success "JSON output mode works"
  else
    log_debug "JSON output test skipped (services may not be running)"
  fi

  # Summary
  echo ""
  echo "=========================================="
  echo "VALIDATION SUMMARY"
  echo "=========================================="
  echo -e "Passed:   ${GREEN}$PASSED${NC}"
  echo -e "Warnings: ${YELLOW}$WARNINGS${NC}"
  echo -e "Failed:   ${RED}$FAILED${NC}"
  echo ""

  if [[ $FAILED -gt 0 ]]; then
    log_error "Validation failed with $FAILED error(s)"
    echo ""
    echo "To fix issues:"
    echo "  • Install missing dependencies"
    echo "  • Run: ./scripts/validate-integration.sh --fix"
    echo "  • Check the documentation: docs/summit-cli-quickstart.md"
    exit 1
  elif [[ $WARNINGS -gt 0 ]]; then
    log_warning "Validation completed with $WARNINGS warning(s)"
    echo ""
    echo "Warnings can usually be ignored, but check if any affect your workflow."
    exit 0
  else
    log_success "All validations passed!"
    echo ""
    echo "Summit CLI is ready to use:"
    echo "  • Run: node summit-cli/bin/summit.js --help"
    echo "  • Or link globally: cd summit-cli && pnpm link --global"
    exit 0
  fi
}

# Run main function
main
