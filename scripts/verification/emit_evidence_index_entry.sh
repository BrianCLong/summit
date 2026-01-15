#!/usr/bin/env bash
set -euo pipefail

usage() {
  cat <<'USAGE'
Usage: emit_evidence_index_entry.sh \
  --id <id> \
  --week-label <YYYY-Www> \
  --status <pass|fail|partial> \
  --commit <sha> \
  --ref <ref> \
  --generated-at <timestamp> \
  --artifact-url <url> \
  [--artifact-sha256 <sha256>] \
  [--notes <text>] \
  [--output <file>]
USAGE
}

ARTIFACT_SHA=""
NOTES=""
OUTPUT_FILE=""

while [[ $# -gt 0 ]]; do
  case "$1" in
    --id)
      ENTRY_ID="$2"
      shift 2
      ;;
    --week-label)
      WEEK_LABEL="$2"
      shift 2
      ;;
    --status)
      STATUS="$2"
      shift 2
      ;;
    --commit)
      COMMIT_SHA="$2"
      shift 2
      ;;
    --ref)
      REF="$2"
      shift 2
      ;;
    --generated-at)
      GENERATED_AT="$2"
      shift 2
      ;;
    --artifact-url)
      ARTIFACT_URL="$2"
      shift 2
      ;;
    --artifact-sha256)
      ARTIFACT_SHA="$2"
      shift 2
      ;;
    --notes)
      NOTES="$2"
      shift 2
      ;;
    --output)
      OUTPUT_FILE="$2"
      shift 2
      ;;
    -h|--help)
      usage
      exit 0
      ;;
    *)
      echo "Unknown argument: $1" >&2
      usage
      exit 1
      ;;
  esac
done

: "${ENTRY_ID?--id is required}"
: "${WEEK_LABEL?--week-label is required}"
: "${STATUS?--status is required}"
: "${COMMIT_SHA?--commit is required}"
: "${REF?--ref is required}"
: "${GENERATED_AT?--generated-at is required}"
: "${ARTIFACT_URL?--artifact-url is required}"

cat > /tmp/evidence_index_entry.json <<EOF_JSON
{
  "id": "${ENTRY_ID}",
  "kind": "weekly",
  "generated_at_utc": "${GENERATED_AT}",
  "commit_sha": "${COMMIT_SHA}",
  "ref": "${REF}",
  "status": "${STATUS}",
  "artifact": {
    "type": "workflow_artifact",
    "reference": "${ARTIFACT_URL}"$(if [[ -n "$ARTIFACT_SHA" ]]; then printf ",\n    \"sha256\": \"%s\"" "$ARTIFACT_SHA"; fi)
  },
  "related": {
    "iso_week": "${WEEK_LABEL}"
  }$(if [[ -n "$NOTES" ]]; then printf ",\n  \"notes\": \"%s\"" "$NOTES"; fi)
}
EOF_JSON

if [[ -n "$OUTPUT_FILE" ]]; then
  cp /tmp/evidence_index_entry.json "$OUTPUT_FILE"
fi

cat /tmp/evidence_index_entry.json
