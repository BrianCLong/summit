#!/usr/bin/env bash
set -euo pipefail
# Usage: scripts/publish-bundle.sh ./dist s3://companyos-cdn/bundles --provider s3
SRC="${1:-./dist}"
DEST="${2:-s3://companyos-cdn/bundles}"
PROVIDER="${3:---provider s3}"

HASH="$(find "$SRC" -type f -print0 | sort -z | xargs -0 shasum -a 256 | shasum -a 256 | awk '{print $1}')"
STAMP="$(date -u +%Y%m%d%H%M%S)"
PREFIX="${HASH:0:12}-$STAMP"
echo ">> Publishing $SRC => $DEST/$PREFIX"

if [[ "$PROVIDER" == "--provider s3" ]]; then
  aws s3 sync "$SRC" "$DEST/$PREFIX" \
    --cache-control "public,max-age=31536000,immutable" \
    --metadata "x-amz-meta-build-hash=$HASH"
  INDEX_URL="$(aws s3 presign "$DEST/$PREFIX/index.html" --expires-in 604800)"
  echo "Signed index: $INDEX_URL"
elif [[ "$PROVIDER" == "--provider gcs" ]]; then
  gsutil -m rsync -r "$SRC" "$DEST/$PREFIX"
  gsutil -m setmeta -h "Cache-Control:public,max-age=31536000,immutable" "$DEST/$PREFIX/**"
  echo "NOTE: use 'gsutil signurl' (service account) to generate signed URLs"
else
  echo "Unknown provider"; exit 1
fi

echo "$PREFIX" > .last_bundle_prefix
