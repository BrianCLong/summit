#!/usr/bin/env bash
set -euo pipefail

# Governance SBOM signature gate.
#
# Default behavior is intentionally NON-BREAKING:
# - If a signature file exists, we verify it and fail on error.
# - If no signature exists, we emit a warning and exit 0.
#
# To hard-enforce signatures, set REQUIRE_SBOM_SIGNATURE=1 in CI env
# or change the default below.

SBOM_PATH="${SBOM_PATH:-governance/sbom/demo-bom.spdx.json}"
SIG_PATH="${SIG_PATH:-${SBOM_PATH}.sig}"
PUBKEY_PATH="${PUBKEY_PATH:-governance/sbom/allowed-signers.pub}"

REQUIRE_SBOM_SIGNATURE="${REQUIRE_SBOM_SIGNATURE:-0}"

if [[ ! -f "$SBOM_PATH" ]]; then
  echo "SBOM not found at: $SBOM_PATH"
  echo "Nothing to verify."
  exit 0
fi

if [[ -f "$SIG_PATH" ]]; then
  if [[ ! -f "$PUBKEY_PATH" ]]; then
    echo "ERROR: signature exists but public key missing at: $PUBKEY_PATH"
    exit 1
  fi
  echo "Verifying SBOM signature..."
  cosign verify-blob --key "$PUBKEY_PATH" --signature "$SIG_PATH" "$SBOM_PATH" >/dev/null
  echo "SBOM signature: OK"
  exit 0
fi

if [[ "$REQUIRE_SBOM_SIGNATURE" == "1" ]]; then
  echo "ERROR: SBOM signature required but not found at: $SIG_PATH"
  exit 1
fi

echo "WARNING: SBOM signature not found at: $SIG_PATH (non-blocking)."
echo "To enforce, set REQUIRE_SBOM_SIGNATURE=1 in CI."
exit 0
