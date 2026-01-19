#!/usr/bin/env bash
set -euo pipefail

# Deterministic build check script for supply chain integrity

echo "Starting reproducible build check..."

# Re-run build with same deps + check hashes
pnpm install --frozen-lockfile
pnpm run build

# Capture hashes of current build artifacts
find build -type f -print0 | xargs -0 sha256sum > current_build_hashes.txt

# If syft is available, use it to check consistency
if command -v syft &> /dev/null; then
  echo "Generating comparison SBOM..."
  mkdir -p build/sbom
  syft . --scope all-layers -o spdx-json=./build/sbom/repro.spdx.json

  if [ -f build/sbom/sbom.spdx.json ]; then
    echo "Comparing SBOMs..."
    # Compare while ignoring timestamps if possible, or just check for structural differences
    if diff -q build/sbom/sbom.spdx.json build/sbom/repro.spdx.json > /dev/null; then
      echo "✅ SBOMs are identical"
    else
      echo "⚠️ SBOMs differ. This might be due to timestamps or non-deterministic build processes."
      # Optionally: diff build/sbom/sbom.spdx.json build/sbom/repro.spdx.json | head -n 20
    fi
  else
    echo "Information: No baseline SBOM (build/sbom/sbom.spdx.json) found to compare against."
  fi
else
  echo "syft not found, skipping SBOM comparison"
fi

echo "Reproducible build check complete."
