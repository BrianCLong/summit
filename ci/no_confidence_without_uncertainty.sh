#!/bin/bash
# CI Gate: No Confidence Without Uncertainty
# This script ensures that any JSON artifact containing a "confidence" field
# also includes the required "uncertainty" fields (epistemic and aleatoric).

set -e

FILE=$1

if [ ! -f "$FILE" ]; then
  echo "Error: File $FILE not found."
  exit 1
fi

# Check if "confidence" exists at the top level
HAS_CONFIDENCE=$(jq 'has("confidence")' "$FILE" 2>/dev/null || echo "false")

if [ "$HAS_CONFIDENCE" == "true" ]; then
  # Check for uncertainty fields
  HAS_EPISTEMIC=$(jq '(.uncertainty // {}) | has("epistemic")' "$FILE" 2>/dev/null || echo "false")
  HAS_ALEATORIC=$(jq '(.uncertainty // {}) | has("aleatoric")' "$FILE" 2>/dev/null || echo "false")

  if [ "$HAS_EPISTEMIC" != "true" ] || [ "$HAS_ALEATORIC" != "true" ]; then
    echo "FAILED: File $FILE contains 'confidence' at top level but is missing 'uncertainty.epistemic' or 'uncertainty.aleatoric'."
    exit 1
  fi
fi

# Also check for hypotheses in FHL format if applicable
IS_ARRAY=$(jq '.hypotheses | type == "array"' "$FILE" 2>/dev/null || echo "false")
if [[ "$IS_ARRAY" == "true" ]]; then
  # Find hypotheses that have confidence but lack epistemic or aleatoric uncertainty
  VIOLATIONS=$(jq '[.hypotheses[] | select(has("confidence") and ((.uncertainty // {}) | ((has("epistemic") | not) or (has("aleatoric") | not))))] | length' "$FILE")
  if [[ "$VIOLATIONS" -gt 0 ]]; then
    echo "FAILED: File $FILE contains $VIOLATIONS hypotheses with 'confidence' but missing uncertainty fields."
    exit 1
  fi
fi

echo "PASSED: $FILE complies with Uncertainty-First Analytic Record (UFAR) rules."
exit 0
