#!/usr/bin/env bash
set -euo pipefail

if ! command -v cosign >/dev/null 2>&1; then
  echo "cosign is required" >&2
  exit 1
fi

POLICY_FILE="controllers/admission/disclosure-bundle-policy.yaml"
if [[ ! -f "${POLICY_FILE}" ]]; then
  echo "policy file ${POLICY_FILE} missing" >&2
  exit 1
fi

grep -q "cosign.sigstore.dev/verified" "${POLICY_FILE}" || {
  echo "cosign verification label not enforced" >&2
  exit 1
}

grep -q "disclosures.intelgraph.com/bundle-sha256" "${POLICY_FILE}" || {
  echo "bundle digest annotation requirement missing" >&2
  exit 1
}

echo "✅ disclosure bundle cosign policy verified"
