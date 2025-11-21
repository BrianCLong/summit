#!/bin/bash

# Publish Release Script
# Called by semantic-release after creating a release

set -euo pipefail

VERSION="${1:-}"

if [[ -z "$VERSION" ]]; then
  echo "Error: Version argument required"
  exit 1
fi

echo "🚀 Publishing release v${VERSION}..."

# Tag Docker images with release version
if command -v docker &> /dev/null; then
  echo "Tagging Docker images..."

  # Tag images (if they exist locally)
  for SERVICE in api web worker; do
    if docker image inspect "ghcr.io/brianelong/summit/${SERVICE}:latest" &> /dev/null; then
      docker tag \
        "ghcr.io/brianelong/summit/${SERVICE}:latest" \
        "ghcr.io/brianelong/summit/${SERVICE}:${VERSION}"

      echo "  ✓ Tagged ${SERVICE}:${VERSION}"
    fi
  done
fi

# Create deployment manifest
echo "Creating deployment manifest..."
cat > "releases/v${VERSION}.yaml" << EOF
apiVersion: v1
kind: Release
metadata:
  name: v${VERSION}
  createdAt: $(date -u +%Y-%m-%dT%H:%M:%SZ)

spec:
  version: ${VERSION}

  images:
    api:
      repository: ghcr.io/brianelong/summit/api
      tag: ${VERSION}
    web:
      repository: ghcr.io/brianelong/summit/web
      tag: ${VERSION}

  environments:
    staging:
      url: https://staging.intelgraph.io
      deployed: false

    production:
      url: https://intelgraph.io
      deployed: false
      requiresApproval: true

  releaseNotes: |
    See CHANGELOG.md for detailed changes.

EOF

mkdir -p releases
echo "  ✓ Created releases/v${VERSION}.yaml"

# Update latest symlink
ln -sf "v${VERSION}.yaml" releases/latest.yaml
echo "  ✓ Updated releases/latest.yaml"

echo "✅ Release v${VERSION} published successfully"
echo ""
echo "Next steps:"
echo "  1. Review the release notes at RELEASE_NOTES.md"
echo "  2. Deploy to staging (automatic)"
echo "  3. Deploy to production (manual approval required)"
