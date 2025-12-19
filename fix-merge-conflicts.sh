#!/bin/bash
# Script to fix merge conflicts in GitHub workflow files by accepting main version

set -e

FILES=(
  ".github/workflows/reusable/sbom.yml"
  ".github/workflows/reusable/sast_sca.yml"
  ".github/workflows/reusable/preview_deploy.yml"
  ".github/workflows/reusable/policy_opa.yml"
  ".github/workflows/reusable/package.yml"
  ".github/workflows/reusable/migrations_gate.yml"
  ".github/workflows/reusable/iac_plan.yml"
  ".github/workflows/reusable/e2e.yml"
  ".github/workflows/reusable/contract.yml"
  ".github/workflows/slsa-l3-airgap-build.yml"
  ".github/workflows/slsa-l3-provenance.yml"
)

for file in "${FILES[@]}"; do
  if [ -f "$file" ]; then
    echo "Resolving conflicts in $file..."
    # Use git show to get the main version
    git show main:"$file" > "$file.tmp" 2>/dev/null && mv "$file.tmp" "$file" && echo "  ✓ Fixed: $file"
  else
    echo "  ⚠ Skipped: $file (not found)"
  fi
done

echo "All merge conflicts resolved!"
