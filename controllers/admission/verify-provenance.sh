#!/usr/bin/env bash
set -euo pipefail

ARTIFACT_PATH=${1:?"Usage: $0 <artifact> <provenance>"}
PROVENANCE_PATH=${2:?"Usage: $0 <artifact> <provenance>"}

if ! command -v slsa-verifier >/dev/null; then
  echo "slsa-verifier binary is required" >&2
  exit 1
fi

slsa-verifier verify-artifact \
  --artifact-path "${ARTIFACT_PATH}" \
  --provenance-path "${PROVENANCE_PATH}" \
  --source-uri "https://github.com/summit/golden-path" \
  --source-tag-pattern "refs/tags/build-*"
