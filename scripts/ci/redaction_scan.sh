#!/bin/bash
set -e

EVIDENCE_DIR=${EVIDENCE_DIR:-artifacts/evidence/goldenpath-frontend}
echo "Scanning evidence for secrets in $EVIDENCE_DIR..."

FORBIDDEN_PATTERNS=("SECRET=" "TOKEN=" "Authorization: Bearer" "private_key")

FOUND_SECRETS=0

# Recursively grep for forbidden patterns in files
for PATTERN in "${FORBIDDEN_PATTERNS[@]}"; do
  if grep -r "$PATTERN" "$EVIDENCE_DIR" >/dev/null 2>&1; then
    echo "❌ Forbidden pattern found: '$PATTERN'"
    grep -r "$PATTERN" "$EVIDENCE_DIR"
    FOUND_SECRETS=1
  fi
done

if [ $FOUND_SECRETS -eq 1 ]; then
  echo "Policy Gate Failed: Secrets detected in evidence artifacts."
  exit 1
fi

echo "✅ Policy Gate Passed: No secrets detected."
exit 0
