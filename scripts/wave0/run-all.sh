#!/bin/bash
# Wave 0: Run All Implementation Scripts
# Executes all Wave 0 tasks in sequence

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo "╔═══════════════════════════════════════════════════════════════╗"
echo "║          Summit Wave 0: Baseline Stabilization               ║"
echo "╚═══════════════════════════════════════════════════════════════╝"
echo ""

# Track overall status
TOTAL_STEPS=5
COMPLETED_STEPS=0

run_step() {
    local step_num=$1
    local step_name=$2
    local script=$3

    echo ""
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "Step $step_num/$TOTAL_STEPS: $step_name"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo ""

    if [ -x "$SCRIPT_DIR/$script" ]; then
        if "$SCRIPT_DIR/$script" "$@"; then
            COMPLETED_STEPS=$((COMPLETED_STEPS + 1))
            echo ""
            echo "✓ Step $step_num completed successfully"
        else
            echo ""
            echo "✗ Step $step_num failed"
            return 1
        fi
    else
        echo "Script not found or not executable: $script"
        return 1
    fi
}

# Parse arguments
SKIP_VALIDATION=false
CLEAN_START=false

while [[ $# -gt 0 ]]; do
    case $1 in
        --skip-validation)
            SKIP_VALIDATION=true
            shift
            ;;
        --clean)
            CLEAN_START=true
            shift
            ;;
        *)
            echo "Unknown option: $1"
            exit 1
            ;;
    esac
done

# Step 1: Golden Path Validation
if [ "$SKIP_VALIDATION" = false ]; then
    VALIDATION_ARGS=""
    if [ "$CLEAN_START" = true ]; then
        VALIDATION_ARGS="--clean"
    fi
    run_step 1 "Golden Path Validation" "01-validate-golden-path.sh" $VALIDATION_ARGS || {
        echo ""
        echo "Golden path validation failed. Fix issues before continuing."
        echo "Run with --skip-validation to skip this step."
        exit 1
    }
else
    echo ""
    echo "Skipping golden path validation (--skip-validation)"
    COMPLETED_STEPS=$((COMPLETED_STEPS + 1))
fi

# Step 2: Install Packages
run_step 2 "Package Installation" "02-install-packages.sh" || {
    echo "Package installation failed"
    exit 1
}

# Step 3: Health Checks
run_step 3 "Health Checks" "03-run-health-checks.sh" || {
    echo "Health checks failed (continuing anyway)"
}

# Step 4: Schema Validation
run_step 4 "Schema Validation" "04-validate-schema.sh" || {
    echo "Schema validation failed"
    exit 1
}

# Step 5: Generate Reports
run_step 5 "Report Generation" "05-generate-reports.sh" || {
    echo "Report generation failed"
    exit 1
}

# Final Summary
echo ""
echo "╔═══════════════════════════════════════════════════════════════╗"
echo "║                    Wave 0 Summary                             ║"
echo "╚═══════════════════════════════════════════════════════════════╝"
echo ""
echo "Completed: $COMPLETED_STEPS/$TOTAL_STEPS steps"
echo ""

if [ $COMPLETED_STEPS -eq $TOTAL_STEPS ]; then
    echo "🎉 Wave 0 Baseline Stabilization Complete!"
    echo ""
    echo "Next steps:"
    echo "  1. Review reports in reports/wave0/"
    echo "  2. Verify all checklist items"
    echo "  3. Proceed to Wave 1: Canonical Schema Migration"
else
    echo "⚠️  Wave 0 partially complete"
    echo ""
    echo "Review failed steps above and retry"
fi

echo ""
echo "Reports available at: reports/wave0/"
