#!/usr/bin/env bash
set -euo pipefail

VER="${1:-0.6.7}"
OS=$(uname -s | tr '[:upper:]' '[:lower:]')
ARCH=$(uname -m)
case "$ARCH" in
  x86_64) ARCH=amd64 ;;
  aarch64|arm64) ARCH=arm64 ;;
  *) echo "Unsupported architecture: $ARCH" >&2; exit 1 ;;
 esac
DIR="tools/kubeconform/${OS}-${ARCH}"
mkdir -p "$DIR"
TMP=$(mktemp -d)
cleanup() { rm -rf "$TMP"; }
trap cleanup EXIT

ARCHIVE_NAME="kubeconform-${OS}-${ARCH}.tar.gz"
if [[ "$OS" == "darwin" ]]; then
  ARCHIVE_NAME="kubeconform-darwin-${ARCH}.tar.gz"
elif [[ "$OS" == "linux" ]]; then
  ARCHIVE_NAME="kubeconform-linux-${ARCH}.tar.gz"
fi

echo "↓ Fetching kubeconform ${VER} for ${OS}-${ARCH}"
curl -fsSL -o "${TMP}/kcf.tar.gz" "https://github.com/yannh/kubeconform/releases/download/v${VER}/${ARCHIVE_NAME}"
tar -xzf "${TMP}/kcf.tar.gz" -C "$TMP"
install_path="$DIR/kubeconform"
mv "${TMP}/kubeconform" "$install_path"
chmod +x "$install_path"
echo "✔ Installed ${install_path}"
