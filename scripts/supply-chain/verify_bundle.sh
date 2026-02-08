#!/bin/bash
set -e
ARTIFACT="$1"
BUNDLE="$2"
KEY="$3"
if [ -z "$ARTIFACT" ] || [ -z "$BUNDLE" ]; then
  echo "Usage: $0 <artifact> <bundle> [key]"
  exit 1
fi
if ! command -v cosign &> /dev/null; then
  echo "Error: cosign is not installed."
  exit 1
fi
echo "Verifying $ARTIFACT with bundle $BUNDLE..."
if [ -n "$KEY" ]; then
  cosign verify-blob --key "$KEY" --bundle "$BUNDLE" "$ARTIFACT"
else
  if [ -z "$CERTIFICATE_IDENTITY" ] || [ -z "$CERTIFICATE_OIDC_ISSUER" ]; then
    echo "Error: CERTIFICATE_IDENTITY/ISSUER required."
    exit 1
  fi
  cosign verify-blob --bundle "$BUNDLE" --certificate-identity "$CERTIFICATE_IDENTITY" --certificate-oidc-issuer "$CERTIFICATE_OIDC_ISSUER" "$ARTIFACT"
fi
echo "Verification successful!"