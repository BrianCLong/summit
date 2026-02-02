#!/usr/bin/env python3
import json
import os
import re
import sys
from pathlib import Path
from jsonschema import validate

ROOT = Path(__file__).resolve().parents[2]
if "SUMMIT_EVIDENCE_ROOT" in os.environ:
    EVID = Path(os.environ["SUMMIT_EVIDENCE_ROOT"])
    ROOT = EVID.parent # Assumption for relative paths
else:
    EVID = ROOT / "evidence"

SCHEMAS = EVID / "schemas"
# For subagent harness, we might use a different schema path
HARNESS_SCHEMAS = ROOT / "evidence" / "schema"

def fail(msg):
    print(f"evidence-verify: FAIL: {msg}", file=sys.stderr)
    sys.exit(1)

def load_json(p):
    try:
        return json.loads(p.read_text(encoding="utf-8"))
    except Exception as e:
        fail(f"Could not read/parse {p}: {e}")

def validate_schema(instance, schema_path, context=""):
    if not schema_path.exists():
        # Fallback to harness schemas if not found in standard schemas
        harness_schema_path = HARNESS_SCHEMAS / schema_path.name
        if harness_schema_path.exists():
            schema_path = harness_schema_path
        else:
            fail(f"Schema not found: {schema_path}")

    schema = load_json(schema_path)
    try:
        validate(instance=instance, schema=schema)
    except Exception as e:
        fail(f"Schema validation FAILED for {context}: {e}")

def check_timestamps(evid_dir: Path):
    # Determinism rule: timestamps ONLY in stamp.json
    forbidden = []
    # Heuristic: ISO 8601 pattern
    iso_pattern = r'\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}'

    for p in evid_dir.rglob("*.json"):
        if not p.is_file():
            continue
        if p.name == "stamp.json":
            continue
        # Skip schemas and index files
        if "schema" in p.name or p.name == "index.json":
            continue

        try:
            txt = p.read_text(encoding="utf-8", errors="ignore")
            if re.search(iso_pattern, txt):
                 forbidden.append(str(p.relative_to(ROOT)))
        except Exception:
            continue

    if forbidden:
        fail(f"Possible timestamps found outside stamp.json in: {forbidden}")

def main():
    target_dir = EVID
    if len(sys.argv) > 1:
        target_dir = Path(sys.argv[1])
        if not target_dir.is_absolute():
            target_dir = ROOT / target_dir

    print(f"Verifying evidence in {target_dir}")

    # 1. Verify index.json existence
    index_path = target_dir / "index.json"
    if not index_path.exists():
        fail(f"index.json missing in {target_dir}")

    index = load_json(index_path)

    items = []
    if "items" in index:
        if isinstance(index["items"], list):
            items = index["items"]
        elif isinstance(index["items"], dict):
            for evd_id, data in index["items"].items():
                item = {"evidence_id": evd_id}
                if isinstance(data, list):
                    item["files"] = data
                elif isinstance(data, dict):
                    item.update(data)
                items.append(item)
    elif "evidence" in index and isinstance(index["evidence"], dict):
        for evd_id, data in index["evidence"].items():
            item = data.copy()
            item["evidence_id"] = evd_id
            # Convert report/metrics/stamp paths to list of files
            files = []
            if "report" in item: files.append(item["report"])
            if "metrics" in item: files.append(item["metrics"])
            if "stamp" in item: files.append(item["stamp"])
            item["files"] = files
            items.append(item)
    else:
        fail("index.json must have 'items' (list or dict) or 'evidence' object")

    print(f"Found {len(items)} items in index.")

    for item in items:
        # Support both 'files', 'paths', 'artifacts'
        files = item.get("files", item.get("paths", item.get("artifacts", [])))
        evd_id = item.get("evidence_id")

        if not evd_id:
            fail(f"Item in index missing evidence_id: {item}")

        print(f"Verifying {evd_id}...")

        for fpath_str in files:
            fpath = Path(fpath_str)
            if not fpath.is_absolute():
                fpath = ROOT / fpath_str

            if not fpath.exists():
                # Try relative to index.json
                fpath = index_path.parent / Path(fpath_str).name
                if not fpath.exists():
                    fail(f"File referenced in index not found: {fpath_str}")

            # Validate schema based on filename
            fname = fpath.name
            if fname == "report.json":
                validate_schema(load_json(fpath), SCHEMAS / "report.schema.json", context=f"{evd_id} report")
            elif fname == "metrics.json":
                validate_schema(load_json(fpath), SCHEMAS / "metrics.schema.json", context=f"{evd_id} metrics")
            elif fname == "stamp.json":
                validate_schema(load_json(fpath), SCHEMAS / "stamp.schema.json", context=f"{evd_id} stamp")

    # 2. Check for timestamps
    check_timestamps(target_dir)

    print("evidence-verify: PASS")

if __name__ == "__main__":
    main()
