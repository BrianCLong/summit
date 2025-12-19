#!/usr/bin/env bash
set -euo pipefail

usage() {
  echo "Usage: $0 <artifact> <predicate> <attestation_output_prefix>" >&2
  exit 1
}

if [[ $# -lt 3 ]]; then
  usage
fi

ARTIFACT=$1
PREDICATE=$2
OUTPUT_PREFIX=$3
ATTESTATION_PAYLOAD="${OUTPUT_PREFIX}.json"

if ! command -v cosign >/dev/null 2>&1; then
  echo "cosign is required on PATH" >&2
  exit 1
fi

if [[ ! -f "$PREDICATE" ]]; then
  echo "Predicate file $PREDICATE missing" >&2
  exit 1
fi

cat > "$ATTESTATION_PAYLOAD" <<EOF2
{
  "predicateType": "https://slsa.dev/provenance/v1",
  "subject": [
    {
      "name": "${ARTIFACT}",
      "digest": {
        "sha256": "$(sha256sum "${ARTIFACT}" | awk '{print $1}')"
      }
    }
  ],
  "predicate": $(cat "$PREDICATE")
}
EOF2

echo "Signing attestation payload for ${ARTIFACT}" >&2
COSIGN_EXPERIMENTAL=1 cosign sign-blob --yes --tlog-upload=true --key cosign.key --output-signature "${OUTPUT_PREFIX}.sig" --output-certificate "${OUTPUT_PREFIX}.cert" "${ATTESTATION_PAYLOAD}"

echo "Attestation generated: ${ATTESTATION_PAYLOAD}" >&2
