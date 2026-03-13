#!/usr/bin/env bash
set -e

echo "Archiving evidence artifacts..."

TODAY=$(date -u +"%Y-%m-%d")
ARCHIVE_DIR="evidence-archive/$TODAY"
MANIFEST_FILE="$ARCHIVE_DIR/archive-manifest.json"

mkdir -p "$ARCHIVE_DIR"

echo "{" > "$MANIFEST_FILE"
echo "  \"archive_date\": \"$(date -u +"%Y-%m-%dT%H:%M:%SZ")\"," >> "$MANIFEST_FILE"
echo "  \"files\": {" >> "$MANIFEST_FILE"

FIRST_ENTRY=1

for dir in evidence/*; do
  if [ ! -d "$dir" ]; then
    continue
  fi

  EVIDENCE_ID=$(basename "$dir")

  # Check if it has any evidence files
  HAS_REPORT=0
  HAS_STAMP=0
  HAS_METRICS=0

  if [ -f "$dir/report.json" ]; then HAS_REPORT=1; fi
  if [ -f "$dir/stamp.json" ]; then HAS_STAMP=1; fi
  if [ -f "$dir/metrics.json" ]; then HAS_METRICS=1; fi

  HAS_ANY=$((HAS_REPORT | HAS_STAMP | HAS_METRICS))

  if [ "$HAS_ANY" -eq 1 ]; then
    # Create corresponding directory in archive
    mkdir -p "$ARCHIVE_DIR/$EVIDENCE_ID"

    for artifact_type in "report" "metrics" "stamp"; do
      FILE="$dir/$artifact_type.json"

      if [ -f "$FILE" ]; then
        DEST_FILE="$ARCHIVE_DIR/$EVIDENCE_ID/$artifact_type.json"
        cp -p "$FILE" "$DEST_FILE"

        # Calculate SHA256
        CHECKSUM=$(sha256sum "$FILE" | awk '{print $1}')

        if [ "$FIRST_ENTRY" -eq 1 ]; then
          FIRST_ENTRY=0
        else
          echo "," >> "$MANIFEST_FILE"
        fi

        cat <<JSON >> "$MANIFEST_FILE"
    "$EVIDENCE_ID/$artifact_type.json": {
      "checksum": "$CHECKSUM",
      "type": "$artifact_type"
    }
JSON
      fi
    done
  fi
done

echo "" >> "$MANIFEST_FILE"
echo "  }" >> "$MANIFEST_FILE"
echo "}" >> "$MANIFEST_FILE"

echo "Archived evidence to $ARCHIVE_DIR"
echo "Generated manifest: $MANIFEST_FILE"
