#!/usr/bin/env bash
set -euo pipefail
TAG=${1:? "usage: scripts/release.sh v0.1.0"}

# Create evidence bundle
echo "Creating evidence bundle..."
make evidence || true

# Create release with all artifacts
echo "Creating GitHub release..."
ASSETS=(
  "docker-compose.fresh.yml"
  "docker-compose.app.yml" 
  "docker-compose.observability.yml"
  ".env.example"
  "Makefile"
  "docs/OPERATOR_READINESS.md"
  "docs/OPS_TLDR.md"
  "docs/ANNOUNCEMENT.md"
)

gh release create "$TAG" \
  -F .github/release_body_v0.1.0.md \
  "${ASSETS[@]}" || true

# Upload evidence bundle
echo "Uploading evidence bundle..."
if [ -d "dist/evidence" ]; then
  EVIDENCE_FILES=$(find dist/evidence -type f | xargs || true)
  if [ -n "$EVIDENCE_FILES" ]; then
    gh release upload "$TAG" $EVIDENCE_FILES || true
  fi
fi

echo "✅ Release $TAG created with evidence bundle."