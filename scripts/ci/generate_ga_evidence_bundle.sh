#!/bin/bash
set -e

# GA Evidence Bundle Generator
# Runs SBOM and Provenance generation, then bundles deterministically.

echo "Generating SBOM..."
npm run generate:sbom

echo "Generating Provenance..."
npm run generate:provenance

# Verify output directory exists
if [ ! -d ".evidence" ]; then
  echo "Error: .evidence directory not found after generation."
  exit 1
fi

echo "Creating deterministic tarball..."
# --sort=name: ensure file order is stable
# --mtime='1970-01-01': remove timestamps
# --owner=0 --group=0 --numeric-owner: remove user/group info
# -n: gzip without timestamp
tar --sort=name --mtime='1970-01-01' --owner=0 --group=0 --numeric-owner -czf ga-evidence-bundle.tar.gz -C .evidence .

echo "Generated ga-evidence-bundle.tar.gz"
