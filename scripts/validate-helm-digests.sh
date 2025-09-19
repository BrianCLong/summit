#!/bin/bash
# Validate that all Helm charts use image digests, not tags

set -euo pipefail

CHART_DIRS="charts/"
EXIT_CODE=0

echo "🔍 Validating Helm charts for digest-only image references..."

find "$CHART_DIRS" -name "values*.yaml" -print0 | while IFS= read -r -d '' values_file; do
  echo "Checking: $values_file"

  # Check if any image.tag is set to a non-empty value
  if grep -q "tag: \".*[^\"]\|tag: [^\"#]" "$values_file"; then
    echo "❌ ERROR: Found non-empty image tag in $values_file"
    echo "   Use image.digest instead of image.tag for security"
    grep -n "tag:" "$values_file"
    EXIT_CODE=1
  fi

  # Check if digest is properly set
  if ! grep -q "digest: sha256:" "$values_file"; then
    echo "⚠️  WARNING: No sha256 digest found in $values_file"
    echo "   Ensure image.digest is set with a valid sha256 hash"
  fi
done

if [ $EXIT_CODE -eq 0 ]; then
  echo "✅ All Helm charts are using digest-based image references"
else
  echo "❌ Validation failed: Some charts are using mutable tags"
  exit 1
fi