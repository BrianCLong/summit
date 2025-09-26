#!/bin/bash
set -euo pipefail

# IntelGraph v2.5.0 SBOM Generation & Attestation Script
# Generates CycloneDX SBOM and signs with Cosign

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
IMAGE_NAME="${IMAGE_NAME:-ghcr.io/brianlong/intelgraph/core}"
VERSION="${VERSION:-$(git describe --tags --always)}"
REGISTRY="${REGISTRY:-ghcr.io}"

echo "🔧 IntelGraph SBOM Generation & Attestation"
echo "Project: $PROJECT_ROOT"
echo "Image: $IMAGE_NAME:$VERSION"
echo "Registry: $REGISTRY"
echo ""

# Check dependencies
command -v npm >/dev/null 2>&1 || { echo "❌ npm is required but not installed"; exit 1; }
command -v docker >/dev/null 2>&1 || { echo "❌ docker is required but not installed"; exit 1; }
command -v cosign >/dev/null 2>&1 || { echo "❌ cosign is required but not installed"; exit 1; }

cd "$PROJECT_ROOT"

# Install CycloneDX CLI if not available
if ! command -v cyclonedx-npm >/dev/null 2>&1; then
  echo "📦 Installing CycloneDX npm plugin..."
  npm install -g @cyclonedx/cyclonedx-npm
fi

# Generate SBOM for main project
echo "📋 Generating SBOM for core platform..."
cyclonedx-npm \
  --output-format json \
  --output-file sbom-core.json \
  --include-dev false \
  --include-optional true

# Generate SBOM for prov-ledger service
if [ -d "prov-ledger-service" ]; then
  echo "📋 Generating SBOM for prov-ledger service..."
  cd prov-ledger-service
  cyclonedx-npm \
    --output-format json \
    --output-file ../sbom-prov-ledger.json \
    --include-dev false \
    --include-optional false
  cd ..
fi

# Generate SBOM for server
if [ -d "server" ]; then
  echo "📋 Generating SBOM for server..."
  cd server
  cyclonedx-npm \
    --output-format json \
    --output-file ../sbom-server.json \
    --include-dev false \
    --include-optional false
  cd ..
fi

# Validate SBOM files
echo "✅ Validating SBOM files..."
for sbom_file in sbom-*.json; do
  if [ -f "$sbom_file" ]; then
    echo "  • $sbom_file: $(jq -r '.metadata.component.name + " " + .metadata.component.version' "$sbom_file")"
    
    # Basic validation
    if ! jq -e '.bomFormat' "$sbom_file" >/dev/null; then
      echo "❌ Invalid SBOM format in $sbom_file"
      exit 1
    fi
  fi
done

# Build and push Docker image if not exists
echo "🐳 Building Docker image..."
docker build \
  --platform linux/amd64,linux/arm64 \
  --tag "$IMAGE_NAME:$VERSION" \
  --tag "$IMAGE_NAME:latest" \
  --build-arg BUILD_VERSION="$VERSION" \
  --build-arg BUILD_DATE="$(date -u +"%Y-%m-%dT%H:%M:%SZ")" \
  --build-arg VCS_REF="$(git rev-parse HEAD)" \
  --push .

# Get image digest
echo "🔍 Getting image digest..."
IMAGE_DIGEST=$(docker manifest inspect "$IMAGE_NAME:$VERSION" | jq -r '.config.digest')
IMAGE_REF="$IMAGE_NAME@$IMAGE_DIGEST"

echo "📝 Image reference: $IMAGE_REF"

# Sign container image with Cosign
if [ -n "${COSIGN_PRIVATE_KEY:-}" ]; then
  echo "🔐 Signing container image..."
  cosign sign --yes \
    --key env://COSIGN_PRIVATE_KEY \
    "$IMAGE_REF"
  
  echo "✅ Container image signed successfully"
else
  echo "⚠️  COSIGN_PRIVATE_KEY not set, skipping image signing"
fi

# Attest SBOM to container image
if [ -n "${COSIGN_PRIVATE_KEY:-}" ] && [ -f "sbom-core.json" ]; then
  echo "📋 Attesting SBOM to container image..."
  
  cosign attest --yes \
    --key env://COSIGN_PRIVATE_KEY \
    --predicate sbom-core.json \
    --type cyclonedx \
    "$IMAGE_REF"
  
  echo "✅ SBOM attestation completed"
else
  echo "⚠️  Skipping SBOM attestation (missing key or SBOM file)"
fi

# Generate attestation summary
echo "📊 Generating attestation summary..."
cat > attestation-summary.json <<EOF
{
  "image": "$IMAGE_REF",
  "version": "$VERSION",
  "timestamp": "$(date -u +"%Y-%m-%dT%H:%M:%SZ")",
  "git_commit": "$(git rev-parse HEAD)",
  "git_branch": "$(git rev-parse --abbrev-ref HEAD)",
  "sbom_files": [
    $(find . -name "sbom-*.json" -type f | jq -R . | paste -sd, -)
  ],
  "signed": $([ -n "${COSIGN_PRIVATE_KEY:-}" ] && echo "true" || echo "false"),
  "attested": $([ -n "${COSIGN_PRIVATE_KEY:-}" ] && [ -f "sbom-core.json" ] && echo "true" || echo "false")
}
EOF

echo "✅ Attestation summary created: attestation-summary.json"

# Verification commands for later use
echo ""
echo "🔍 Verification commands:"
echo "  • Verify signature: cosign verify --key cosign.pub $IMAGE_REF"
echo "  • Verify attestation: cosign verify-attestation --key cosign.pub --type cyclonedx $IMAGE_REF"
echo "  • Download SBOM: cosign download attestation --predicate-type cyclonedx $IMAGE_REF"

# Upload artifacts (if running in CI)
if [ -n "${CI:-}" ] && [ -n "${GITHUB_ACTIONS:-}" ]; then
  echo "📤 Uploading artifacts to GitHub Actions..."
  mkdir -p artifacts
  cp sbom-*.json attestation-summary.json artifacts/ 2>/dev/null || true
fi

echo ""
echo "🎉 SBOM generation and attestation completed successfully!"
echo "   Image: $IMAGE_REF"
echo "   SBOM files: $(ls sbom-*.json | wc -l)"
echo "   Signed: $([ -n "${COSIGN_PRIVATE_KEY:-}" ] && echo "Yes" || echo "No")"
echo "   Attested: $([ -n "${COSIGN_PRIVATE_KEY:-}" ] && [ -f "sbom-core.json" ] && echo "Yes" || echo "No")"