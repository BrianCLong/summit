#!/usr/bin/env bash
#
# verify_runtime.sh - Verify test runtime consistency
#
# This script checks that the test runtime configuration is consistent
# across the monorepo to prevent CI flakiness and module resolution issues.
#
# Exit codes:
#   0 - All checks passed
#   1 - One or more checks failed

set -uo pipefail
# Note: -e disabled to allow warnings without exit

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "${SCRIPT_DIR}/../.." && pwd)"

ERRORS=0
WARNINGS=0

log_pass() {
    echo -e "${GREEN}[PASS]${NC} $1"
}

log_fail() {
    echo -e "${RED}[FAIL]${NC} $1"
    ((ERRORS++))
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
    ((WARNINGS++))
}

log_info() {
    echo -e "[INFO] $1"
}

# Check Node version
check_node_version() {
    local required="18.18"
    local current
    current=$(node --version | sed 's/v//')

    if [[ "$(printf '%s\n' "$required" "$current" | sort -V | head -n1)" == "$required" ]]; then
        log_pass "Node version: $current (>= $required required)"
    else
        log_fail "Node version: $current (>= $required required)"
    fi
}

# Check pnpm version matches packageManager field
check_pnpm_version() {
    local pkg_manager
    pkg_manager=$(grep '"packageManager"' "$ROOT_DIR/package.json" | sed 's/.*"pnpm@\([^"]*\)".*/\1/')

    if command -v pnpm &> /dev/null; then
        local current
        current=$(pnpm --version)
        if [[ "$current" == "$pkg_manager"* ]]; then
            log_pass "pnpm version: $current (matches packageManager: pnpm@$pkg_manager)"
        else
            log_warn "pnpm version: $current (packageManager specifies: pnpm@$pkg_manager)"
        fi
    else
        log_fail "pnpm not found"
    fi
}

# Check for ESM consistency
check_esm_packages() {
    log_info "Checking ESM package declarations..."

    local esm_packages
    esm_packages=$(find "$ROOT_DIR" -name "package.json" -not -path "*/node_modules/*" | xargs grep -l '"type": "module"' 2>/dev/null || true)

    local count
    count=$(echo "$esm_packages" | wc -l | tr -d ' ')

    log_pass "Found $count packages with ESM enabled"

    # Check core packages are ESM
    for pkg in "server/package.json" "client/package.json"; do
        if grep -q '"type": "module"' "$ROOT_DIR/$pkg" 2>/dev/null; then
            log_pass "$pkg is ESM"
        else
            log_fail "$pkg is NOT ESM"
        fi
    done
}

# Check Jest configs use ESM preset
check_jest_configs() {
    log_info "Checking Jest ESM preset usage..."

    local esm_count=0
    local total_count=0

    # Use a timeout to prevent hanging on large codebases
    local configs
    configs=$(timeout 10 find "$ROOT_DIR" -name "jest.config.*" -not -path "*/node_modules/*" -not -path "*/dist/*" -maxdepth 5 2>/dev/null || echo "")

    if [[ -z "$configs" ]]; then
        log_warn "No Jest configs found or search timed out"
        return
    fi

    while IFS= read -r config; do
        if [[ -n "$config" && -f "$config" ]]; then
            ((total_count++)) || true
            if grep -q "default-esm" "$config" 2>/dev/null || grep -q "useESM.*true" "$config" 2>/dev/null; then
                ((esm_count++)) || true
            fi
        fi
    done <<< "$configs"

    if [[ $total_count -gt 0 ]]; then
        log_pass "Jest ESM configs: $esm_count/$total_count use ESM preset"
    else
        log_warn "No Jest configs found"
    fi
}

# Check for conflicting test runners
check_runner_conflicts() {
    log_info "Checking for test runner conflicts..."

    local jest_count
    jest_count=$(timeout 10 find "$ROOT_DIR" -name "jest.config.*" -not -path "*/node_modules/*" -not -path "*/dist/*" -maxdepth 5 2>/dev/null | wc -l | tr -d ' ') || jest_count=0

    local vitest_count
    vitest_count=$(timeout 10 find "$ROOT_DIR" -name "vitest.config.*" -not -path "*/node_modules/*" -maxdepth 5 2>/dev/null | wc -l | tr -d ' ') || vitest_count=0

    log_info "Found $jest_count Jest configs and $vitest_count Vitest configs"

    # Check if client has both
    if [[ -f "$ROOT_DIR/client/jest.config.cjs" ]]; then
        if grep -q "test:vitest" "$ROOT_DIR/client/package.json" 2>/dev/null; then
            log_warn "Client runs BOTH Jest and Vitest - consider consolidating"
        fi
    fi
}

# Check for extension resolution issues
check_extension_resolution() {
    log_info "Checking module extension resolution..."

    local mappers_with_js=0

    # Check key config files for ESM extension mapper
    for config in "$ROOT_DIR/jest.config.cjs" "$ROOT_DIR/server/jest.config.ts" "$ROOT_DIR/client/jest.config.cjs"; do
        if [[ -f "$config" ]] && grep -q '\.js.*\$1' "$config" 2>/dev/null; then
            ((mappers_with_js++)) || true
        fi
    done

    if [[ "$mappers_with_js" -gt 0 ]]; then
        log_pass "$mappers_with_js core configs have .js -> no-extension mapper"
    else
        log_warn "No core Jest configs with ESM extension mapper found"
    fi
}

# Main
main() {
    echo "========================================"
    echo "  Test Runtime Verification"
    echo "========================================"
    echo ""

    cd "$ROOT_DIR"

    check_node_version
    check_pnpm_version
    check_esm_packages
    check_jest_configs
    check_runner_conflicts
    check_extension_resolution

    echo ""
    echo "========================================"
    echo "  Summary"
    echo "========================================"

    if [[ $ERRORS -gt 0 ]]; then
        echo -e "${RED}$ERRORS error(s)${NC}, ${YELLOW}$WARNINGS warning(s)${NC}"
        exit 1
    elif [[ $WARNINGS -gt 0 ]]; then
        echo -e "${GREEN}0 errors${NC}, ${YELLOW}$WARNINGS warning(s)${NC}"
        exit 0
    else
        echo -e "${GREEN}All checks passed!${NC}"
        exit 0
    fi
}

main "$@"
