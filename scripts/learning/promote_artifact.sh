#!/usr/bin/env bash
set -euo pipefail

if [[ $# -lt 4 ]]; then
  echo "Usage: $0 <artifact_id> <version> <stage> <evidence_path>" >&2
  echo "Stage must be one of: draft, evaluated, approved, active" >&2
  exit 1
fi

artifact_id="$1"
version="$2"
stage="$3"
evidence_path="$4"

case "$stage" in
  draft|evaluated|approved|active) ;;
  *) echo "Invalid stage: $stage" >&2; exit 1;;
esac

status_dir="artifacts/learning/status"
history_dir="artifacts/learning/history"
mkdir -p "$status_dir" "$history_dir"

status_file="$status_dir/${artifact_id}.json"
history_file="$history_dir/${artifact_id}.log"

if [[ ! -f "$evidence_path" ]]; then
  echo "Evidence path '$evidence_path' does not exist; attach a real evaluation or checklist." >&2
  exit 1
fi

ts="$(date -u +"%Y-%m-%dT%H:%M:%SZ")"

echo "{" > "$status_file"
echo "  \"artifact_id\": \"$artifact_id\"," >> "$status_file"
echo "  \"version\": \"$version\"," >> "$status_file"
echo "  \"stage\": \"$stage\"," >> "$status_file"
echo "  \"evidence_path\": \"$evidence_path\"," >> "$status_file"
echo "  \"updated_at\": \"$ts\"" >> "$status_file"
echo "}" >> "$status_file"

echo "{" \
  "\"artifact_id\":\"$artifact_id\"," \
  "\"version\":\"$version\"," \
  "\"stage\":\"$stage\"," \
  "\"evidence_path\":\"$evidence_path\"," \
  "\"timestamp\":\"$ts\"" \
"}" >> "$history_file"

echo "Promotion recorded for $artifact_id@$version to stage '$stage'." >&2
