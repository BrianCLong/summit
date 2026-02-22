#!/bin/bash
set -euo pipefail

ARTIFACT="$1"
SIGNATURE="${2:-}"
CERTIFICATE="${3:-}"
IDENTITY="${4:-}"
ISSUER="${5:-}"

if [[ -z "$ARTIFACT" ]]; then
  echo "Error: Artifact path is required."
  exit 1
fi

CMD="cosign verify-blob"

if [[ -n "$SIGNATURE" ]]; then
  CMD="$CMD --signature $SIGNATURE"
fi

if [[ -n "$CERTIFICATE" ]]; then
  CMD="$CMD --certificate $CERTIFICATE"
fi

if [[ -n "$IDENTITY" ]]; then
  CMD="$CMD --certificate-identity $IDENTITY"
fi

if [[ -n "$ISSUER" ]]; then
  CMD="$CMD --certificate-oidc-issuer $ISSUER"
fi

CMD="$CMD $ARTIFACT"

echo "Running: $CMD"
$CMD
