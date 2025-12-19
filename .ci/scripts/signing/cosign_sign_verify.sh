#!/usr/bin/env bash
set -euo pipefail

usage() {
  echo "Usage: $0 <artifact> <signature_prefix>" >&2
  exit 1
}

if [[ $# -lt 2 ]]; then
  usage
fi

ARTIFACT=$1
PREFIX=$2
SIG_FILE="${PREFIX}.sig"
CERT_FILE="${PREFIX}.cert"

if ! command -v cosign >/dev/null 2>&1; then
  echo "cosign is required on PATH" >&2
  exit 1
fi

if [[ ! -f cosign.key ]]; then
  echo "cosign.key not found; generate one with 'cosign generate-key-pair'" >&2
  exit 1
fi

echo "Signing ${ARTIFACT} with cosign" >&2
COSIGN_EXPERIMENTAL=1 cosign sign-blob --yes --tlog-upload=true --key cosign.key --output-signature "${SIG_FILE}" --output-certificate "${CERT_FILE}" "${ARTIFACT}"

echo "Verifying signature for ${ARTIFACT}" >&2
COSIGN_EXPERIMENTAL=1 cosign verify-blob --key cosign.pub --signature "${SIG_FILE}" --certificate "${CERT_FILE}" "${ARTIFACT}"

echo "Signature and verification completed for ${ARTIFACT}" >&2
