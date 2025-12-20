#!/usr/bin/env bash
set -euo pipefail

SUBJECT=""
PREDICATE=""
ATTESTATION_TYPE="slsaprovenance"
BUNDLE_OUT=""

usage() {
  cat <<'USAGE'
Usage: attest_slsa.sh --subject <path> --predicate <path> [--type <type>] [--bundle <output>]
Creates a local SLSA-style attestation bundle for a subject using cosign attest-blob.
USAGE
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --subject)
      SUBJECT="$2"; shift 2 ;;
    --predicate)
      PREDICATE="$2"; shift 2 ;;
    --type)
      ATTESTATION_TYPE="$2"; shift 2 ;;
    --bundle)
      BUNDLE_OUT="$2"; shift 2 ;;
    -h|--help)
      usage; exit 0 ;;
    *)
      echo "Unknown argument: $1" >&2
      usage
      exit 1 ;;
  esac
done

if [[ -z "$SUBJECT" || -z "$PREDICATE" ]]; then
  echo "Both --subject and --predicate are required" >&2
  usage
  exit 1
fi

BUNDLE_OUT=${BUNDLE_OUT:-"${SUBJECT}.attestation.bundle"}
mkdir -p "$(dirname "$BUNDLE_OUT")"

if ! command -v cosign >/dev/null 2>&1; then
  echo "Installing cosign..."
  curl -sSfL https://raw.githubusercontent.com/sigstore/cosign/main/install.sh | sudo COSIGN_EXPERIMENTAL=1 sh -s -- -b /usr/local/bin
fi

export COSIGN_EXPERIMENTAL=1

echo "Creating attestation bundle for ${SUBJECT}"
cosign attest-blob \
  --yes \
  --predicate "$PREDICATE" \
  --type "$ATTESTATION_TYPE" \
  --bundle "$BUNDLE_OUT" \
  "$SUBJECT"

echo "Verifying attestation bundle"
cosign verify-blob --bundle "$BUNDLE_OUT" "$SUBJECT" >/dev/null

echo "Attestation stored at $BUNDLE_OUT"
