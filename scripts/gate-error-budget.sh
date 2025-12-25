#!/bin/bash
set -euo pipefail

# G2: Error Budget Policy Gate
# Constraints deploy promotion when budget is exhausted.

readonly REMAINING_BUDGET="${1:-100}" # Percentage or Minutes
readonly REQUIRED_BUDGET_FOR_PROMO="${2:-10}" # Need at least 10% budget to risk a deploy

check_budget() {
    echo "Checking Error Budget..."
    echo "Remaining: $REMAINING_BUDGET | Required: $REQUIRED_BUDGET_FOR_PROMO"

    if [ "$REMAINING_BUDGET" -lt "$REQUIRED_BUDGET_FOR_PROMO" ]; then
        echo "⛔ Error Budget Exhausted ($REMAINING_BUDGET < $REQUIRED_BUDGET_FOR_PROMO)."
        echo "Deployment BLOCKED to protect reliability."

        # Check for waiver
        if [ "${WAIVER_ID:-}" != "" ]; then
            echo "⚠️  Waiver found ($WAIVER_ID). Allowing deployment despite budget exhaustion."
            echo "AUDIT: Waiver $WAIVER_ID used by ${USER:-unknown} at $(date)" >> audit/waivers.log
            return 0
        fi

        return 1
    fi

    echo "✅ Budget sufficient. Proceeding."
    return 0
}

check_budget
