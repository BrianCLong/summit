#!/usr/bin/env bash
set -euo pipefail

if [[ $# -lt 1 ]]; then
  echo "usage: $0 <bundle.tgz>" >&2
  exit 1
fi

BUNDLE=$1
shift || true
WORKDIR=$(mktemp -d)
trap 'rm -rf "$WORKDIR"' EXIT

tar -xzf "$BUNDLE" -C "$WORKDIR"

if command -v docker >/dev/null; then
  find "$WORKDIR/images" -name '*.tar' -print0 | while IFS= read -r -d '' image; do
    echo "📥 loading image $(basename "$image")"
    docker load -i "$image"
  done
fi

if command -v helm >/dev/null; then
  mkdir -p airgap-charts
  find "$WORKDIR/charts" -name '*.tgz' -print0 | while IFS= read -r -d '' chart; do
    cp "$chart" airgap-charts/
  done
  echo "✅ Helm charts copied to ./airgap-charts"
fi

cp "$WORKDIR/ledger"/*.json ./ || true
cp "$WORKDIR/manifests"/*.json ./ || true

echo "📄 provenance artifacts restored to $(pwd)"
