#!/usr/bin/env bash
set -euo pipefail

TARGET="."
SERVICE_NAME=${SERVICE_NAME:-summit}
SHA=${GITHUB_SHA:-local}
OUTPUT=""

usage() {
  cat <<'USAGE'
Usage: generate_syft.sh [--target <path|image>] [--service <name>] [--sha <sha>] [--output <file>]
Generates an SPDX SBOM using Syft and writes it to artifacts/sbom/<service>-<sha>.spdx.json by default.
USAGE
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --target)
      TARGET="$2"; shift 2 ;;
    --service)
      SERVICE_NAME="$2"; shift 2 ;;
    --sha)
      SHA="$2"; shift 2 ;;
    --output)
      OUTPUT="$2"; shift 2 ;;
    -h|--help)
      usage; exit 0 ;;
    *)
      echo "Unknown argument: $1" >&2
      usage
      exit 1 ;;
  esac
done

OUTPUT=${OUTPUT:-artifacts/sbom/${SERVICE_NAME}-${SHA}.spdx.json}
mkdir -p "$(dirname "$OUTPUT")"

if ! command -v syft >/dev/null 2>&1; then
  echo "Syft not found; installing..."
  curl -sSfL https://raw.githubusercontent.com/anchore/syft/main/install.sh | sudo sh -s -- -b /usr/local/bin
fi

echo "Generating SBOM for $TARGET -> $OUTPUT"
syft packages "$TARGET" -o "spdx-json=${OUTPUT}"

echo "SBOM created at $OUTPUT"
