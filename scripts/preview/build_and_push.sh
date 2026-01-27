#!/bin/bash
set -euo pipefail

PR_NUMBER=${1:-}

if [ -z "$PR_NUMBER" ]; then
  echo "❌ Error: PR number required"
    echo "Usage: $0 <pr_number>"
      exit 1
      fi

      echo "🐳 Building and pushing Docker images for PR #$PR_NUMBER..."

      # Set image tag
      IMAGE_TAG="pr-${PR_NUMBER}-$(git rev-parse --short HEAD)"
      REGISTRY="${REGISTRY:-ghcr.io}"
      IMAGE_NAME="${REGISTRY}/${GITHUB_REPOSITORY,,}:${IMAGE_TAG}"

      echo "📦 Building image: $IMAGE_NAME"

      # Build Docker image
      docker build -t "$IMAGE_NAME" \
        --build-arg BUILD_DATE="$(date -u +'%Y-%m-%dT%H:%M:%SZ')" \
          --build-arg VCS_REF="$(git rev-parse HEAD)" \
            --build-arg VERSION="$IMAGE_TAG" \
              .

              echo "🚀 Pushing image to registry..."

              # Login to registry (assumes credentials are in environment)
              if [ -n "${REGISTRY_PASSWORD:-}" ]; then
                echo "$REGISTRY_PASSWORD" | docker login -u "$REGISTRY_USERNAME" --password-stdin "$REGISTRY"
                fi

                # Push image
                docker push "$IMAGE_NAME"

                # Save image info for next steps
                echo "IMAGE_TAG=$IMAGE_TAG" >> "$GITHUB_ENV"
                echo "IMAGE_NAME=$IMAGE_NAME" >> "$GITHUB_ENV"

                echo "✅ Build and push completed successfully"
                
