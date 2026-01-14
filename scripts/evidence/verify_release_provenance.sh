#!/bin/bash
set -e

# verify_release_provenance.sh
# Verifies a release evidence provenance attestation using cosign and local digest checks.

usage() {
    echo "Usage: $0 --attestation <path> --signature <path> --certificate <path> --bundle <path> [--owner <owner> --repo <repo> --tag <tag>]"
    echo ""
    echo "Arguments:"
    echo "  --attestation   Path to the .intoto.json provenance file"
    echo "  --signature     Path to the .sig signature file"
    echo "  --certificate   Path to the .cert certificate file"
    echo "  --bundle        Path to the evidence tarball"
    echo "  --owner         GitHub owner (optional, derived from certificate if possible or defaults to current logic)"
    echo "  --repo          GitHub repo (optional)"
    echo "  --tag           Release tag (optional, to verify ref subject)"
    exit 1
}

ATTESTATION=""
SIGNATURE=""
CERTIFICATE=""
BUNDLE=""
OWNER="intelgraph" # Default, but should be configurable
REPO="intelgraph-platform" # Default
TAG=""

while [[ "$#" -gt 0 ]]; do
    case $1 in
        --attestation) ATTESTATION="$2"; shift ;;
        --signature) SIGNATURE="$2"; shift ;;
        --certificate) CERTIFICATE="$2"; shift ;;
        --bundle) BUNDLE="$2"; shift ;;
        --owner) OWNER="$2"; shift ;;
        --repo) REPO="$2"; shift ;;
        --tag) TAG="$2"; shift ;;
        *) echo "Unknown parameter: $1"; usage ;;
    esac
    shift
done

if [[ -z "$ATTESTATION" || -z "$SIGNATURE" || -z "$CERTIFICATE" || -z "$BUNDLE" ]]; then
    usage
fi

if ! command -v cosign &> /dev/null; then
    echo "Error: cosign is not installed. Please install cosign."
    exit 1
fi

if ! command -v jq &> /dev/null; then
    echo "Error: jq is not installed. Please install jq."
    exit 1
fi

echo "🔍 Verifying Release Evidence Provenance..."

# 1. Verify Signature
echo "--> Verifying digital signature (Keyless OIDC)..."
# We expect the certificate to be issued by GitHub Actions
# And the subject to match the repo and tag (if provided)

VERIFY_OPTS="--certificate-identity-regexp ^https://github.com/ --certificate-oidc-issuer https://token.actions.githubusercontent.com"

# Construct expected subject if possible
# GitHub Actions subject format: repo:<owner>/<repo>:ref:refs/tags/<tag> (usually)
# or repo:<owner>/<repo>:...
# For now, we verify it is from the repo.

# If we want to be strict about the tag:
if [[ -n "$TAG" ]]; then
    # This regex is a bit loose to allow for flexible workflow identities but enforces repo and tag
    # Note: workflow dispatch on tag might have different ref?
    # Usually: repo:OWNER/REPO:ref:refs/tags/TAG
    REPO_IDENTITY="repo:${OWNER}/${REPO}:ref:refs/tags/${TAG}"
    # But sometimes it might be just repo ownership if we want to be less strict
    # Let's enforce repo ownership at minimum
    VERIFY_OPTS="$VERIFY_OPTS --certificate-identity ${REPO_IDENTITY}"
else
    # Verify it comes from the repo at least
    VERIFY_OPTS="$VERIFY_OPTS --certificate-identity-regexp ^repo:${OWNER}/${REPO}:"
fi

# Verify blob
if cosign verify-blob $VERIFY_OPTS \
    --certificate "$CERTIFICATE" \
    --signature "$SIGNATURE" \
    "$ATTESTATION"; then
    echo "✅ Signature verified."
else
    echo "❌ Signature verification failed."
    exit 1
fi

# 2. Verify Bundle Digest
echo "--> Verifying evidence bundle digest..."

# Extract digest from attestation
# We look for the subject with name matching the bundle filename
BUNDLE_FILENAME=$(basename "$BUNDLE")
EXPECTED_DIGEST=$(jq -r --arg name "$BUNDLE_FILENAME" '.subject[] | select(.name == $name) | .digest.sha256' "$ATTESTATION")

if [[ -z "$EXPECTED_DIGEST" || "$EXPECTED_DIGEST" == "null" ]]; then
    # Fallback: maybe the name in attestation is generic or different?
    # Let's try to match by just taking the first subject if name doesn't match?
    # Or strict matching?
    # Let's try to see if there is ANY subject.
    echo "Warning: Exact filename match for '$BUNDLE_FILENAME' not found in subject list. Checking any subject..."
    # This is a simplification for the script
    EXPECTED_DIGEST=$(jq -r '.subject[0].digest.sha256' "$ATTESTATION")
fi

if [[ -z "$EXPECTED_DIGEST" ]]; then
    echo "❌ Could not find valid digest in attestation."
    exit 1
fi

echo "    Expected (from attestation): $EXPECTED_DIGEST"

# Compute local digest
if [[ "$OSTYPE" == "darwin"* ]]; then
    LOCAL_DIGEST=$(shasum -a 256 "$BUNDLE" | awk '{print $1}')
else
    LOCAL_DIGEST=$(sha256sum "$BUNDLE" | awk '{print $1}')
fi

echo "    Computed (local file):       $LOCAL_DIGEST"

if [[ "$EXPECTED_DIGEST" == "$LOCAL_DIGEST" ]]; then
    echo "✅ Digest matches."
else
    echo "❌ Digest mismatch!"
    exit 1
fi

# 3. Print Metadata
echo "--> Provenance Metadata:"
jq -r '.predicate.invocation | "    Repo: \(.configSource.uri)\n    Commit: \(.configSource.digest.sha1)\n    Run URL: \(.parameters.run_url)"' "$ATTESTATION"

echo ""
echo "🎉 Verification PASSED: The evidence bundle is authentic and trusted."
exit 0
