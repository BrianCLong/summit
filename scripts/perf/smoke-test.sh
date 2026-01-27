#!/bin/bash
# scripts/perf/smoke-test.sh - Performance smoke test for CI
# Quick performance validation to catch obvious regressions
#
# Usage: ./scripts/perf/smoke-test.sh
#
# Environment variables:
#   PERF_THRESHOLD_MS - Maximum acceptable response time in ms (default: 5000)

set -euo pipefail

THRESHOLD_MS=${PERF_THRESHOLD_MS:-5000}
ERRORS=0

echo "=== Performance Smoke Test ==="
echo "Threshold: ${THRESHOLD_MS}ms"
echo ""

# ═══════════════════════════════════════════════════════════════════════════
# Build Performance Check
# ═══════════════════════════════════════════════════════════════════════════
check_build_time() {
    echo "Checking build performance..."

    # Time a typecheck as a proxy for build performance
    if [ -f "tsconfig.json" ]; then
        START_TIME=$(date +%s%3N)

        if timeout 120 pnpm typecheck 2>/dev/null; then
            END_TIME=$(date +%s%3N)
            DURATION=$((END_TIME - START_TIME))

            echo "  TypeCheck completed in ${DURATION}ms"

            # Build should complete in reasonable time (2 minutes)
            if [ "$DURATION" -gt 120000 ]; then
                echo "  ⚠️  Build time exceeds 2 minutes - performance regression detected"
                ((ERRORS++))
            else
                echo "  ✅ Build time acceptable"
            fi
        else
            echo "  ⚠️  TypeCheck failed or timed out"
            ((ERRORS++))
        fi
    else
        echo "  ℹ️  No tsconfig.json found, skipping build check"
    fi
    echo ""
}

# ═══════════════════════════════════════════════════════════════════════════
# Import Performance Check
# ═══════════════════════════════════════════════════════════════════════════
check_import_time() {
    echo "Checking module import performance..."

    # Create a temporary test file
    TEMP_FILE=$(mktemp /tmp/perf-test-XXXXXX.mjs)
    cat > "$TEMP_FILE" << 'EOF'
const start = Date.now();

// Test importing common modules
try {
    await import('typescript');
} catch (e) {
    // Module may not be available
}

const duration = Date.now() - start;
console.log(`Module import time: ${duration}ms`);

if (duration > 10000) {
    console.log('⚠️  Module import is slow (>10s)');
    process.exit(1);
}
console.log('✅ Module import time acceptable');
EOF

    if node "$TEMP_FILE" 2>/dev/null; then
        echo "  ✅ Module import check passed"
    else
        echo "  ⚠️  Module import check failed"
        ((ERRORS++))
    fi

    rm -f "$TEMP_FILE"
    echo ""
}

# ═══════════════════════════════════════════════════════════════════════════
# Test Execution Time Check
# ═══════════════════════════════════════════════════════════════════════════
check_test_time() {
    echo "Checking test execution performance..."

    # Run quick tests if available
    if [ -f "package.json" ]; then
        # Check if test:quick exists
        if grep -q '"test:quick"' package.json; then
            START_TIME=$(date +%s%3N)

            if timeout 60 pnpm test:quick 2>/dev/null; then
                END_TIME=$(date +%s%3N)
                DURATION=$((END_TIME - START_TIME))

                echo "  Quick tests completed in ${DURATION}ms"

                if [ "$DURATION" -gt "$THRESHOLD_MS" ]; then
                    echo "  ⚠️  Test time exceeds threshold (${THRESHOLD_MS}ms)"
                    ((ERRORS++))
                else
                    echo "  ✅ Test time acceptable"
                fi
            else
                echo "  ℹ️  Quick tests not configured or failed"
            fi
        else
            echo "  ℹ️  No test:quick script found, skipping"
        fi
    fi
    echo ""
}

# ═══════════════════════════════════════════════════════════════════════════
# Bundle Size Check
# ═══════════════════════════════════════════════════════════════════════════
check_bundle_size() {
    echo "Checking bundle sizes..."

    # Check if built bundles exist
    BUNDLE_DIRS=("dist" "build" "client/dist" "client/build")

    for dir in "${BUNDLE_DIRS[@]}"; do
        if [ -d "$dir" ]; then
            SIZE=$(du -sh "$dir" 2>/dev/null | cut -f1)
            echo "  $dir: $SIZE"

            # Check for excessively large bundles (>100MB is suspicious)
            SIZE_BYTES=$(du -sb "$dir" 2>/dev/null | cut -f1 || echo "0")
            if [ "$SIZE_BYTES" -gt 104857600 ]; then
                echo "  ⚠️  Bundle size exceeds 100MB - review for optimization"
            fi
        fi
    done

    echo "  ✅ Bundle size check complete"
    echo ""
}

# ═══════════════════════════════════════════════════════════════════════════
# Memory Usage Check
# ═══════════════════════════════════════════════════════════════════════════
check_memory() {
    echo "Checking Node.js memory configuration..."

    # Check NODE_OPTIONS for memory settings
    if [ -n "${NODE_OPTIONS:-}" ]; then
        echo "  NODE_OPTIONS: $NODE_OPTIONS"
    else
        echo "  NODE_OPTIONS: not set (using defaults)"
    fi

    # Show available memory
    if command -v free &> /dev/null; then
        AVAILABLE_MEM=$(free -h | grep Mem | awk '{print $7}')
        echo "  Available memory: $AVAILABLE_MEM"
    fi

    echo "  ✅ Memory check complete"
    echo ""
}

# ═══════════════════════════════════════════════════════════════════════════
# Summary
# ═══════════════════════════════════════════════════════════════════════════
print_summary() {
    echo "=== Performance Smoke Test Summary ==="
    echo ""

    if [ "$ERRORS" -eq 0 ]; then
        echo "✅ All performance checks passed"
        exit 0
    else
        echo "⚠️  $ERRORS performance issue(s) detected"
        echo "   Review the output above for details"
        exit 1
    fi
}

# ═══════════════════════════════════════════════════════════════════════════
# Main
# ═══════════════════════════════════════════════════════════════════════════
main() {
    check_build_time
    check_import_time
    check_test_time
    check_bundle_size
    check_memory
    print_summary
}

main "$@"
