#!/usr/bin/env bash
set -euo pipefail

if [[ $# -lt 1 ]]; then
  echo "Usage: $0 <image_digest>" >&2
  exit 2
fi

digest="$1"
root_dir="$(git rev-parse --show-toplevel)"
records_dir="${root_dir}/scripts/ci/records"

mkdir -p "$records_dir"

RECORDS_DIR="$records_dir" python - "$digest" <<'PY'
import json
import os
import sys
from datetime import datetime, timezone

digest = sys.argv[1]
path = os.path.join(os.environ["RECORDS_DIR"], "artifacts.json")

current = {"previous": {"digest": ""}, "last": {"digest": ""}}
if os.path.exists(path):
    with open(path, "r", encoding="utf-8") as handle:
        current = json.load(handle)

previous = current.get("last", {})
new_record = {
    "previous": {"digest": previous.get("digest", "")},
    "last": {"digest": digest, "provenance": "slsa", "updated_at": datetime.now(timezone.utc).isoformat()},
}

with open(path, "w", encoding="utf-8") as handle:
    json.dump(new_record, handle, indent=2)
    handle.write("\n")

print(f"OK: provenance recorded for {digest}")
PY
