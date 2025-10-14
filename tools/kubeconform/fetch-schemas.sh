#!/usr/bin/env bash
set -euo pipefail

VER="${1:-v1.28.0}"
DEST="tools/k8s-schemas/${VER}"
mkdir -p "$DEST"
TMP=$(mktemp -d)
cleanup() { rm -rf "$TMP"; }
trap cleanup EXIT

echo "↓ Fetching schemas for ${VER}"
curl -fsSL "https://raw.githubusercontent.com/yannh/kubernetes-json-schema/master/${VER}-standalone.tar.gz" -o "${TMP}/schemas.tar.gz"
tar -xzf "${TMP}/schemas.tar.gz" -C "$TMP"
cp -R "${TMP}/"* "$DEST"/
rm -f "$DEST"/schemas.tar.gz || true
echo "✔ Schemas in ${DEST}"
