#!/usr/bin/env bash
set -euo pipefail

ARTIFACT=${1:?"Artifact to attest is required"}
SERVICE_NAME=${2:-workspace}
OUTPUT_DIR=${3:-artifacts/attestations}
SHA=${GITHUB_SHA:-$(git rev-parse --short HEAD)}

mkdir -p "${OUTPUT_DIR}"
ATTEST_PATH="${OUTPUT_DIR}/${SERVICE_NAME}-${SHA}.slsa.json"
DIGEST=$(sha256sum "${ARTIFACT}" | awk '{print $1}')

cat > "${ATTEST_PATH}" <<JSON
{
  "_type": "https://in-toto.io/Statement/v0.1",
  "subject": [
    {
      "name": "${SERVICE_NAME}",
      "digest": {
        "sha256": "${DIGEST}"
      }
    }
  ],
  "predicateType": "https://slsa.dev/provenance/v1",
  "predicate": {
    "buildType": "https://github.com/slsa-framework/slsa-github-generator",
    "builder": {
      "id": "https://github.com/${GITHUB_REPOSITORY:-unknown}"
    },
    "buildConfig": {
      "artifact": "${ARTIFACT}",
      "commit": "${GITHUB_SHA:-unknown}",
      "runner": "github-actions"
    },
    "metadata": {
      "invocationId": "${GITHUB_RUN_ID:-local}",
      "startedOn": "$(date -u +"%Y-%m-%dT%H:%M:%SZ")"
    }
  }
}
JSON

if [ -n "${GITHUB_OUTPUT:-}" ]; then
  echo "attestation=${ATTEST_PATH}" >> "${GITHUB_OUTPUT}"
fi

echo "${ATTEST_PATH}"
