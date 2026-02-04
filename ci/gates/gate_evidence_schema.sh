#!/usr/bin/env bash
set -euo pipefail

# Robust evidence validation gate
# Checks index structure and required fields in all linked artifacts

if ! command -v python3 >/dev/null 2>&1; then
  echo "python3 required" >&2
  exit 1
fi

python3 - <<'PY'
import json
import sys
import pathlib

def validate_report(p, eid):
    data = json.loads(p.read_text())
    req = ["evidence_id", "title", "summary", "artifacts"]
    missing = [f for f in req if f not in data]
    if missing: raise Exception(f"{p}: missing fields {missing}")
    if data["evidence_id"] != eid: raise Exception(f"{p}: eid mismatch {data['evidence_id']} != {eid}")

def validate_metrics(p, eid):
    data = json.loads(p.read_text())
    req = ["evidence_id", "metrics"]
    missing = [f for f in req if f not in data]
    if missing: raise Exception(f"{p}: missing fields {missing}")
    if data["evidence_id"] != eid: raise Exception(f"{p}: eid mismatch {data['evidence_id']} != {eid}")

def validate_stamp(p, eid):
    data = json.loads(p.read_text())
    req = ["evidence_id", "generated_at_utc"]
    missing = [f for f in req if f not in data]
    if missing: raise Exception(f"{p}: missing fields {missing}")
    if data["evidence_id"] != eid: raise Exception(f"{p}: eid mismatch {data['evidence_id']} != {eid}")

idx_path = pathlib.Path("evidence/index.json")
if not idx_path.exists():
    print("missing evidence/index.json", file=sys.stderr); sys.exit(1)

try:
    idx = json.loads(idx_path.read_text())
    if "version" not in idx or "evidence" not in idx:
        raise Exception("index missing version or evidence")

    for eid, paths in idx["evidence"].items():
        validate_report(pathlib.Path(paths["report"]), eid)
        validate_metrics(pathlib.Path(paths["metrics"]), eid)
        validate_stamp(pathlib.Path(paths["stamp"]), eid)

    print("ok: evidence index and all artifacts validated")
except Exception as e:
    print(f"Validation failed: {e}", file=sys.stderr)
    sys.exit(1)
PY
