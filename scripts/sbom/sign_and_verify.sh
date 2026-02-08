#!/bin/bash
set -e

SBOM_FILE=${1:-"sbom.json"}
MANIFEST_FILE=${2:-"sbom.manifest.json"}

if ! command -v cosign &> /dev/null; then
    echo "cosign not found. Please install it."
    # Fail
    false
fi

echo "Signing and Verifying artifacts..."

# Check if we are in a context where we can sign (CI with OIDC)
if [[ -n "$GITHUB_ACTIONS" ]]; then
    echo "Signing $SBOM_FILE..."
    cosign sign-blob "$SBOM_FILE" --bundle sbom.bundle.json --yes

    echo "Signing $MANIFEST_FILE..."
    cosign sign-blob "$MANIFEST_FILE" --bundle manifest.bundle.json --yes

    echo "Verifying $SBOM_FILE..."
    # Loose verification for self-signed in CI
    cosign verify-blob "$SBOM_FILE" --bundle sbom.bundle.json \
        --certificate-oidc-issuer "https://token.actions.githubusercontent.com" \
        --certificate-identity-regexp ".*"

    echo "Verifying $MANIFEST_FILE..."
    cosign verify-blob "$MANIFEST_FILE" --bundle manifest.bundle.json \
        --certificate-oidc-issuer "https://token.actions.githubusercontent.com" \
        --certificate-identity-regexp ".*"

    echo "Verification Successful."
else
    echo "Not in GitHub Actions, skipping keyless signing."
fi
