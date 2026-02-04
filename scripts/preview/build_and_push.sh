#!/bin/bash
set -euo pipefail

# PR Preview Build & Push Script
# Usage: ./scripts/preview/build_and_push.sh <PR_NUMBER>

PR_NUMBER=${1:?PR number is required}
REGISTRY=${REGISTRY:-"ghcr.io/brianclong/summit"}
IMAGE_NAME="summit"
TAG="pr-${PR_NUMBER}"

echo "🏗️  Building Docker image for PR #$PR_NUMBER..."
echo "   Image: $REGISTRY/$IMAGE_NAME:$TAG"

# Build multi-platform image (linux/amd64 for most clusters)
docker buildx build \
  --platform linux/amd64 \
  -f Dockerfile \
  -t "$REGISTRY/$IMAGE_NAME:$TAG" \
  --push \
  .

echo "✅ Docker image built and pushed successfully"
echo "   🏷️  Tagged: $TAG"