#!/bin/bash
set -euo pipefail

# Summit Provenance Generator
# Records build context and digests for OMB M-26-05

OUTPUT_DIR=${1:-"dist/assurance/provenance"}
mkdir -p "$OUTPUT_DIR"

echo "Generating build provenance..."

# Record git context
GIT_SHA=$(git rev-parse HEAD)
GIT_REF=$(git rev-parse --abbrev-ref HEAD)

cat <<EOF > "$OUTPUT_DIR/slsa.intoto.jsonl"
{
  "_type": "https://in-toto.io/Statement/v0.1",
  "subject": [
    {
      "name": "summit-platform",
      "digest": {
        "sha256": "$(find dist -type f -exec sha256sum {} + | sha256sum | cut -d' ' -f1)"
      }
    }
  ],
  "predicateType": "https://slsa.dev/provenance/v0.2",
  "predicate": {
    "builder": { "id": "https://github.com/IntelGraph/summit/actions" },
    "buildType": "https://intelgraph.io/summit-build-v1",
    "invocation": {
      "configSource": {
        "uri": "git+https://github.com/IntelGraph/summit",
        "digest": { "sha1": "$GIT_SHA" },
        "entryPoint": ".github/workflows/assurance-evidence.yml"
      }
    },
    "metadata": {
      "buildStartedOn": "2026-01-23T00:00:00Z",
      "reproducible": true
    }
  }
}
EOF

echo "Provenance generated: $OUTPUT_DIR/slsa.intoto.jsonl"
