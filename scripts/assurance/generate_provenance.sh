#!/bin/bash
set -euo pipefail

# Summit Provenance Generator
# Records build artifacts and their digests in a deterministic format

OUTPUT_DIR=${1:-"dist/assurance/provenance"}
mkdir -p "$OUTPUT_DIR"

SBOM_FILE="dist/assurance/sbom/summit.spdx.json"
DIGEST_FILE="$OUTPUT_DIR/digests.json"
PROVENANCE_FILE="$OUTPUT_DIR/slsa.intoto.jsonl"

echo "Generating provenance..."

if [ ! -f "$SBOM_FILE" ]; then
  echo "Error: SBOM file not found at $SBOM_FILE. Run generate_sbom.sh first."
  exit 1
fi

# Calculate digests
SBOM_SHA=$(sha256sum "$SBOM_FILE" | awk '{print $1}')

# Create digests.json (deterministic)
cat <<EOF > "$DIGEST_FILE"
{
  "artifacts": [
    {
      "name": "summit.spdx.json",
      "sha256": "$SBOM_SHA"
    }
  ]
}
EOF

# Create SLSA-ish in-toto statement
# Note: In a real CI, we'd use OIDC tokens and actual build metadata.
# Here we use deterministic values.
BUILD_DATE="2026-01-23T00:00:00Z"

cat <<EOF > "$PROVENANCE_FILE"
{
  "_type": "https://in-toto.io/Statement/v0.1",
  "subject": [
    {
      "name": "summit.spdx.json",
      "digest": {
        "sha256": "$SBOM_SHA"
      }
    }
  ],
  "predicateType": "https://slsa.dev/provenance/v0.2",
  "predicate": {
    "builder": { "id": "https://github.com/intelgraph/summit/.github/workflows/assurance-sbom.yml" },
    "buildType": "https://intelgraph.io/build/v1",
    "invocation": {
      "configSource": {
        "uri": "git+https://github.com/intelgraph/summit",
        "digest": { "sha1": "0000000000000000000000000000000000000000" },
        "entryPoint": "assurance-sbom.yml"
      }
    },
    "metadata": {
      "buildFinishedOn": "$BUILD_DATE",
      "completeness": { "parameters": true, "environment": false, "materials": false },
      "reproducible": true
    }
  }
}
EOF

echo "Provenance generated at $OUTPUT_DIR"
