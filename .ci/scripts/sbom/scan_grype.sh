#!/usr/bin/env bash
set -euo pipefail

TARGET="dir:."
SERVICE_NAME=${SERVICE_NAME:-summit}
SHA=${GITHUB_SHA:-local}
OUTPUT_DIR="artifacts/scans"

usage() {
  cat <<'USAGE'
Usage: scan_grype.sh [--target <image|dir:path>] [--service <name>] [--sha <sha>] [--output-dir <dir>]
Runs Grype against a target and writes JSON and SARIF reports.
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
    --output-dir)
      OUTPUT_DIR="$2"; shift 2 ;;
    -h|--help)
      usage; exit 0 ;;
    *)
      echo "Unknown argument: $1" >&2
      usage
      exit 1 ;;
  esac
done

JSON_OUT="$OUTPUT_DIR/grype-${SERVICE_NAME}-${SHA}.json"
SARIF_OUT="$OUTPUT_DIR/grype-${SERVICE_NAME}-${SHA}.sarif"
mkdir -p "$OUTPUT_DIR"

if ! command -v grype >/dev/null 2>&1; then
  echo "Grype not found; installing..."
  curl -sSfL https://raw.githubusercontent.com/anchore/grype/main/install.sh | sudo sh -s -- -b /usr/local/bin
fi

echo "Running Grype scan for $TARGET"
grype "$TARGET" -o json --file "$JSON_OUT"
grype "$TARGET" -o sarif --file "$SARIF_OUT"

echo "Grype reports saved to $OUTPUT_DIR"
