#!/usr/bin/env bash
set -euo pipefail
TTL_HOURS="${PREVIEW_TTL_HOURS:-72}"
export TTL_HOURS

kubectl get ns -l summit.sh/preview=true -o json | python3 - <<'PY'
import datetime
import json
import os
import subprocess
import sys

def parse_dt(raw: str) -> datetime.datetime | None:
    try:
        return datetime.datetime.strptime(raw, "%Y-%m-%dT%H:%M:%SZ")
    except Exception:
        return None

def to_int(raw: str, default: int) -> int:
    try:
        return int(raw)
    except Exception:
        return default

def main() -> None:
    ttl_default = to_int(os.environ.get("TTL_HOURS", os.environ.get("PREVIEW_TTL_HOURS", "72")), 72)
    now = datetime.datetime.utcnow()
    data = json.load(sys.stdin)
    for item in data.get("items", []):
        metadata = item.get("metadata", {})
        annotations = metadata.get("annotations", {})
        name = metadata.get("name")
        created_raw = annotations.get("summit.sh/created-at")
        ttl_raw = annotations.get("summit.sh/ttl-hours")
        if not name or not created_raw:
            continue
        created_at = parse_dt(created_raw)
        if created_at is None:
            continue
        ttl_hours = to_int(ttl_raw, ttl_default)
        age_hours = (now - created_at).total_seconds() / 3600
        if age_hours >= ttl_hours:
            print(name)

if __name__ == "__main__":
    main()
PY

while read -r ns; do
  [[ -z "$ns" ]] && continue
  echo "Cleaning up expired preview namespace: $ns"
  kubectl delete ns "$ns" --ignore-not-found
done
