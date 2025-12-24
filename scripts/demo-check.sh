#!/bin/bash

# Demo Mode Gating Test
# Verifies that demo scripts properly enforce DEMO_MODE and NODE_ENV safety checks

set -euo pipefail

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DEMO_UP_SCRIPT="$SCRIPT_DIR/demo-up.sh"
DEMO_SEED_SCRIPT="$SCRIPT_DIR/demo-seed.sh"

# Print info message
info_msg() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

# Print success message
success_msg() {
    echo -e "${GREEN}✅ $1${NC}"
}

# Print warning message
warning_msg() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

# Print error message
error_msg() {
    echo -e "${RED}❌ $1${NC}"
}

# Test 1: Verify demo-up.sh fails without DEMO_MODE
test_demo_up_without_demo_mode() {
    info_msg "Testing demo-up.sh without DEMO_MODE..."

    # Unset DEMO_MODE for this test
    if env -u DEMO_MODE $DEMO_UP_SCRIPT --check 2>/dev/null; then
        error_msg "demo-up.sh should fail without DEMO_MODE=1"
        return 1
    else
        success_msg "demo-up.sh properly rejects missing DEMO_MODE"
        return 0
    fi
}

# Test 2: Verify demo-up.sh fails with NODE_ENV=production
test_demo_up_with_production_env() {
    info_msg "Testing demo-up.sh with NODE_ENV=production..."

    if env NODE_ENV=production DEMO_MODE=1 $DEMO_UP_SCRIPT --check 2>/dev/null; then
        error_msg "demo-up.sh should fail with NODE_ENV=production even with DEMO_MODE=1"
        return 1
    else
        success_msg "demo-up.sh properly rejects NODE_ENV=production"
        return 0
    fi
}

# Test 3: Verify demo-up.sh succeeds with proper environment
test_demo_up_with_proper_env() {
    info_msg "Testing demo-up.sh with proper environment (DEMO_MODE=1)..."

    # This test should pass the initial checks but may fail later due to missing services
    # We're only testing the initial gating, not the full execution
    if env NODE_ENV=development DEMO_MODE=1 $DEMO_UP_SCRIPT --check 2>/dev/null; then
        success_msg "demo-up.sh accepts proper environment (DEMO_MODE=1, NODE_ENV!=production)"
        return 0
    else
        # If it fails after --check, it means the initial gating passed but something else failed
        # Let's run with a timeout to see if it gets past the initial checks
        if timeout 10 bash -c "env NODE_ENV=development DEMO_MODE=1 $DEMO_UP_SCRIPT --check" 2>/dev/null; then
            success_msg "demo-up.sh accepts proper environment (DEMO_MODE=1, NODE_ENV!=production)"
            return 0
        else
            error_msg "demo-up.sh failed with proper environment"
            return 1
        fi
    fi
}

# Test 4: Verify demo-seed.sh fails without DEMO_MODE
test_demo_seed_without_demo_mode() {
    info_msg "Testing demo-seed.sh without DEMO_MODE..."

    if env -u DEMO_MODE $DEMO_SEED_SCRIPT 2>/dev/null; then
        error_msg "demo-seed.sh should fail without DEMO_MODE=1"
        return 1
    else
        success_msg "demo-seed.sh properly rejects missing DEMO_MODE"
        return 0
    fi
}

# Test 5: Verify demo-seed.sh fails with NODE_ENV=production
test_demo_seed_with_production_env() {
    info_msg "Testing demo-seed.sh with NODE_ENV=production..."

    if env NODE_ENV=production DEMO_MODE=1 $DEMO_SEED_SCRIPT 2>/dev/null; then
        error_msg "demo-seed.sh should fail with NODE_ENV=production even with DEMO_MODE=1"
        return 1
    else
        success_msg "demo-seed.sh properly rejects NODE_ENV=production"
        return 0
    fi
}

# Main test execution
main() {
    echo -e "${BLUE}🛡️  Demo Mode Gating Test${NC}"
    echo -e "${BLUE}========================${NC}"
    echo ""

    local total_tests=5
    local passed_tests=0
    local test_results=()

    # Run tests (temporarily disable exit-on-error for expected failures)
    set +e

    if test_demo_up_without_demo_mode; then
        ((passed_tests++))
        test_results+=("✅ demo-up.sh without DEMO_MODE")
    else
        test_results+=("❌ demo-up.sh without DEMO_MODE")
    fi

    if test_demo_up_with_production_env; then
        ((passed_tests++))
        test_results+=("✅ demo-up.sh with NODE_ENV=production")
    else
        test_results+=("❌ demo-up.sh with NODE_ENV=production")
    fi

    if test_demo_up_with_proper_env; then
        ((passed_tests++))
        test_results+=("✅ demo-up.sh with proper environment")
    else
        test_results+=("❌ demo-up.sh with proper environment")
    fi

    if test_demo_seed_without_demo_mode; then
        ((passed_tests++))
        test_results+=("✅ demo-seed.sh without DEMO_MODE")
    else
        test_results+=("❌ demo-seed.sh without DEMO_MODE")
    fi

    if test_demo_seed_with_production_env; then
        ((passed_tests++))
        test_results+=("✅ demo-seed.sh with NODE_ENV=production")
    else
        test_results+=("❌ demo-seed.sh with NODE_ENV=production")
    fi

    # Re-enable exit-on-error
    set -e

    echo ""
    echo -e "${BLUE}Test Results:${NC}"
    for result in "${test_results[@]}"; do
        echo "  $result"
    done

    echo ""
    if [ $passed_tests -eq $total_tests ]; then
        echo -e "${GREEN}🎉 All ($total_tests/$total_tests) tests passed! Demo mode gating is working correctly.${NC}"
        return 0
    else
        echo -e "${RED}❌ $((total_tests - passed_tests)) out of $total_tests tests failed. Demo mode gating needs fixes.${NC}"
        return 1
    fi
}

# Run main function
main "$@"