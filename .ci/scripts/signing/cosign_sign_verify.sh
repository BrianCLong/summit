#!/usr/bin/env bash
set -euo pipefail

ARTIFACT=""
SIG_OUT=""
CERT_OUT=""

usage() {
  cat <<'USAGE'
Usage: cosign_sign_verify.sh --artifact <path> [--signature <path>] [--certificate <path>]
Signs an artifact with cosign keyless mode and immediately verifies the signature.
USAGE
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --artifact)
      ARTIFACT="$2"; shift 2 ;;
    --signature)
      SIG_OUT="$2"; shift 2 ;;
    --certificate)
      CERT_OUT="$2"; shift 2 ;;
    -h|--help)
      usage; exit 0 ;;
    *)
      echo "Unknown argument: $1" >&2
      usage
      exit 1 ;;
  esac
done

if [[ -z "$ARTIFACT" ]]; then
  echo "--artifact is required" >&2
  usage
  exit 1
fi

SIG_OUT=${SIG_OUT:-"${ARTIFACT}.sig"}
CERT_OUT=${CERT_OUT:-"${ARTIFACT}.cert"}
mkdir -p "$(dirname "$SIG_OUT")" "$(dirname "$CERT_OUT")"

if ! command -v cosign >/dev/null 2>&1; then
  echo "Installing cosign..."
  curl -sSfL https://raw.githubusercontent.com/sigstore/cosign/main/install.sh | sudo COSIGN_EXPERIMENTAL=1 sh -s -- -b /usr/local/bin
fi

export COSIGN_EXPERIMENTAL=1

echo "Signing $ARTIFACT"
cosign sign-blob --yes --output-certificate "$CERT_OUT" --output-signature "$SIG_OUT" "$ARTIFACT"

echo "Verifying signature"
cosign verify-blob --certificate "$CERT_OUT" --signature "$SIG_OUT" "$ARTIFACT" >/dev/null

echo "Signature stored at $SIG_OUT with certificate $CERT_OUT"
