#!/usr/bin/env bash
set -euo pipefail
ROOT_DIR=$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)
export ROOT_DIR="$ROOT_DIR"
python3 - <<'PY'
import json, os, sys
from pathlib import Path
from jsonschema import validate, ValidationError
ROOT_DIR = Path(os.environ["ROOT_DIR"])
EVIDENCE_DIR = ROOT_DIR / "evidence"
SCHEMA_DIR = EVIDENCE_DIR / "schemas"
with open(EVIDENCE_DIR / "index.json") as f: index = json.load(f)
ok = True
for evd_id, files in index.get("evidence", {}).items():
    print(f"Checking {evd_id}...")
    for key in ["report", "metrics", "stamp"]:
        rel_path = files.get(key)
        if not rel_path: continue
        file_path = ROOT_DIR / rel_path
        schema_path = SCHEMA_DIR / f"{key}.schema.json"
        with open(file_path) as f: instance = json.load(f)
        with open(schema_path) as f: schema = json.load(f)
        try: validate(instance=instance, schema=schema)
        except ValidationError as e:
            print(f"ERROR: {evd_id} {key} validation failed: {e.message}")
            ok = False
if ok: print("Evidence verification PASSED.")
sys.exit(0 if ok else 1)
PY
