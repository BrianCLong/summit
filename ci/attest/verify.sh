#!/usr/bin/env bash
set -euo pipefail

# Deny-by-default when SUMMIT_ATTESTATION_REQUIRED=1
: "${SUMMIT_ATTESTATION_REQUIRED:=0}"

ARTIFACT_REF="${1:-}"
if [[ "${SUMMIT_ATTESTATION_REQUIRED}" != "1" ]]; then
  echo "attestation: SKIP (SUMMIT_ATTESTATION_REQUIRED=0)"
  exit 0
fi

if [[ -z "${ARTIFACT_REF}" ]]; then
  echo "attestation: FAIL missing ARTIFACT_REF"
  exit 2
fi

echo "TODO: install cosign in CI and verify signatures/attestations for ${ARTIFACT_REF}"
echo "FAIL-CLOSED until wired."
exit 3
