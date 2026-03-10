#!/usr/bin/env bash

# verify-cosign-bundle.sh
# Performs an explicit cross-check on a Cosign verification bundle to ensure the transparency
# log entry (Rekor) actually binds to the artifact's digest, signature, and expected public key.
# Addresses CVE-2026-22703 by manually confirming the Rekor entry's payload matches the artifact.

set -euo pipefail

usage() {
    echo "Usage: $0 --image <image-ref> --expected-oidc-issuer <issuer> --expected-identity <identity> --rekor-pub-key <path>"
    echo ""
    echo "Example: $0 --image ghcr.io/org/repo:tag --expected-oidc-issuer https://token.actions.githubusercontent.com --expected-identity 'https://github.com/org/repo/.github/workflows/main.yml@refs/heads/main' --rekor-pub-key rekor.pub"
    exit 1
}

IMAGE=""
EXPECTED_ISSUER=""
EXPECTED_IDENTITY=""
REKOR_PUB_KEY=""

while [[ $# -gt 0 ]]; do
    case "$1" in
        --image)
            IMAGE="$2"
            shift 2
            ;;
        --expected-oidc-issuer)
            EXPECTED_ISSUER="$2"
            shift 2
            ;;
        --expected-identity)
            EXPECTED_IDENTITY="$2"
            shift 2
            ;;
        --rekor-pub-key)
            REKOR_PUB_KEY="$2"
            shift 2
            ;;
        *)
            echo "Unknown argument: $1"
            usage
            ;;
    esac
done

if [[ -z "$IMAGE" || -z "$EXPECTED_ISSUER" || -z "$EXPECTED_IDENTITY" || -z "$REKOR_PUB_KEY" ]]; then
    echo "Error: Missing required arguments."
    usage
fi

echo "Verifying $IMAGE..."

if ! command -v cosign &> /dev/null; then
    echo "Error: cosign is not installed or not in PATH."
    exit 1
fi

if ! command -v jq &> /dev/null; then
    echo "Error: jq is required for JSON parsing."
    exit 1
fi

export SIGSTORE_REKOR_PUBLIC_KEY="$REKOR_PUB_KEY"

# Capture output
if ! VERIFY_OUTPUT=$(cosign verify --certificate-oidc-issuer "$EXPECTED_ISSUER" --certificate-identity "$EXPECTED_IDENTITY" "$IMAGE" 2>/dev/null); then
    echo "Error: Verification failed."
    exit 1
fi

if [[ -z "$VERIFY_OUTPUT" ]]; then
    echo "Error: Verification returned no output."
    exit 1
fi

echo "$VERIFY_OUTPUT" > verify-output.json

# Extract digest
IMAGE_DIGEST=$(jq -r '.[0].critical.image."docker-manifest-digest"' verify-output.json)

if [[ "$IMAGE_DIGEST" == "null" || -z "$IMAGE_DIGEST" ]]; then
    echo "Error: Could not extract image digest from cosign output."
    exit 1
fi

echo "Image digest: $IMAGE_DIGEST"

# Extract signature
EXPECTED_SIG=$(jq -r '.[0].base64Signature' verify-output.json)

if [[ "$EXPECTED_SIG" == "null" || -z "$EXPECTED_SIG" ]]; then
    echo "Error: Could not extract base64 signature from cosign output."
    exit 1
fi

# In cosign, verify output for Rekor contains bundle
REKOR_PAYLOAD_BODY=$(jq -r '.[0].optional.Bundle.Payload.body // .[0].optional.bundle.Payload.body // .[0].optional.RekorBundle.Payload.body' verify-output.json)

if [[ "$REKOR_PAYLOAD_BODY" == "null" || -z "$REKOR_PAYLOAD_BODY" ]]; then
    echo "Error: Could not find Rekor bundle payload in cosign output. Ensure transparency log was used."
    exit 1
fi

echo "$REKOR_PAYLOAD_BODY" | base64 -d > rekor-payload.json

# Check digest via jq
DIGEST_STR="${IMAGE_DIGEST#sha256:}"

# Use any to return a single boolean instead of multiple values. Drop -e so set -e doesn't crash us early.
HAS_DIGEST=$(jq -r --arg dig "$DIGEST_STR" '[.. | strings | select(contains($dig))] | length > 0' rekor-payload.json)

if [[ "$HAS_DIGEST" == "true" ]]; then
    echo "Success: Rekor entry payload contains the image digest string ($DIGEST_STR)."
else
    echo "Error: Rekor entry payload does NOT contain the image digest!"
    echo "Expected digest: $IMAGE_DIGEST"
    exit 1
fi

# Extract and Verify Signature in Rekor payload
HAS_SIG=$(jq -r --arg sig "$EXPECTED_SIG" '[.. | strings | select(contains($sig))] | length > 0' rekor-payload.json)

if [[ "$HAS_SIG" == "true" ]]; then
    echo "Success: Rekor entry payload contains the expected signature."
else
    echo "Error: Rekor entry payload does NOT contain the signature!"
    exit 1
fi

# Check Public Key / Cert in Rekor Payload
REKOR_PUB=$(jq -r '.. | .publicKey?.content? // empty' rekor-payload.json | head -n 1)

if [[ -n "$REKOR_PUB" && "$REKOR_PUB" != "null" ]]; then
     # For keyless, the public key content is typically the certificate.
     # We check if the expected OIDC issuer and identity are present in the cert or pubkey content.
     # Decode base64 if needed
     if ! echo "$REKOR_PUB" | base64 -d > decoded_pub.txt 2>/dev/null; then
         echo "$REKOR_PUB" > decoded_pub.txt
     fi

     if grep -q "$EXPECTED_ISSUER" decoded_pub.txt || grep -q "$EXPECTED_IDENTITY" decoded_pub.txt; then
         echo "Success: Rekor entry payload contains expected public key/certificate markers."
     else
         echo "Error: Rekor entry public key does not explicitly contain the exact issuer or identity strings. Failed expected public key binding!"
         rm -f decoded_pub.txt
         exit 1
     fi
     rm -f decoded_pub.txt
else
     echo "Error: Rekor entry payload is missing the public key / certificate entirely. Failed expected public key binding!"
     exit 1
fi

rm -f verify-output.json rekor-payload.json

echo "Explicit cross-check passed."
