#!/usr/bin/env bash
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
WORKDIR="$(mktemp -d)"
trap 'rm -rf "$WORKDIR"' EXIT

# Stub syft to avoid external dependency in unit test
cat >"$WORKDIR/syft" <<'STUB'
#!/usr/bin/env bash
cat <<'JSON'
{
  "bomFormat": "CycloneDX",
  "specVersion": "1.5",
  "components": [
    {"name": "demo", "version": "1.0.0"}
  ]
}
JSON
STUB
chmod +x "$WORKDIR/syft"
export PATH="$WORKDIR:$PATH"

OUTPUT_DIR="$WORKDIR/out"
IMAGE_REF="ghcr.io/example/app@sha256:deadbeef"

"$SCRIPT_DIR/generate-sbom.sh" "$IMAGE_REF" "$OUTPUT_DIR"

if [[ ! -f "$OUTPUT_DIR/sbom.cdx.json" ]]; then
  echo "SBOM file not generated" >&2
  exit 1
fi

if ! sha256sum -c "$OUTPUT_DIR/sbom.cdx.json.sha256" >/dev/null; then
  echo "SBOM hash verification failed" >&2
  exit 1
fi

echo "generate-sbom.sh test passed"
