#!/usr/bin/env bash
set -euo pipefail
PR="${GITHUB_PR_NUMBER:-local}"
OUT="tools/evidence/out"
PKG="evidence-$PR.tar.gz"

tar -czf "$PKG" -C "$OUT" .
echo "Created $PKG"

# Upload as both zipped pack and raw files (for easy browsing)
echo "::group::Upload artifact"
echo "files: $PKG and $OUT/*"
echo "::endgroup::"

# Non-zipped bundle via actions/upload-artifact@v4 (called from YAML step)
# Keep script generic (no GitHub-specific here); upload handled in workflow:
