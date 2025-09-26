#!/bin/bash
# MC v0.3.2 - Tenant Readiness Assessment Runner
set -euo pipefail

TENANT=${1:?tenant required}
CHECKLIST_PATH="ops/readiness/tenants/${TENANT}/checklist.yaml"
OUTPUT_DIR="out/readiness"
OUTPUT_FILE="${OUTPUT_DIR}/${TENANT}-readiness.json"

mkdir -p "$OUTPUT_DIR"

echo "🔍 Assessing readiness for $TENANT..."

# Validate checklist exists
if [[ ! -f "$CHECKLIST_PATH" ]]; then
    echo "❌ Checklist not found: $CHECKLIST_PATH"
    exit 1
fi

# Run comprehensive assessment
echo "📋 Running readiness assessment..."
mc readiness assess \
    --tenant "$TENANT" \
    --checklist "$CHECKLIST_PATH" \
    --out "$OUTPUT_FILE" \
    --verbose \
    --include-metrics \
    --timeout 300

# Validate results
echo "✅ Validating assessment results..."
READINESS_STATUS=$(jq -r '.status' "$OUTPUT_FILE")
READINESS_SCORE=$(jq -r '.readiness_score' "$OUTPUT_FILE")

if [[ "$READINESS_STATUS" != "READY" ]]; then
    echo "❌ Tenant $TENANT not ready: $READINESS_STATUS"
    echo "📋 Blockers:"
    jq -r '.blockers[]' "$OUTPUT_FILE" | sed 's/^/  - /'
    exit 1
fi

if (( $(echo "$READINESS_SCORE < 0.85" | bc -l) )); then
    echo "❌ Readiness score $READINESS_SCORE below 85% threshold"
    exit 1
fi

echo "✅ Tenant $TENANT ready for A/A rollout"
echo "📊 Readiness score: $READINESS_SCORE"
echo "📋 Assessment: $OUTPUT_FILE"

# Register for DR drills
echo "📅 Registering for monthly DR drills..."
mc dr register \
    --tenant "$TENANT" \
    --schedule monthly \
    --rpo-target "$(yq -r '.disaster_recovery.rpo_target_minutes' "$CHECKLIST_PATH")" \
    --rto-target "$(yq -r '.disaster_recovery.rto_target_minutes' "$CHECKLIST_PATH")"

echo "✅ DR drill registration complete"
