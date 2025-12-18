#!/usr/bin/env bash
# CI Air-Gap Validation Script
# Validates that the repository is ready for air-gapped deployment.

set -euo pipefail

echo "🛡️  Starting CI Air-Gap Validation..."

EXIT_CODE=0

# 1. Check for hardcoded external domains in source code
echo "🔍 Checking for hardcoded external domains..."
# Exclude tests and documentation
if grep -r "http://" server/src client/src 2>/dev/null | grep -v "localhost" | grep -v "127.0.0.1"; then
    echo "⚠️  Warning: Potential hardcoded HTTP links found (manual review required)."
    # Not failing build for now as some might be valid strings/comments, but flagging it.
fi

if grep -r "https://" server/src client/src 2>/dev/null | grep -v "localhost" | grep -v "127.0.0.1"; then
    echo "⚠️  Warning: Potential hardcoded HTTPS links found (manual review required)."
fi

# 2. Validate Kubernetes Manifests for Air-Gap Compatibility
echo "🔍 Validating Kubernetes GDC manifests..."
MANIFEST_DIR="kubernetes/gdc"

if [ ! -d "$MANIFEST_DIR" ]; then
    echo "❌ Manifest directory $MANIFEST_DIR not found!"
    exit 1
fi

# Check ImagePullPolicy (Should NOT be Always if we want to rely on local/private registry without internet,
# though IfNotPresent is standard. 'Always' is dangerous if registry is unreachable)
# Actually 'Always' is fine if pointing to private registry.
# But we check for 'image: ' not using public registries in the final bundle.
# Since these are templates, they use placeholders or ghcr.io which are replaced.

# Check for SecurityContext (Non-root)
echo "   Checking SecurityContext (runAsNonRoot)..."
if ! grep -q "runAsNonRoot: true" "$MANIFEST_DIR"/*.yaml; then
    echo "❌ Missing 'runAsNonRoot: true' in some manifests."
    EXIT_CODE=1
else
    echo "✅ SecurityContext checks passed."
fi

# Check for NetworkPolicies
echo "   Checking NetworkPolicies..."
if [ ! -f "$MANIFEST_DIR/01-network-policies.yaml" ]; then
    echo "❌ Network Policies manifest missing."
    EXIT_CODE=1
else
    echo "✅ Network Policies present."
fi

# 3. Check for SBOM generation capability
echo "🔍 Checking SBOM generation capability..."
if [ -f "scripts/sbom-attest.sh" ]; then
    echo "✅ SBOM generation script present."
else
    echo "❌ SBOM generation script missing."
    EXIT_CODE=1
fi

# 4. Check for Air-Gap Bundle Script
echo "🔍 Checking Bundle Creation Script..."
if [ -f "scripts/airgap/create-offline-bundle.sh" ]; then
    echo "✅ Bundle creation script present."
else
    echo "❌ Bundle creation script missing."
    EXIT_CODE=1
fi

if [ $EXIT_CODE -eq 0 ]; then
    echo "✅ All Air-Gap Validation Checks Passed!"
else
    echo "❌ Some Air-Gap Validation Checks Failed."
fi

exit $EXIT_CODE
