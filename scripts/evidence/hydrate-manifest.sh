#!/bin/bash
# scripts/evidence/hydrate-manifest.sh
# Hydrates EVIDENCE_BUNDLE.manifest.json with actual release metadata
#
# Usage: ./scripts/evidence/hydrate-manifest.sh [output-dir]
#
# Environment variables:
#   GITHUB_WORKFLOW - CI pipeline name (defaults to "local")
#   GITHUB_ACTOR    - Approver identity (defaults to current user)

set -euo pipefail

MANIFEST="EVIDENCE_BUNDLE.manifest.json"
COMMIT_SHA=$(git rev-parse HEAD)
OUTPUT_DIR="${1:-dist/evidence/$COMMIT_SHA}"
OUTPUT="$OUTPUT_DIR/manifest.json"

if [[ ! -f "$MANIFEST" ]]; then
  echo "ERROR: $MANIFEST not found in repository root"
  exit 1
fi

mkdir -p "$OUTPUT_DIR"

# Hydrate template variables
GIT_COMMIT="$COMMIT_SHA"
BUILD_TIMESTAMP=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
PIPELINE="${GITHUB_WORKFLOW:-local}"
APPROVER="${GITHUB_ACTOR:-$(whoami)}"

cat "$MANIFEST" | \
  sed "s/{{ .Release.GitCommit }}/$GIT_COMMIT/g" | \
  sed "s/{{ .Release.Pipeline }}/$PIPELINE/g" | \
  sed "s/{{ .Release.BuildTime }}/$BUILD_TIMESTAMP/g" | \
  sed "s/{{ .Release.Approver }}/$APPROVER/g" \
  > "$OUTPUT"

echo "Hydrated manifest written to $OUTPUT"
echo "  Git Commit: $GIT_COMMIT"
echo "  Build Time: $BUILD_TIMESTAMP"
echo "  Pipeline: $PIPELINE"
echo "  Approver: $APPROVER"

# Validate JSON is well-formed
if command -v jq &> /dev/null; then
  jq empty "$OUTPUT" 2>/dev/null || {
    echo "ERROR: Hydrated manifest is not valid JSON"
    exit 1
  }
  echo "  JSON validation: PASSED"
fi
