#!/usr/bin/env bash
# scripts/ci/check-image-pins.sh
# Checks if images in Kubernetes and Docker Compose manifests are pinned to SHA256 digests.

set -euo pipefail

RED='[0;31m'
GREEN='[0;32m'
NC='[0m' # No Color

echo "🔎 Checking image pins in Kubernetes and Docker Compose manifests..."

UNPINNED_IMAGES=()

# Find all relevant manifest files
# Look for .yaml, .yml files in k8s/, charts/, and docker-compose*.yml files
MANIFEST_FILES=$(find . -type f \
  -path './k8s/*.yaml' -o \
  -path './charts/**/*.yaml' -o \
  -name 'docker-compose*.yml' \
) 

if [ -z "$MANIFEST_FILES" ]; then
  echo "No Kubernetes or Docker Compose manifest files found to check."
  exit 0
fi

for file in $MANIFEST_FILES; do
  # Use grep to find image lines and then awk to extract the image name
  # Filter out lines that already contain @sha256:
  images_in_file=$(grep -E 'image: *[a-zA-Z0-9/\-]+\\:[a-zA-Z0-9\\.\\-]+\' "$file" | \
                   grep -v '@sha256:' | \
                   awk '{print $2}')

  if [ -n "$images_in_file" ]; then
    echo "Found unpinned images in $file:"
    for img in $images_in_file; do
      echo "  - $img"
      UNPINNED_IMAGES+=("$img")
    done
  fi
done

if [ ${#UNPINNED_IMAGES[@]} -gt 0 ]; then
  echo -e "\n${RED}❌ Found unpinned images. Please pin them to SHA256 digests."
  echo "Example: your-image:latest -> your-image@sha256:abcdef12345..."
  exit 1
else
  echo -e "\n${GREEN}✅ All images in Kubernetes and Docker Compose manifests are pinned to SHA256 digests."
  exit 0
fi
