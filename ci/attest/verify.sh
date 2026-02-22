#!/usr/bin/env bash
set -euo pipefail

# Deny-by-default when SUMMIT_ATTESTATION_REQUIRED=1
: "${SUMMIT_ATTESTATION_REQUIRED:=0}"
: "${REQUIRE_TRUSTED_ROOT:=0}"
: "${REQUIRE_SIGNING_CONFIG:=0}"

ARTIFACT="${ARTIFACT:-${1:-}}"
BUNDLE="${BUNDLE:-${2:-}}"
TRUSTED_ROOT="${TRUSTED_ROOT:-}"
SIGNING_CONFIG="${SIGNING_CONFIG:-}"

if [[ "${SUMMIT_ATTESTATION_REQUIRED}" != "1" ]]; then
  echo "attestation: SKIP (SUMMIT_ATTESTATION_REQUIRED=0)"
  exit 0
fi

if [[ -z "${ARTIFACT}" ]]; then
  echo "attestation: FAIL missing ARTIFACT path or reference"
  exit 2
fi

if [[ -z "${BUNDLE}" ]]; then
  echo "attestation: FAIL missing bundle (--bundle required)"
  exit 2
fi

if [[ "${REQUIRE_TRUSTED_ROOT}" == "1" && -z "${TRUSTED_ROOT}" ]]; then
  echo "attestation: FAIL trusted root required but TRUSTED_ROOT not set"
  exit 2
fi

if [[ "${REQUIRE_SIGNING_CONFIG}" == "1" && -z "${SIGNING_CONFIG}" ]]; then
  echo "attestation: FAIL signing config required but SIGNING_CONFIG not set"
  exit 2
fi

if [[ -n "${TRUSTED_ROOT}" && ! -f "${TRUSTED_ROOT}" ]]; then
  echo "attestation: FAIL trusted root file '${TRUSTED_ROOT}' not found"
  exit 2
fi

if [[ -n "${SIGNING_CONFIG}" && ! -f "${SIGNING_CONFIG}" ]]; then
  echo "attestation: FAIL signing config file '${SIGNING_CONFIG}' not found"
  exit 2
fi

if ! command -v cosign >/dev/null 2>&1; then
  echo "attestation: FAIL cosign is required but not installed"
  exit 2
fi

args=(verify-blob "${ARTIFACT}" --bundle "${BUNDLE}")

if [[ -n "${TRUSTED_ROOT}" ]]; then
  args+=(--trusted-root "${TRUSTED_ROOT}")
fi

if [[ -n "${SIGNING_CONFIG}" ]]; then
  args+=(--use-signing-config "${SIGNING_CONFIG}")
fi

cosign "${args[@]}"
