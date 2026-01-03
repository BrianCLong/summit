#!/usr/bin/env bash
set -euo pipefail

usage() {
  cat <<'USAGE'
Usage: scripts/verification/generate_ops_evidence_pack.sh [--output-dir DIR] [--status STATUS] [--notes TEXT] [--tarball-name NAME]

Generates an operational evidence pack tarball. The pack includes key evidence index files and a
metadata manifest. The tarball is written to the chosen output directory (default:
artifacts/ops-evidence/manual).

Options:
  --output-dir DIR    Directory where the pack directory and tarball will be created.
  --status STATUS     Status label to embed in metadata (default: pass).
  --notes TEXT        Freeform notes for the metadata (optional).
  --tarball-name NAME Name of the output tarball file (default: ops-evidence-pack.tar.gz).
  -h, --help          Show this help message.
USAGE
}

OUTPUT_DIR="artifacts/ops-evidence/manual"
STATUS="pass"
NOTES=""
TARBALL_NAME="ops-evidence-pack.tar.gz"

while [[ $# -gt 0 ]]; do
  case "$1" in
    --output-dir)
      OUTPUT_DIR="$2"
      shift 2
      ;;
    --status)
      STATUS="$2"
      shift 2
      ;;
    --notes)
      NOTES="$2"
      shift 2
      ;;
    --tarball-name)
      TARBALL_NAME="$2"
      shift 2
      ;;
    -h|--help)
      usage
      exit 0
      ;;
    *)
      echo "Unknown option: $1" >&2
      usage
      exit 1
      ;;
  esac
done

REPO_ROOT=$(git rev-parse --show-toplevel)
TIMESTAMP_UTC=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
COMMIT_SHA=$(git -C "$REPO_ROOT" rev-parse HEAD)

PACK_DIR="$OUTPUT_DIR/ops-evidence-pack"
mkdir -p "$PACK_DIR"

copy_file() {
  local source_file="$1"
  local target_dir="$2"
  if [[ -f "$source_file" ]]; then
    mkdir -p "$target_dir"
    cp "$source_file" "$target_dir/"
  else
    echo "Warning: $source_file not found; skipping" >&2
  fi
}

copy_file "$REPO_ROOT/docs/ops/EVIDENCE_INDEX.md" "$PACK_DIR/docs"
copy_file "$REPO_ROOT/docs/ops/EVIDENCE_INDEX.json" "$PACK_DIR/docs"
copy_file "$REPO_ROOT/EVIDENCE_BUNDLE.manifest.json" "$PACK_DIR/root"
copy_file "$REPO_ROOT/COMPLIANCE_EVIDENCE_INDEX.md" "$PACK_DIR/root"

cat > "$PACK_DIR/metadata.json" <<EOF2
{
  "generated_at_utc": "$TIMESTAMP_UTC",
  "commit_sha": "$COMMIT_SHA",
  "status": "$STATUS",
  "notes": "$NOTES",
  "source_script": "scripts/verification/generate_ops_evidence_pack.sh",
  "output_dir": "$OUTPUT_DIR",
  "tarball_name": "$TARBALL_NAME"
}
EOF2

( cd "$OUTPUT_DIR" && tar -czf "$TARBALL_NAME" "$(basename "$PACK_DIR")" )

cat <<EOF2
Generated ops evidence pack
- pack directory: $PACK_DIR
- tarball: $OUTPUT_DIR/$TARBALL_NAME
EOF2
