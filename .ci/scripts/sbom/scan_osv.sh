#!/usr/bin/env bash
set -euo pipefail

TARGET="."
SERVICE_NAME=${SERVICE_NAME:-summit}
SHA=${GITHUB_SHA:-local}
OUTPUT_DIR="artifacts/scans"

usage() {
  cat <<'USAGE'
Usage: scan_osv.sh [--target <path>] [--service <name>] [--sha <sha>] [--output-dir <dir>]
Runs osv-scanner and emits JSON and SARIF reports for the target directory.
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

JSON_OUT="$OUTPUT_DIR/osv-${SERVICE_NAME}-${SHA}.json"
SARIF_OUT="$OUTPUT_DIR/osv-${SERVICE_NAME}-${SHA}.sarif"
mkdir -p "$OUTPUT_DIR"

if ! command -v osv-scanner >/dev/null 2>&1; then
  echo "Installing osv-scanner..."
  curl -sSfL https://raw.githubusercontent.com/ossf/osv-scanner/main/install.sh | sudo sh -s -- -b /usr/local/bin
fi

echo "Running osv-scanner for $TARGET"
osv-scanner --format json --output "$JSON_OUT" "$TARGET"
osv-scanner --format sarif --output "$SARIF_OUT" "$TARGET"

echo "OSV reports saved to $OUTPUT_DIR"
