#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR=$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)
EVIDENCE_DIR="$ROOT_DIR/evidence"
SCHEMA_DIR="$EVIDENCE_DIR/schemas"

require_file() {
  if [[ ! -f "$1" ]]; then
    echo "[evidence] missing required file: $1" >&2
    exit 1
  fi
}

require_file "$EVIDENCE_DIR/index.json"
require_file "$EVIDENCE_DIR/report.json"
require_file "$EVIDENCE_DIR/metrics.json"
require_file "$EVIDENCE_DIR/stamp.json"
require_file "$SCHEMA_DIR/report.schema.json"
require_file "$SCHEMA_DIR/metrics.schema.json"
require_file "$SCHEMA_DIR/stamp.schema.json"

jq -e . "$EVIDENCE_DIR/index.json" >/dev/null
jq -e . "$EVIDENCE_DIR/report.json" >/dev/null
jq -e . "$EVIDENCE_DIR/metrics.json" >/dev/null
jq -e . "$EVIDENCE_DIR/stamp.json" >/dev/null

ROOT_DIR="$ROOT_DIR" python3 - <<'PY'
import json
import sys
from pathlib import Path
import os

try:
    from jsonschema import Draft202012Validator
except ImportError as exc:
    print(f"[evidence] jsonschema not available: {exc}", file=sys.stderr)
    sys.exit(2)

root = Path(os.environ["ROOT_DIR"]).resolve()

def load(path):
    return json.loads(Path(path).read_text(encoding="utf-8"))

def validate(instance_path, schema_path):
    instance = load(instance_path)
    schema = load(schema_path)
    validator = Draft202012Validator(schema)
    errors = sorted(validator.iter_errors(instance), key=lambda e: e.path)
    if errors:
        for error in errors:
            location = ".".join([str(p) for p in error.path]) or "<root>"
            print(f"[evidence] {instance_path} {location}: {error.message}")
        return False
    print(f"[evidence] OK: {instance_path}")
    return True

checks = [
    (root / "evidence" / "report.json", root / "evidence" / "schemas" / "report.schema.json"),
    (root / "evidence" / "metrics.json", root / "evidence" / "schemas" / "metrics.schema.json"),
    (root / "evidence" / "stamp.json", root / "evidence" / "schemas" / "stamp.schema.json"),
]

ok = True
for instance_path, schema_path in checks:
    ok = validate(instance_path, schema_path) and ok

sys.exit(0 if ok else 1)
PY
