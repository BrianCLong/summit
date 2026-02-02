#!/bin/bash
set -euo pipefail

# IntelGraph v2.5.0 SBOM Generation & Attestation Script
# Generates SPDX and CycloneDX SBOMs and signs with Cosign

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
REGISTRY="${REGISTRY:-ghcr.io}"
VERSION="${VERSION:-$(git describe --tags --always 2>/dev/null || echo "latest")}"
COMPONENT="${1:-all}" # all, server, web

echo "🔧 IntelGraph SBOM Generation & Attestation"
echo "Project: $PROJECT_ROOT"
echo "Registry: $REGISTRY"
echo "Component: $COMPONENT"
echo ""

# Check dependencies
command -v docker >/dev/null 2>&1 || { echo "❌ docker is required but not installed"; exit 1; }
# command -v cosign >/dev/null 2>&1 || { echo "❌ cosign is required but not installed"; exit 1; }

cd "$PROJECT_ROOT"

# Check for Syft (preferred)
HAS_SYFT=false
if command -v syft >/dev/null 2>&1; then
    HAS_SYFT=true
else
    echo "⚠️ Syft not found, SBOM generation might be limited."
fi

build_and_attest() {
    local NAME=$1
    local CONTEXT=$2
    local DOCKERFILE=$3
    local IMAGE_NAME="$REGISTRY/$NAME"

    echo "---------------------------------------------------"
    echo "🏗️  Processing $NAME..."
    echo "   Context: $CONTEXT"
    echo "   Dockerfile: $DOCKERFILE"

    echo "🐳 Building Docker image..."
    docker build \
      --tag "$IMAGE_NAME:$VERSION" \
      --tag "$IMAGE_NAME:latest" \
      --file "$DOCKERFILE" \
      "$CONTEXT" || { echo "❌ Build failed for $NAME"; return 1; }

    # Get image digest
    local IMAGE_DIGEST=$(docker inspect --format='{{index .RepoDigests 0}}' "$IMAGE_NAME:$VERSION" 2>/dev/null || echo "")
    if [ -z "$IMAGE_DIGEST" ]; then
        IMAGE_DIGEST=$(docker inspect --format='{{.Id}}' "$IMAGE_NAME:$VERSION" 2>/dev/null || echo "")
    fi
    local IMAGE_REF="$IMAGE_NAME@$IMAGE_DIGEST"
    if [[ "$IMAGE_DIGEST" != *sha256* ]]; then
        IMAGE_REF="$IMAGE_NAME:$VERSION"
    fi

    echo "📝 Image reference: $IMAGE_REF"

    # Generate SBOM
    if [ "$HAS_SYFT" = true ]; then
        echo "📋 Generating SBOM..."
        syft "$IMAGE_REF" -o spdx-json=sbom-$NAME.spdx.json
        syft "$IMAGE_REF" -o cyclonedx-json=sbom-$NAME.cdx.json
        echo "✅ SBOM generated: sbom-$NAME.spdx.json, sbom-$NAME.cdx.json"
    fi

    # Sign & Attest (if key present)
    if [ -n "${COSIGN_PRIVATE_KEY:-}" ] && command -v cosign >/dev/null 2>&1; then
        echo "🔐 Signing container image..."
        cosign sign --yes --key env://COSIGN_PRIVATE_KEY "$IMAGE_REF"

        if [ -f "sbom-$NAME.cdx.json" ]; then
            echo "📋 Attesting SBOM (CycloneDX)..."
            cosign attest --yes --key env://COSIGN_PRIVATE_KEY --predicate sbom-$NAME.cdx.json --type cyclonedx "$IMAGE_REF"
        elif [ -f "sbom-$NAME.spdx.json" ]; then
            echo "📋 Attesting SBOM (SPDX)..."
            cosign attest --yes --key env://COSIGN_PRIVATE_KEY --predicate sbom-$NAME.spdx.json --type spdx "$IMAGE_REF"
        fi
        echo "✅ Signed and Attested $NAME"
    else
        echo "⚠️  Skipping signing (COSIGN_PRIVATE_KEY not set or cosign missing)"
    fi
}

if [ "$COMPONENT" == "all" ] || [ "$COMPONENT" == "server" ]; then
    build_and_attest "intelgraph-server" "./server" "./server/Dockerfile"
fi

if [ "$COMPONENT" == "all" ] || [ "$COMPONENT" == "web" ]; then
    build_and_attest "intelgraph-web" "./apps/web" "./apps/web/Dockerfile"
fi

echo ""
echo "🎉 SBOM generation process completed!"
