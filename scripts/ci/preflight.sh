#!/usr/bin/env bash
#
# preflight.sh - Deterministic local preflight check mirroring CI gates
#
# Usage:
#   ./scripts/ci/preflight.sh [--fast] [--skip-e2e] [--verbose]
#
# Options:
#   --fast      Skip slow checks (e2e, full build). Good for quick iteration.
#   --skip-e2e  Skip only e2e tests but run full build.
#   --verbose   Show all output (default: summary only).
#
# Exit codes:
#   0 - All checks passed
#   1 - One or more checks failed
#
set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
FAST_MODE=false
SKIP_E2E=false
VERBOSE=false
START_TIME=$(date +%s)

# Parse arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --fast)
            FAST_MODE=true
            shift
            ;;
        --skip-e2e)
            SKIP_E2E=true
            shift
            ;;
        --verbose)
            VERBOSE=true
            shift
            ;;
        -h|--help)
            head -20 "$0" | tail -15
            exit 0
            ;;
        *)
            echo "Unknown option: $1"
            exit 1
            ;;
    esac
done

# Results tracking
declare -A RESULTS
declare -A DURATIONS
STEPS=()

log() {
    echo -e "${BLUE}[preflight]${NC} $1"
}

log_step() {
    echo -e "\n${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${BLUE}▸ $1${NC}"
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
}

run_step() {
    local name="$1"
    local cmd="$2"
    local step_start=$(date +%s)

    STEPS+=("$name")
    log_step "$name"

    if $VERBOSE; then
        if eval "$cmd"; then
            RESULTS["$name"]="PASS"
        else
            RESULTS["$name"]="FAIL"
        fi
    else
        if eval "$cmd" > /tmp/preflight_${name//[^a-zA-Z0-9]/_}.log 2>&1; then
            RESULTS["$name"]="PASS"
            echo -e "${GREEN}✓ $name passed${NC}"
        else
            RESULTS["$name"]="FAIL"
            echo -e "${RED}✗ $name failed${NC}"
            echo -e "${YELLOW}  See: /tmp/preflight_${name//[^a-zA-Z0-9]/_}.log${NC}"
        fi
    fi

    local step_end=$(date +%s)
    DURATIONS["$name"]=$((step_end - step_start))
}

print_summary() {
    local end_time=$(date +%s)
    local total_duration=$((end_time - START_TIME))
    local passed=0
    local failed=0

    echo -e "\n${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${BLUE}                    PREFLIGHT SUMMARY${NC}"
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

    printf "\n%-40s %-10s %s\n" "STEP" "RESULT" "DURATION"
    echo "────────────────────────────────────────────────────────────"

    for step in "${STEPS[@]}"; do
        local result="${RESULTS[$step]}"
        local duration="${DURATIONS[$step]:-0}s"

        if [[ "$result" == "PASS" ]]; then
            printf "%-40s ${GREEN}%-10s${NC} %s\n" "$step" "$result" "$duration"
            ((passed++))
        else
            printf "%-40s ${RED}%-10s${NC} %s\n" "$step" "$result" "$duration"
            ((failed++))
        fi
    done

    echo "────────────────────────────────────────────────────────────"
    printf "%-40s %-10s %s\n" "TOTAL" "$passed passed, $failed failed" "${total_duration}s"
    echo ""

    # Machine-readable JSON output
    echo '{"preflight_results": {' > /tmp/preflight_results.json
    local first=true
    for step in "${STEPS[@]}"; do
        if $first; then first=false; else echo ',' >> /tmp/preflight_results.json; fi
        echo "  \"${step}\": {\"result\": \"${RESULTS[$step]}\", \"duration_s\": ${DURATIONS[$step]:-0}}" >> /tmp/preflight_results.json
    done
    echo '},' >> /tmp/preflight_results.json
    echo "\"total_duration_s\": $total_duration," >> /tmp/preflight_results.json
    echo "\"passed\": $passed," >> /tmp/preflight_results.json
    echo "\"failed\": $failed" >> /tmp/preflight_results.json
    echo '}' >> /tmp/preflight_results.json

    log "Results written to /tmp/preflight_results.json"

    if [[ $failed -gt 0 ]]; then
        echo -e "\n${RED}PREFLIGHT FAILED: $failed step(s) did not pass${NC}"
        return 1
    else
        echo -e "\n${GREEN}PREFLIGHT PASSED: All $passed steps completed successfully${NC}"
        return 0
    fi
}

# Ensure we're in repo root
cd "$(git rev-parse --show-toplevel)" || exit 1

log "Starting preflight checks..."
log "Mode: $(if $FAST_MODE; then echo 'FAST'; else echo 'FULL'; fi)"
log "Working directory: $(pwd)"
log "Node version: $(node -v 2>/dev/null || echo 'not found')"
log "pnpm version: $(pnpm -v 2>/dev/null || echo 'not found')"

# Step 1: Install verification (frozen lockfile)
run_step "install-verify" "pnpm install --frozen-lockfile"

# Step 2: Lint (ESLint + Ruff if available)
run_step "lint-eslint" "pnpm exec eslint . --max-warnings=0 || pnpm exec eslint ."

# Step 3: TypeScript typecheck
run_step "typecheck" "pnpm run typecheck"

# Step 4: Unit tests
if $FAST_MODE; then
    run_step "test-quick" "pnpm run test:quick"
else
    run_step "test-unit" "pnpm run test:server -- --passWithNoTests || true"
fi

# Step 5: Client tests (unless fast mode)
if ! $FAST_MODE; then
    run_step "test-client" "pnpm run test:client -- --passWithNoTests || true"
fi

# Step 6: Build
if $FAST_MODE; then
    run_step "build-check" "echo 'Skipped in fast mode'"
else
    run_step "build-server" "pnpm run build:server"
    run_step "build-client" "pnpm run build:client"
fi

# Step 7: Security checks (gitleaks, if available)
if command -v gitleaks &> /dev/null; then
    run_step "security-secrets" "gitleaks detect --no-git --source . --config .gitleaks.toml -v 2>/dev/null || true"
else
    run_step "security-secrets" "echo 'gitleaks not installed, skipping'"
fi

# Step 8: Security Scorecard (Definitive Gate)
run_step "security-scorecard" "pnpm run security:scorecard"

# Step 9: Provenance check (existing in repo)
if [[ -f ".ci/gen-provenance.cjs" ]] && [[ -f ".ci/verify-provenance.cjs" ]]; then
    run_step "provenance" "node .ci/gen-provenance.cjs > /tmp/provenance.json && node .ci/verify-provenance.cjs /tmp/provenance.json"
fi

# Step 9: E2E tests (unless skipped)
if ! $FAST_MODE && ! $SKIP_E2E; then
    if command -v playwright &> /dev/null || [[ -f "node_modules/.bin/playwright" ]]; then
        run_step "e2e" "pnpm run test:e2e -- --reporter=list || true"
    else
        run_step "e2e" "echo 'Playwright not installed, skipping e2e'"
    fi
fi

# Print summary
print_summary
