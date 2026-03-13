#!/bin/bash
set -eo pipefail

ARTIFACT_PATH="$1"
PROVENANCE_PATH="$2"

if [ -z "$ARTIFACT_PATH" ] || [ -z "$PROVENANCE_PATH" ]; then
    echo "Usage: ./scripts/verify-provenance.sh <artifact_path> <provenance_path>"
    exit 1
fi

echo "Downloading slsa-verifier..."
curl -sL https://github.com/slsa-framework/slsa-verifier/releases/download/v2.4.1/slsa-verifier-linux-amd64 -o slsa-verifier
chmod +x slsa-verifier

echo "Verifying provenance..."
./slsa-verifier verify-artifact "$ARTIFACT_PATH" \
  --provenance-path "$PROVENANCE_PATH" \
  --source-uri "github.com/$GITHUB_REPOSITORY"
