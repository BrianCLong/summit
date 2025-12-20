#!/usr/bin/env bash
set -euo pipefail

echo "# Release Notes"
echo ""
echo "**Generated:** $(date -u +"%Y-%m-%d %H:%M:%S UTC")"
echo ""

LAST_TAG=$(git describe --tags --abbrev=0 2>/dev/null || echo "")

if [ -z "$LAST_TAG" ]; then
  echo "## All Changes"
  git log --pretty=format:"- %s (%h) - %an" --no-merges
else
  echo "## Changes since $LAST_TAG"
  git log --pretty=format:"- %s (%h) - %an" --no-merges "${LAST_TAG}..HEAD"
fi

echo ""
echo ""
echo "---"
echo "🤖 Auto-generated release notes"
