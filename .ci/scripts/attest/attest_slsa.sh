#!/usr/bin/env bash
set -euo pipefail

usage() {
  echo "Usage: $0 <artifact_path> <subject_name> <output_path>" >&2
  exit 1
}

if [[ $# -lt 3 ]]; then
  usage
fi

ARTIFACT_PATH="$1"
SUBJECT_NAME="$2"
OUTPUT_PATH="$3"

mkdir -p "$(dirname "${OUTPUT_PATH}")"

if ! command -v in-toto-run >/dev/null 2>&1 && ! command -v intoto-run >/dev/null 2>&1; then
  echo "in-toto is required for attestations" >&2
  exit 1
fi

RUNNER_BIN="$(command -v in-toto-run || command -v intoto-run)"

HASH=$(sha256sum "${ARTIFACT_PATH}" | awk '{print $1}')

cat > "${OUTPUT_PATH}" <<JSON
{"_type":"https://in-toto.io/Statement/v1","predicateType":"https://slsa.dev/provenance/v1","subject":[{"name":"${SUBJECT_NAME}","digest":{"sha256":"${HASH}"}}],"predicate":{"buildDefinition":{"buildType":"https://slsa.dev/container/build","externalParameters":{"os":"linux"},"resolvedDependencies":[]},"runDetails":{"builder":{"id":"https://github.com/${GITHUB_REPOSITORY}"},"metadata":{"invocationId":"${GITHUB_RUN_ID:-manual}"}}}}
JSON

echo "[attest] provenance written to ${OUTPUT_PATH}" >&2
