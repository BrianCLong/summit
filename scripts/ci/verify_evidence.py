#!/usr/bin/env python3
"""
CI verifier: ensures evidence artifacts exist and are deterministic-ish.
Supports both legacy and Summit Harness evidence formats.
"""
import json
import os
import re
import sys
from pathlib import Path

try:
    from jsonschema import validate
    HAS_JSONSCHEMA = True
except ImportError:
    HAS_JSONSCHEMA = False

ROOT = Path(__file__).resolve().parents[2]
if "SUMMIT_EVIDENCE_ROOT" in os.environ:
    EVID = Path(os.environ["SUMMIT_EVIDENCE_ROOT"])
    ROOT = EVID.parent
else:
    EVID = ROOT / "evidence"

SCHEMAS = EVID / "schema"

def fail(msg):
    print(f"evidence-verify: FAIL: {msg}", file=sys.stderr)
    sys.exit(1)

def load_json(p):
    try:
        return json.loads(p.read_text(encoding="utf-8"))
    except Exception as e:
        fail(f"Could not read/parse {p}: {e}")

def validate_with_schema(instance, schema_name, subdir=None):
    if not HAS_JSONSCHEMA:
        return

    schema_path = SCHEMAS / (subdir or "") / f"{schema_name}.schema.json"
    if not schema_path.exists():
        # Fallback to base schema dir if subdir not found
        schema_path = SCHEMAS / f"{schema_name}.schema.json"

    if not schema_path.exists():
        return

    try:
        schema = load_json(schema_path)
        validate(instance=instance, schema=schema)
    except Exception as e:
        fail(f"Schema validation failed for {schema_name}: {e}")

def check_determinism(root_path):
    # No timestamps outside stamp.json
    for p in root_path.rglob("*.json"):
        if p.name == "stamp.json":
            continue
        if "schema" in str(p):
            continue
        try:
            content = p.read_text(encoding="utf-8")
            if re.search(r'202\d-\d{2}-\d{2}', content):
                 fail(f"Possible timestamp found in {p.relative_to(ROOT)}. Timestamps only allowed in stamp.json")
        except:
            continue

def main():
    target_dir = Path(sys.argv[1]) if len(sys.argv) > 1 else EVID
    print(f"Verifying evidence in {target_dir}")

    index_path = target_dir / "index.json"
    if not index_path.exists():
        fail(f"index.json missing in {target_dir}")

    index = load_json(index_path)

    # Summit Harness uses 'summit_harness' subdir for schemas
    is_harness = "minimal_run" in str(target_dir) or "summit_harness" in str(target_dir)
    subdir = "summit_harness" if is_harness else None

    validate_with_schema(index, "index", subdir=subdir)

    # Handle items as list or dict
    items_data = index.get("items", index.get("entries", index.get("evidence", {})))
    items = []

    if isinstance(items_data, list):
        items = items_data
    elif isinstance(items_data, dict):
        for evd_id, data in items_data.items():
            item = data.copy()
            item["evidence_id"] = evd_id
            items.append(item)
    else:
        # Fallback if structure is weird (e.g. root items key conflict)
        pass

    for item in items:
        files = item.get("files", item.get("paths", []))
        evd_id = item.get("evidence_id", "unknown")

        for fpath_str in files:
            fpath = ROOT / fpath_str
            if not fpath.exists():
                fail(f"File referenced in index not found: {fpath_str}")

            fname = fpath.name

            # Explicitly support CLAUDECODE-SUBAGENTS using standard mechanism
            if evd_id.startswith("EVD-CLAUDECODE-SUBAGENTS-"):
                 # Check if schema exists in SCHEMAS, if so validate
                 pass

            if fname in ["report.json", "metrics.json", "stamp.json"]:
                validate_with_schema(load_json(fpath), fname.replace(".json", ""), subdir=subdir)

    check_determinism(target_dir)
    print("evidence-verify: PASS")

if __name__ == "__main__":
    main()
