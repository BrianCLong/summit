#!/usr/bin/env bash
set -euo pipefail

if [[ $# -lt 2 ]]; then
  echo "Usage: $0 <image_digest> <records_file>" >&2
  exit 2
fi

digest="$1"
records_file="$2"
root_dir="$(git rev-parse --show-toplevel)"
records_path="${root_dir}/${records_file}"

mkdir -p "$(dirname "$records_path")"

python - "$digest" "$records_path" <<'PY'
import json
import os
import sys

digest = sys.argv[1]
records_file = sys.argv[2]

record = {"previous": {"digest": ""}, "last": {"digest": digest}}
if os.path.exists(records_file):
    with open(records_file, "r", encoding="utf-8") as handle:
        record = json.load(handle)

record["previous"] = record.get("last", {})
record["last"] = {"digest": digest}

with open(records_file, "w", encoding="utf-8") as handle:
    json.dump(record, handle, indent=2)
    handle.write("\n")

print(f"OK: recorded {digest} in {records_file}")
PY
