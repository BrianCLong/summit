#!/usr/bin/env bash
set -euo pipefail
IMAGE="${1:-ghcr.io/example/liquid-nano:pilot}"
ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")"/../../.. && pwd)"

echo "Building Liquid Nano image: $IMAGE"
docker build -t "$IMAGE" -f "$ROOT_DIR/packages/liquid-nano/deploy/Dockerfile" "$ROOT_DIR"

echo "Pushing $IMAGE"
docker push "$IMAGE"
