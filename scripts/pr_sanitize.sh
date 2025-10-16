#!/usr/bin/env bash
set -euo pipefail
# Keep PRs clean of large binaries and transient artifacts
# Unstage offenders if present
patterns=(
  'neo4j/**'
  '**/dist/**' '**/build/**' '**/.turbo/**' '**/coverage/**'
  '**/*.db' '**/*.sqlite*'
)
for p in "${patterns[@]}"; do
  git rm -r --cached --ignore-unmatch $p 2>/dev/null || true
done

echo "Sanitize done"
