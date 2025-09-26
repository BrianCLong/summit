#!/bin/bash
# MC v0.3+ A/A Expansion Rollout Script
set -euo pipefail

TENANT_ID="$1"
STAGE="${2:-staging}"
DURATION="${3:-24h}"

echo "🚀 Rolling out A/A GA for $TENANT_ID at stage $STAGE"

# Pre-flight checks
echo "Running pre-flight validation..."
./tenant_readiness_check.sh "$TENANT_ID" 14

# Enable A/A for tenant at specified stage
case "$STAGE" in
    "staging")
        echo "📋 Enabling staging A/A..."
        mc aa enable --tenant "$TENANT_ID" --stage staging --duration "$DURATION"
        ;;
    "canary_20")
        echo "📋 Enabling 20% canary..."
        mc aa enable --tenant "$TENANT_ID" --stage canary --percentage 20 --duration "$DURATION"
        ;;
    "canary_50")
        echo "📋 Enabling 50% canary..."
        mc aa enable --tenant "$TENANT_ID" --stage canary --percentage 50 --duration "$DURATION"
        ;;
    "production")
        echo "📋 Enabling full production A/A..."
        mc aa enable --tenant "$TENANT_ID" --stage production --duration "$DURATION"
        ;;
    *)
        echo "❌ Unknown stage: $STAGE"
        exit 1
        ;;
esac

# Monitor for duration
echo "⏱️ Monitoring for $DURATION..."
timeout "$DURATION" mc aa monitor --tenant "$TENANT_ID" --stage "$STAGE" || {
    echo "❌ Monitoring failed or timeout reached"
    mc aa rollback --tenant "$TENANT_ID"
    exit 1
}

echo "✅ Stage $STAGE completed successfully for $TENANT_ID"
