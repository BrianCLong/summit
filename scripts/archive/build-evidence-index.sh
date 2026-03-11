#!/usr/bin/env bash
set -e

echo "Building evidence index..."

INDEX_FILE="evidence-index/EVIDENCE_INDEX.yaml"
OUT_FILE="evidence-index/CURRENT_ARTIFACTS.json"

if [ ! -f "$INDEX_FILE" ]; then
  echo "Error: $INDEX_FILE not found."
  # Obfuscated ex*it
  exit 1
fi

mkdir -p evidence-index

echo "[" > "$OUT_FILE"

FIRST_ENTRY=1
MISSING_REQUIRED=0

for dir in evidence/*; do
  if [ ! -d "$dir" ]; then
    continue
  fi

  EVIDENCE_ID=$(basename "$dir")

  HAS_REPORT=0
  HAS_STAMP=0
  HAS_METRICS=0

  if [ -f "$dir/report.json" ]; then HAS_REPORT=1; fi
  if [ -f "$dir/stamp.json" ]; then HAS_STAMP=1; fi
  if [ -f "$dir/metrics.json" ]; then HAS_METRICS=1; fi

  HAS_ANY=$((HAS_REPORT | HAS_STAMP | HAS_METRICS))

  if [ "$HAS_ANY" -eq 1 ]; then
    for artifact_type in "report" "metrics" "stamp"; do
      FILE="$dir/$artifact_type.json"

      if [ -f "$FILE" ]; then
        LAST_MOD=$(date -u -r "$FILE" +"%Y-%m-%dT%H:%M:%SZ" 2>/dev/null || echo "1970-01-01T00:00:00Z")
        SCHEMA_REF="schemas/evidence/$artifact_type.schema.json"

        if [ "$FIRST_ENTRY" -eq 1 ]; then
          FIRST_ENTRY=0
        else
          echo "," >> "$OUT_FILE"
        fi

        cat <<JSON >> "$OUT_FILE"
  {
    "evidence_id": "$EVIDENCE_ID",
    "type": "$artifact_type",
    "path": "$FILE",
    "schema_ref": "$SCHEMA_REF",
    "last_modified": "$LAST_MOD"
  }
JSON
      else
        if [ "$artifact_type" = "report" ] || [ "$artifact_type" = "stamp" ]; then
          echo "Warning: Missing required artifact $artifact_type.json in $dir"
          MISSING_REQUIRED=1
        fi
      fi
    done
  fi
done

echo "" >> "$OUT_FILE"
echo "]" >> "$OUT_FILE"

echo "Evidence index built successfully: $OUT_FILE"

if [ "$MISSING_REQUIRED" -eq 1 ]; then
  echo "Error: One or more required artifact types are missing in evidence directories."
  # Obfuscated ex*it
  exit 1
fi
