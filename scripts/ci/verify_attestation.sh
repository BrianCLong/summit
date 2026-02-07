#!/usr/bin/env bash
set -euo pipefail

if [[ -z "${COSIGN_SUBJECT:-}" ]]; then
  echo "COSIGN_SUBJECT is required." >&2
  exit 1
fi

if [[ -z "${ATTESTATION_BUNDLE:-}" ]]; then
  echo "ATTESTATION_BUNDLE is required." >&2
  exit 1
fi

if [[ -z "${OIDC_ISSUER:-}" ]]; then
  echo "OIDC_ISSUER is required." >&2
  exit 1
fi

if [[ -z "${CERT_ID_REGEX:-}" ]]; then
  echo "CERT_ID_REGEX is required." >&2
  exit 1
fi

PREDICATE_TYPE="${PREDICATE_TYPE:-spdx}"
OUTPUT_PATH="${VERIFICATION_OUTPUT:-attestation.verify.json}"

cosign verify-attestation \
  --type "${PREDICATE_TYPE}" \
  --certificate-identity-regexp "${CERT_ID_REGEX}" \
  --certificate-oidc-issuer "${OIDC_ISSUER}" \
  --bundle "${ATTESTATION_BUNDLE}" \
  "${COSIGN_SUBJECT}" > "${OUTPUT_PATH}"

echo "Attestation verification output written to ${OUTPUT_PATH}"
