#!/usr/bin/env bash
set -euo pipefail

if ! command -v cosign >/dev/null 2>&1; then
  echo "cosign not installed" >&2
  exit 1
fi

workdir=$(mktemp -d)
trap 'rm -rf "$workdir"' EXIT

export COSIGN_PASSWORD=""
artifact="$workdir/artifact.txt"
cat <<'EOD' > "$artifact"
IntelGraph DevKit provenance sentinel
EOD

cosign generate-key-pair --output-key-prefix "$workdir/devkit"
cosign sign-blob --key "$workdir/devkit.key" --output-signature "$workdir/artifact.sig" --yes "$artifact"
cosign verify-blob --key "$workdir/devkit.pub" --signature "$workdir/artifact.sig" "$artifact"

echo "✅ Cosign provenance toolchain verified"
