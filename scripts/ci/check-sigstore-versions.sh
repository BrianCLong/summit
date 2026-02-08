#!/usr/bin/env bash
set -euo pipefail

MIN_COSIGN_VERSION=${MIN_COSIGN_VERSION:-3.0.2}
MIN_REKOR_VERSION=${MIN_REKOR_VERSION:-1.5.0}
REKOR_URL=${REKOR_URL:-https://rekor.sigstore.dev}

normalize_version() {
  local raw=${1#v}
  raw=${raw%%+*}
  raw=${raw%%-*}
  echo "$raw"
}

version_ge() {
  local current=$1
  local minimum=$2
  local smallest
  smallest=$(printf '%s\n' "$minimum" "$current" | sort -V | head -n1)
  [[ "$smallest" == "$minimum" ]]
}

if ! command -v cosign >/dev/null 2>&1; then
  echo "cosign is required but not installed" >&2
  exit 1
fi

cosign_version_raw=$(cosign version 2>/dev/null | awk -F': ' '/GitVersion|Cosign Version|Version/ {print $2; exit}')
if [[ -z "$cosign_version_raw" ]]; then
  echo "Unable to detect cosign version" >&2
  exit 1
fi

cosign_version=$(normalize_version "$cosign_version_raw")
if ! version_ge "$cosign_version" "$MIN_COSIGN_VERSION"; then
  echo "cosign ${cosign_version_raw} is below required ${MIN_COSIGN_VERSION}" >&2
  exit 1
fi

echo "cosign version ${cosign_version_raw} meets minimum ${MIN_COSIGN_VERSION}"

rekor_json=$(curl -sSf "${REKOR_URL%/}/api/v1/version")
rekor_version_raw=$(echo "$rekor_json" | sed -n 's/.*"gitVersion":"\([^"]*\)".*/\1/p')
if [[ -z "$rekor_version_raw" ]]; then
  rekor_version_raw=$(echo "$rekor_json" | sed -n 's/.*"version":"\([^"]*\)".*/\1/p')
fi

if [[ -z "$rekor_version_raw" ]]; then
  echo "Unable to detect Rekor version from ${REKOR_URL}" >&2
  exit 1
fi

rekor_version=$(normalize_version "$rekor_version_raw")
if ! version_ge "$rekor_version" "$MIN_REKOR_VERSION"; then
  echo "Rekor ${rekor_version_raw} is below required ${MIN_REKOR_VERSION}" >&2
  exit 1
fi

echo "Rekor version ${rekor_version_raw} meets minimum ${MIN_REKOR_VERSION}"
