#!/usr/bin/env bash
set -euo pipefail

if [[ $# -lt 2 ]]; then
  echo "Usage: $0 <artifact_id> <target_version>" >&2
  exit 1
fi

artifact_id="$1"
target_version="$2"
status_dir="artifacts/learning/status"
history_dir="artifacts/learning/history"
status_file="$status_dir/${artifact_id}.json"
history_file="$history_dir/${artifact_id}.log"

if [[ ! -f "$history_file" ]]; then
  echo "No history found for $artifact_id; cannot rollback safely." >&2
  exit 1
fi

python - <<'PY' "$artifact_id" "$target_version" "$status_file" "$history_file"
import json
import sys
from datetime import datetime, timezone

artifact_id, target_version, status_file, history_file = sys.argv[1:5]

records = []
with open(history_file, "r", encoding="utf-8") as f:
    for line in f:
        try:
            records.append(json.loads(line))
        except json.JSONDecodeError:
            continue

matches = [r for r in records if r.get("version") == target_version]
if not matches:
    sys.stderr.write(f"Target version {target_version} not found in history for {artifact_id}.\n")
    sys.exit(1)

latest_match = sorted(matches, key=lambda r: r.get("timestamp", ""))[-1]
now = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
status = {
    "artifact_id": artifact_id,
    "version": target_version,
    "stage": "active",
    "evidence_path": latest_match.get("evidence_path", ""),
    "updated_at": now,
    "rolled_back_from": records[-1].get("version") if records else None,
}

with open(status_file, "w", encoding="utf-8") as f:
    json.dump(status, f, indent=2)

rollback_record = {
    "artifact_id": artifact_id,
    "version": target_version,
    "stage": "rollback",
    "evidence_path": latest_match.get("evidence_path", ""),
    "timestamp": now,
    "rolled_back_from": records[-1].get("version") if records else None,
}

with open(history_file, "a", encoding="utf-8") as f:
    f.write(json.dumps(rollback_record) + "\n")

sys.stderr.write(
    f"Rollback recorded for {artifact_id}@{target_version} (previous version: {rollback_record['rolled_back_from']}).\n"
)
PY

