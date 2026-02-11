#!/usr/bin/env python3
import json
import os
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
if "SUMMIT_EVIDENCE_ROOT" in os.environ:
    EVID = Path(os.environ["SUMMIT_EVIDENCE_ROOT"])
    ROOT = EVID.parent # Assumption for relative paths
else:
    EVID = ROOT / "evidence"

SCHEMAS = EVID / "schemas"
NEW_SCHEMAS = EVID / "schema"

def fail(msg):
    print(f"evidence-verify: FAIL: {msg}", file=sys.stderr)
    sys.exit(1)

def load_json(p):
    try:
        return json.loads(p.read_text(encoding="utf-8"))
    except Exception as e:
        fail(f"Could not read/parse {p}: {e}")

def _validate_recursive(instance, schema, context):
    # Required fields
    required = schema.get("required", [])
    if isinstance(instance, dict):
        for field in required:
            if field not in instance:
                fail(f"Missing required field '{field}' in {context}")

        # Properties check
        props = schema.get("properties", {})
        additional_allowed = schema.get("additionalProperties", True)

        for key, val in instance.items():
            if key not in props and not additional_allowed:
                 fail(f"Unexpected field '{key}' in {context}")

            if key in props:
                prop_schema = props[key]
                ptype = prop_schema.get("type")

                # Type checking
                if ptype == "string" and not isinstance(val, str):
                    fail(f"Field '{key}' in {context} must be string")
                elif ptype == "array" and not isinstance(val, list):
                    fail(f"Field '{key}' in {context} must be array")
                elif ptype == "object" and not isinstance(val, dict):
                    fail(f"Field '{key}' in {context} must be object")
                elif ptype == "number" and not isinstance(val, (int, float)):
                    fail(f"Field '{key}' in {context} must be number")
                elif ptype == "integer" and not isinstance(val, int):
                    fail(f"Field '{key}' in {context} must be integer")

                # Pattern check
                pattern = prop_schema.get("pattern")
                if pattern and isinstance(val, str):
                    if not re.match(pattern, val):
                         fail(f"Field '{key}' in {context} value '{val}' does not match pattern '{pattern}'")

                # Recursion
                if ptype == "object" and "properties" in prop_schema:
                    _validate_recursive(val, prop_schema, f"{context}.{key}")
                elif ptype == "array" and "items" in prop_schema:
                    item_schema = prop_schema["items"]
                    for idx, item in enumerate(val):
                        # item_schema might be a type string or object
                        if isinstance(item_schema, dict):
                            _validate_recursive(item, item_schema, f"{context}.{key}[{idx}]")

def validate_schema(instance, schema_path, context=""):
    if not schema_path.exists():
        fail(f"Schema not found: {schema_path}")
    schema = load_json(schema_path)
    _validate_recursive(instance, schema, context)

def check_timestamps(evid_dir=None):
    # Determinism rule: timestamps ONLY in stamp.json
    scan_dir = evid_dir if evid_dir else EVID
    forbidden = []
    # Ignore specific files and dirs
    IGNORE_FILES = {
        "provenance.json", "governance-bundle.json", "release_abort_events.json",
        "taxonomy.stamp.json", "compliance_report.json", "ga-evidence-manifest.json",
        "evidence-index.json", "index.json", "index.schema.json", "report.schema.json",
        "metrics.schema.json", "stamp.schema.json", # Ignore schemas
        "acp_stamp.json", "skill_stamp.json"
    }
    IGNORE_DIRS = {
        "schemas", "ecosystem", "jules", "project19", "governance", "azure-turin-v7",
        "ci", "context", "mcp", "mcp-apps", "runs", "runtime", "subsumption",
        "EVD-POSTIZ-GATE-004", "EVD-POSTIZ-COMPLY-002", "EVD-POSTIZ-PROD-003", "EVD-POSTIZ-GROWTH-001"
    }

    for p in scan_dir.rglob("*"):
        if not p.is_file():
            continue
        if p.name == "stamp.json":
            continue
        if p.name in IGNORE_FILES:
            continue
        # Check if any parent part is in IGNORE_DIRS
        if any(part in IGNORE_DIRS for part in p.parts):
            continue
        if p.suffix not in {".json"}:
            continue

        try:
            txt = p.read_text(encoding="utf-8", errors="ignore")
            # Heuristic: YYYY-MM-DD
            if re.search(r'202\d-\d{2}-\d{2}', txt):
                 forbidden.append(str(p.relative_to(ROOT)))
        except Exception:
            continue

    if forbidden:
        fail(f"Possible timestamps found outside stamp.json in: {forbidden}")

def main(root_override=None):
    evid_dir = Path(root_override) if root_override else EVID
    print(f"Verifying evidence in {evid_dir}")

    # 1. Verify index.json existence
    index_path = evid_dir / "index.json"
    if not index_path.exists():
        fail("evidence/index.json missing")

    index = load_json(index_path)

    items = []
    if "items" in index and isinstance(index["items"], list):
        items = index["items"]
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
        fail("index.json must have 'items' list or 'evidence' object")

    print(f"Found {len(items)} items in index.")

    for item in items:
        # Support both 'files' (plan) and 'paths' (existing)
        files = item.get("files", item.get("paths", []))
        evd_id = item.get("evidence_id")

        if not evd_id:
            fail(f"Item in index missing evidence_id: {item}")

        print(f"Verifying {evd_id}...")

        for fpath_str in files:
            fpath = ROOT / fpath_str
            if not fpath.exists():
                fail(f"File referenced in index not found: {fpath_str}")

            # Validate schema based on filename
            fname = fpath.name
            if evd_id.startswith("EVD-CLAUDECODE-SUBAGENTS-"):
                schema_dir = NEW_SCHEMAS
            else:
                schema_dir = SCHEMAS

            if fname == "report.json":
                validate_schema(load_json(fpath), schema_dir / "report.schema.json", context=f"{evd_id} report")
            elif fname == "metrics.json":
                validate_schema(load_json(fpath), schema_dir / "metrics.schema.json", context=f"{evd_id} metrics")
            elif fname == "stamp.json":
                validate_schema(load_json(fpath), schema_dir / "stamp.schema.json", context=f"{evd_id} stamp")
            elif fname == "index.json" and schema_dir == NEW_SCHEMAS:
                 validate_schema(load_json(fpath), schema_dir / "index.schema.json", context=f"{evd_id} index")

    # 2. Check for timestamps
    check_timestamps(evid_dir)

    print("evidence-verify: PASS")

if __name__ == "__main__":
    main(sys.argv[1] if len(sys.argv) > 1 else None)
