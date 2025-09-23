#!/usr/bin/env bash
set -euo pipefail
OUT=${1:-support-bundle.tgz}
mkdir -p /tmp/support
cp -r logs /tmp/support/logs 2>/dev/null || true
cp docs/releases/RELEASE_NOTES_1.0.1.md /tmp/support/
tar -czf "$OUT" -C /tmp/support .
shasum -a 256 "$OUT"
