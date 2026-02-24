#!/bin/bash
set -euo pipefail

# Summit Evidence Pack Builder
# Bundles SBOM, provenance, and vuln data into a verifiable TGZ

DIST_DIR="dist/assurance"
OUTPUT_FILE="$DIST_DIR/evidence-pack.tgz"
GIT_SHA=$(git rev-parse HEAD 2>/dev/null || echo "0000000000000000000000000000000000000000")

echo "Building evidence pack..."

# Ensure directories exist
mkdir -p "$DIST_DIR/sbom" "$DIST_DIR/provenance" "$DIST_DIR/vuln"

# 1. Generate SBOM
./scripts/assurance/generate_sbom.sh "$DIST_DIR/sbom"

# 2. Generate Provenance
./scripts/assurance/generate_provenance.sh "$DIST_DIR/provenance"

# 3. Collect Vulnerability Status
./scripts/assurance/collect_vuln_status.sh "$DIST_DIR/vuln"

# 4. Build Index
python3 scripts/assurance/index_builder.py "$DIST_DIR" "$GIT_SHA"

# 5. Create Tarball (deterministic)
tar --mtime='2026-01-23 00:00:00Z' --sort=name --owner=0 --group=0 --numeric-owner \
    -czf "$OUTPUT_FILE" -C "$DIST_DIR" \
    sbom/ provenance/ vuln/ index.json

echo "Evidence pack built at $OUTPUT_FILE"
