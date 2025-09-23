#!/usr/bin/env bash
set -euo pipefail

# Summit Docker Build & Push Script
# Usage: ./scripts/build-push.sh [ECR_REGISTRY] [AWS_REGION]

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

# Configuration
ECR_REGISTRY=${1:-"123456789012.dkr.ecr.us-east-2.amazonaws.com"}
AWS_REGION=${2:-"us-east-2"}
IMAGE_NAME="summit"
TAG=${TAG:-$(git describe --tags --always)}
SHA_TAG=$(git rev-parse --short HEAD)

APP_IMAGE="$ECR_REGISTRY/$IMAGE_NAME:$TAG"
SHA_IMAGE="$ECR_REGISTRY/$IMAGE_NAME:$SHA_TAG"
LATEST_IMAGE="$ECR_REGISTRY/$IMAGE_NAME:latest"

echo "🏗️  Building Docker images..."
echo "   App Image: $APP_IMAGE"
echo "   SHA Image: $SHA_IMAGE"
echo "   Latest:    $LATEST_IMAGE"

cd "$PROJECT_ROOT"

# Build multi-platform image
docker buildx build \
  --platform linux/amd64,linux/arm64 \
  -f Dockerfile \
  -t "$APP_IMAGE" \
  -t "$SHA_IMAGE" \
  -t "$LATEST_IMAGE" \
  --push \
  .

echo "✅ Docker images built and pushed successfully"
echo "   🏷️  Tagged: $TAG"
echo "   📦 SHA: $SHA_TAG"

# Generate SBOM if docker scout is available
if docker scout --help >/dev/null 2>&1; then
  echo "📋 Generating SBOM..."
  docker scout sbom "$APP_IMAGE" --format spdx > "sbom-$TAG.json" || true
fi

echo "🎯 Ready for deployment!"