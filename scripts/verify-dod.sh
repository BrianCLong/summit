#!/usr/bin/env bash
set -euo pipefail

red() { printf "%s\n" "$*"; }
green() { printf "%s\n" "$*"; }
yellow() { printf "%s\n" "$*"; }

fail=0

# 1) Node versions <20
if grep -RIn "node-version" .github/workflows/*.yml | grep -E "16|18" >/dev/null 2>&1; then
  red "Found Node <20 in workflows:" && \
  grep -RIn "node-version" .github/workflows/*.yml | grep -E "16|18" || true
  fail=1
else
  green "Node 20 OK in workflows"
fi

# 2) npm cache/commands instead of pnpm
if grep -RIn "cache: \"npm\"" .github/workflows/*.yml >/dev/null 2>&1 || \
   grep -RIn "cache: 'npm'" .github/workflows/*.yml >/dev/null 2>&1 || \
   grep -RIn "npm ci" .github/workflows/*.yml >/dev/null 2>&1 || \
   grep -RIn "npm install" .github/workflows/*.yml >/dev/null 2>&1;
then
  yellow "npm usage found in workflows (ensure pnpm is standard):" && \
  { grep -RIn "cache: \"npm\"" .github/workflows/*.yml || true; } && \
  { grep -RIn "cache: 'npm'" .github/workflows/*.yml || true; } && \
  { grep -RIn "npm ci" .github/workflows/*.yml || true; } && \
  { grep -RIn "npm install" .github/workflows/*.yml || true; }
fi

# 3) package-lock.json (should not exist)
if git ls-files | grep -F "package-lock.json" >/dev/null 2>&1; then
  red "package-lock.json present — remove to enforce pnpm"
  fail=1
else
  green "No package-lock.json files"
fi

# 4) Top-level permissions blocks
need_perm=$(grep -L "^permissions:" .github/workflows/*.yml || true)
if [ -n "$need_perm" ]; then
  yellow "Workflows missing top-level permissions:\n$need_perm"
else
  green "All workflows declare top-level permissions"
fi

# 5) Golden pipeline guard presence
if ! grep -q -E "junitxml|anchore/sbom-action|slsa|k6|trivy|grype" .github/workflows/golden-ci-pipeline.yml 2>/dev/null; then
  yellow "golden-ci-pipeline.yml may be missing one or more guards (JUnit/SBOM/SLSA/k6/scan)"
else
  green "Golden pipeline includes key guards"
fi

# 6) Preview workflow exists
if [ -f .github/workflows/preview-env.yml ] || grep -q "pr-preview" .github/workflows/*.yml 2>/dev/null; then
  green "Preview workflow detected"
else
  yellow "No preview workflow detected"
fi

exit $fail
