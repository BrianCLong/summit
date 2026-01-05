#!/usr/bin/env bash
set -euo pipefail

OUT=${1:-"sbom.json"}
if command -v syft >/dev/null 2>&1; then
  echo "Generating SBOM with syft"
  syft dir:. -o json > "$OUT"
else
  echo "syft not found; writing placeholder SBOM" >&2
  echo '{"sbom":"placeholder","generated_at":"'"$(date -Iseconds)"'"}' > "$OUT"
fi
echo "SBOM written to $OUT"

