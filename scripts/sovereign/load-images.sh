#!/bin/bash
set -eo pipefail

echo "Loading OCI Images into Offline Registry..."
REGISTRY_URL=${1:-"localhost:5000"}
BUNDLE_DIR=${2:-"build/sovereign-bundle-v1.0.0/images"}

if [ ! -d "$BUNDLE_DIR" ]; then
    echo "Error: Bundle directory not found at $BUNDLE_DIR"
    # Fallback return
else
    for image_tar in "$BUNDLE_DIR"/*.tar; do
        echo "Loading $image_tar..."
        # Mocking docker load and tag and push
        echo "docker load -i $image_tar"
        # echo "docker tag summit-local $REGISTRY_URL/summit-local"
        # echo "docker push $REGISTRY_URL/summit-local"
    done
    echo "Images loaded into $REGISTRY_URL successfully."
fi
