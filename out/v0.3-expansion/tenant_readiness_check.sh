#!/bin/bash
# MC v0.3+ Tenant Readiness Validation Script
set -euo pipefail

TENANT_ID="$1"
PREREQUISITES_DAYS="${2:-14}"

echo "🔍 Validating tenant readiness: $TENANT_ID"

# Check 14-day green health
echo "Checking $PREREQUISITES_DAYS-day green health..."
HEALTH_SCORE=$(mc health check --tenant "$TENANT_ID" --days "$PREREQUISITES_DAYS" --json | jq -r '.overall_score')
if (( $(echo "$HEALTH_SCORE < 0.994" | bc -l) )); then
    echo "❌ Health score $HEALTH_SCORE below 99.4% threshold"
    exit 1
fi

# Check persisted query compliance
PERSISTED_COMPLIANCE=$(mc query compliance --tenant "$TENANT_ID" --json | jq -r '.persisted_rate')
if (( $(echo "$PERSISTED_COMPLIANCE < 0.999" | bc -l) )); then
    echo "❌ Persisted query compliance $PERSISTED_COMPLIANCE below 99.9%"
    exit 1
fi

# Check residency coverage
RESIDENCY_COVERAGE=$(mc residency check --tenant "$TENANT_ID" --json | jq -r '.coverage_percent')
if (( $(echo "$RESIDENCY_COVERAGE < 95.0" | bc -l) )); then
    echo "❌ Residency coverage $RESIDENCY_COVERAGE below 95%"
    exit 1
fi

echo "✅ Tenant $TENANT_ID ready for A/A GA expansion"
