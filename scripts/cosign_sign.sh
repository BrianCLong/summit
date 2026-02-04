#!/usr/bin/env bash
set -euo pipefail
BLOB=${1:-dist/policy-pack/v0/policy-pack-v0.tar}
BUNDLE=${2:-contracts/policy-pack/v0/signing/cosign.bundle.json}
export COSIGN_EXPERIMENTAL=1
cosign sign-blob --yes --bundle "$BUNDLE" "$BLOB"
cosign verify-blob --bundle "$BUNDLE" "$BLOB"

