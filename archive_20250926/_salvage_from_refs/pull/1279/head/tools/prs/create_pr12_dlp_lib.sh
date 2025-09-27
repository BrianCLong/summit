#!/usr/bin/env bash
set -euo pipefail
BR=feat/dlp-lib
(git checkout -b $BR || git checkout $BR)
FILES="libs/dlp services/export/dlp.go .github/workflows/go-ci.yml"
git add $FILES 2>/dev/null || true
git commit -m "feat(dlp): masking library + adapter + Go CI" || echo "Nothing to commit"
echo "Branch $BR ready. Push and open PR."
