#!/usr/bin/env bash
set -euo pipefail

if [[ -n "${KUBECONFORM:-}" && -x "${KUBECONFORM}" ]]; then
  echo "${KUBECONFORM}"
  exit 0
fi

OS=$(uname -s | tr '[:upper:]' '[:lower:]')
ARCH=$(uname -m)
case "$ARCH" in
  x86_64) ARCH=amd64 ;;
  aarch64|arm64) ARCH=arm64 ;;
  *) ARCH="${ARCH}" ;;
 esac

CANDIDATE="tools/kubeconform/${OS}-${ARCH}/kubeconform"
if [[ -x "$CANDIDATE" ]]; then
  echo "$CANDIDATE"
  exit 0
fi

exit 1
