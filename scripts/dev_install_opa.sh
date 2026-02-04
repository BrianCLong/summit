#!/usr/bin/env bash
set -euo pipefail
unameOut="$(uname -s)" # Linux or Darwin
arch="$(uname -m)"     # x86_64 or arm64
case ${unameOut} in
  Linux*)  os=linux ;;
  Darwin*) os=darwin ;;
  *)       echo "Unsupported OS: ${unameOut}"; exit 1 ;;
esac
case ${arch} in
  x86_64|amd64) cpu=amd64 ;;
  arm64|aarch64) cpu=arm64 ;;
  *) echo "Unsupported arch: ${arch}"; exit 1 ;;
esac
version=${1:-latest}
url="https://openpolicyagent.org/downloads/${version}/opa_${os}_${cpu}"
mkdir -p .bin
curl -fsSL -o .bin/opa "$url"
chmod +x .bin/opa
echo "Installed OPA to $(pwd)/.bin/opa"
.bin/opa version || true

