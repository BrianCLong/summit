#!/usr/bin/env bash
set -euo pipefail
PACK_DIR=${1:-contracts/policy-pack/v0}
OUT_DIR=${2:-dist/policy-pack/v0}
PACK_TAR=${3:-dist/policy-pack/v0/policy-pack-v0.tar}
mkdir -p "$OUT_DIR"
tar --sort=name \
    --owner=0 --group=0 --numeric-owner \
    -C "$PACK_DIR" \
    -cf "$PACK_TAR" \
    ./opa ./data ./README.md ./signing
sha256sum "$PACK_TAR" | awk '{print $1}'

