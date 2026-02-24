#!/usr/bin/env bash
set -euo pipefail

OUTPUT="dist/repro.report.json"
GIT_SHA=""
EPOCH=""
HASH1=""
HASH2=""
MATCH="false"
TOOL_NODE=""
TOOL_PNPM=""

while [[ $# -gt 0 ]]; do
  case $1 in
    --sha) GIT_SHA="$2"; shift ;;
    --epoch) EPOCH="$2"; shift ;;
    --artifact1) HASH1="$2"; shift ;;
    --artifact2) HASH2="$2"; shift ;;
    --match) MATCH="$2"; shift ;;
    --output) OUTPUT="$2"; shift ;;
    --node) TOOL_NODE="$2"; shift ;;
    --pnpm) TOOL_PNPM="$2"; shift ;;
    *) echo "Unknown arg: $1"; exit 1 ;;
  esac
  shift
done

mkdir -p "$(dirname "$OUTPUT")"

cat <<JSON > "$OUTPUT"
{
  "evidence_id": "SUMMIT-EVIDENCE::repro-build-verify::${GIT_SHA}::${GITHUB_RUN_ID:-local}::bundle",
  "git_sha": "${GIT_SHA}",
  "source_date_epoch": ${EPOCH},
  "artifact_1_sha256": "${HASH1}",
  "artifact_2_sha256": "${HASH2}",
  "match": ${MATCH},
  "toolchain": {
    "node": "${TOOL_NODE}",
    "pnpm": "${TOOL_PNPM}"
  }
}
JSON
echo "Report written to $OUTPUT"
