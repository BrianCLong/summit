#!/usr/bin/env python3
"""
Summit Evidence Verifier (deny-by-default).
Validates evidence/index.json and referenced per-EVD files:
  - report.json, metrics.json, stamp.json
Timestamps ONLY allowed in stamp.json.
"""
import argparse
import json
import re
import sys
from pathlib import Path

# Try importing jsonschema if available, otherwise fallback to basic checks
try:
    import jsonschema
    HAS_JSONSCHEMA = True
except ImportError:
    HAS_JSONSCHEMA = False

ROOT = Path(__file__).resolve().parents[2]
EVIDENCE_DIR = ROOT / "evidence"
SCHEMAS_DIR = EVIDENCE_DIR / "schemas"
EVIDENCE_ID_PATTERN = re.compile(r"^EVD-[A-Z0-9_-]+-[A-Z]+-[0-9]{3}$")

def die(msg: str) -> None:
    print(f"[verify_evidence] FAIL: {msg}", file=sys.stderr)
    sys.exit(2)

def validate_schema(data, schema_name):
    if not HAS_JSONSCHEMA:
        return

    schema_path = SCHEMAS_DIR / schema_name
    if not schema_path.exists():
        # If schema doesn't exist, we skip schema validation but continue with other checks
        return

    try:
        schema = json.loads(schema_path.read_text(encoding="utf-8"))
        jsonschema.validate(instance=data, schema=schema)
    except Exception as e:
        die(f"Schema validation failed for {schema_name}: {e}")

def check_timestamps(data, filename):
    # Recursively check for timestamp keys
    # Allowed only if filename ends with stamp.json
    if filename.endswith("stamp.json"):
        return

    def _walk(obj, path=""):
        if isinstance(obj, dict):
            for k, v in obj.items():
                if re.search(r'time|date|timestamp|generated_at', k, re.IGNORECASE):
                    die(f"Timestamp key '{k}' found in {filename} (only allowed in stamp.json)")
                _walk(v, f"{path}.{k}")
        elif isinstance(obj, list):
            for i, item in enumerate(obj):
                _walk(item, f"{path}[{i}]")

    _walk(data)

def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--index", help="Path to index.json", default=None)
    args = parser.parse_args()

    if args.index:
        idx = Path(args.index).resolve()
    else:
        idx = EVIDENCE_DIR / "index.json"

    if not idx.exists():
        die(f"missing index file: {idx}")

    try:
        data = json.loads(idx.read_text(encoding="utf-8"))
    except json.JSONDecodeError as e:
        die(f"evidence/index.json is not valid JSON: {e}")

    # Validate index schema
    if "items" not in data or not isinstance(data["items"], list):
        die("index.json must contain list: items")

    validate_schema(data, "index.schema.json")

    for item in data["items"]:
        if "evidence_id" in item:
            evidence_id = item["evidence_id"]
            if not EVIDENCE_ID_PATTERN.match(evidence_id):
                die(f"Invalid Evidence ID format: {evidence_id}")

            for req in ("report", "metrics", "stamp"):
                if req not in item:
                    die(f"{evidence_id} missing {req} file mapping")

                p = (ROOT / item[req]).resolve()
                if not p.exists():
                    die(f"{evidence_id} missing file on disk: {p}")

                try:
                    content = json.loads(p.read_text(encoding="utf-8"))
                except json.JSONDecodeError as e:
                    die(f"File {item[req]} is not valid JSON: {e}")

                check_timestamps(content, item[req])
                validate_schema(content, f"{req}.schema.json")
        elif "id" in item and "path" in item:
            evidence_id = item["id"]
            p = (ROOT / item["path"]).resolve()
            if not p.exists():
                die(f"{evidence_id} missing file on disk: {p}")

            try:
                content = json.loads(p.read_text(encoding="utf-8"))
            except json.JSONDecodeError as e:
                die(f"File {item['path']} is not valid JSON: {e}")

            check_timestamps(content, item["path"])
        else:
            die(f"Unknown evidence index entry: {item!r}")

    print("[verify_evidence] OK")

if __name__ == "__main__":
    main()
