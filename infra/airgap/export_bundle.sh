#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR=$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)
MANIFEST=${MANIFEST:-"$SCRIPT_DIR/bundle.manifest.json"}
export MANIFEST
OUTPUT_DIR=${OUTPUT_DIR:-"$SCRIPT_DIR/dist"}
SIGNING_KEY=${SIGNING_KEY:-""}
SKIP_PULL=${SKIP_PULL:-"false"}

if [[ ! -f "$MANIFEST" ]]; then
  echo "✖️  bundle manifest not found at $MANIFEST" >&2
  exit 1
fi

ARGS=("--manifest" "$MANIFEST" "--output-dir" "$OUTPUT_DIR")
if [[ "$SKIP_PULL" == "true" ]]; then
  ARGS+=("--skip-pull")
fi

python3 "$SCRIPT_DIR/build_airgap_bundle.py" "${ARGS[@]}"

ARCHIVE_NAME=$(python3 - <<'PY'
import json
import os
import sys
manifest_path = os.environ["MANIFEST"]
with open(manifest_path, "r", encoding="utf-8") as handle:
    data = json.load(handle)
print(data.get("output", {}).get("archiveName", "intelgraph-airgap-bundle.tgz"))
PY
)
BUNDLE_PATH="$OUTPUT_DIR/$ARCHIVE_NAME"
SHA_PATH="$BUNDLE_PATH.sha256"

if [[ -n "$SIGNING_KEY" ]]; then
  if [[ ! -f "$SIGNING_KEY" ]]; then
    echo "✖️  signing key $SIGNING_KEY not found" >&2
    exit 1
  fi
  openssl dgst -sha256 -sign "$SIGNING_KEY" -out "$BUNDLE_PATH.sig" "$BUNDLE_PATH"
  openssl dgst -sha256 -verify <(openssl pkey -in "$SIGNING_KEY" -pubout) -signature "$BUNDLE_PATH.sig" "$BUNDLE_PATH" >/dev/null
  echo "🔐 bundle signed -> $BUNDLE_PATH.sig"
fi

echo "📦 bundle ready: $BUNDLE_PATH"
echo "🔏 checksum: $SHA_PATH"
