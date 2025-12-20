#!/usr/bin/env bash
set -euo pipefail

usage() {
  echo "Usage: $0 <image> <attestation>" >&2
  exit 1
}

if [[ $# -lt 2 ]]; then
  usage
fi

IMAGE="$1"
ATTESTATION="$2"

if ! command -v cosign >/dev/null 2>&1; then
  echo "cosign is required" >&2
  exit 1
fi

echo "[sign] signing ${IMAGE}" >&2
COSIGN_EXPERIMENTAL=1 cosign sign "${IMAGE}"

echo "[sign] attaching attestation" >&2
COSIGN_EXPERIMENTAL=1 cosign attest --predicate "${ATTESTATION}" --type slsaprovenance "${IMAGE}"

PINNED=$(cosign verify --output json "${IMAGE}" | jq -r '.[0].critical.image["docker-manifest-digest"]')
PINNED_IMAGE="${IMAGE%@*}@${PINNED}"

echo "pinned=${PINNED_IMAGE}" >> "$GITHUB_OUTPUT"
echo "digest=${PINNED}" >> "$GITHUB_OUTPUT"

echo "[verify] verifying signatures and attestations for ${PINNED_IMAGE}" >&2
COSIGN_EXPERIMENTAL=1 cosign verify "${PINNED_IMAGE}"
COSIGN_EXPERIMENTAL=1 cosign verify-attestation --type slsaprovenance "${PINNED_IMAGE}"
COSIGN_EXPERIMENTAL=1 cosign verify-attestation --type spdx "${PINNED_IMAGE}" || true
