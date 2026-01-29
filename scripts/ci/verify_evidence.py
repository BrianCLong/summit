#!/usr/bin/env python3
import json
import sys
import re
import os
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
if "SUMMIT_EVIDENCE_ROOT" in os.environ:
    EVID = Path(os.environ["SUMMIT_EVIDENCE_ROOT"])
    # Adjust ROOT to be parent of evidence dir if using override,
    # or keep it as repo root?
    # The script uses ROOT / path. Paths in index are usually relative to repo root.
    # If we override EVID, we probably are testing in isolation.
    # So we should probably treat EVID.parent as ROOT.
    ROOT = EVID.parent
else:
    EVID = ROOT / "evidence"

SCHEMAS = EVID / "schemas"

def fail(msg):
    print(f"FAIL: {msg}", file=sys.stderr)
    sys.exit(1)

def load_json(p):
    try:
        return json.loads(p.read_text(encoding="utf-8"))
    except Exception as e:
        fail(f"Could not read/parse {p}: {e}")

def validate_schema(instance, schema_path, context=""):
    schema = load_json(schema_path)

    # Required fields
    required = schema.get("required", [])
    for field in required:
        if field not in instance:
            fail(f"Missing required field '{field}' in {context}")

    # Top-level types
    props = schema.get("properties", {})
    for key, val in instance.items():
        if key in props:
            ptype = props[key].get("type")
            if ptype == "string" and not isinstance(val, str):
                fail(f"Field '{key}' in {context} must be string")
            elif ptype == "array" and not isinstance(val, list):
                fail(f"Field '{key}' in {context} must be array")
            elif ptype == "object" and not isinstance(val, dict):
                fail(f"Field '{key}' in {context} must be object")
            elif ptype == "integer" and not isinstance(val, int):
                fail(f"Field '{key}' in {context} must be integer")
            elif ptype == "number" and not isinstance(val, (int, float)):
                fail(f"Field '{key}' in {context} must be number")

            # Pattern check
            pattern = props[key].get("pattern")
            if pattern and isinstance(val, str):
                if not re.match(pattern, val):
                     fail(f"Field '{key}' in {context} value '{val}' does not match pattern '{pattern}'")

def check_timestamps():
    forbidden = []
    IGNORE_FILES = {
        "provenance.json", "governance-bundle.json", "release_abort_events.json",
        "taxonomy.stamp.json", "compliance_report.json", "ga-evidence-manifest.json",
        "evidence-index.json", "index.json"
    }
    IGNORE_DIRS = {"schemas", "ecosystem", "jules", "project19", "governance", "azure-turin-v7", "ci", "context", "mcp", "mcp-apps", "runs", "runtime", "subsumption"}

    for p in EVID.rglob("*"):
        if p.name == "stamp.json" or p.is_dir() or p.suffix not in {".json", ".md", ".yml", ".yaml", ".jsonl"}:
            continue
        if p.name in IGNORE_FILES or any(d in p.parts for d in IGNORE_DIRS):
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

def main():
    index_path = EVID / "index.json"
    if not index_path.exists():
        fail("evidence/index.json missing")

    index = load_json(index_path)
    validate_schema(index, SCHEMAS / "index.schema.json", context="index.json")

    items = index.get("items", {})
    # Schema validation ensures items is object, but double check logic
    if not isinstance(items, dict):
         fail("index.json 'items' must be a dict") # Should be caught by schema validation theoretically but our validator is simple

    print(f"Verifying {len(items)} evidence items...")

    for evd_id, path in items.items():
        item_path = ROOT / path
        if not item_path.exists():
            fail(f"Evidence file not found: {item_path} (for {evd_id})")

        report = load_json(item_path)

        # Decide schema
        if "evd_id" in report:
             validate_schema(report, SCHEMAS / "report.schema.json", context=evd_id)
        elif "summary" in report and "artifacts" in report:
             validate_schema(report, SCHEMAS / "agentic_report.schema.json", context=evd_id)
        elif "claims" in report:
             pass # Legacy
        else:
             print(f"WARN: Unknown report format for {evd_id}")

        # Check artifacts if present
        artifacts = report.get("artifacts")
        if isinstance(artifacts, dict):
            for key, art_path in artifacts.items():
                if isinstance(art_path, str):
                    # Resolve path: try root-relative first, then report-relative
                    full_art_path = ROOT / art_path
                    if not full_art_path.exists():
                         full_art_path = item_path.parent / art_path

                    if not full_art_path.exists():
                        fail(f"Artifact {key} not found at {art_path} (referenced in {evd_id})")

                    # Validate against schema if known
                    if key == "metrics":
                        validate_schema(load_json(full_art_path), SCHEMAS / "metrics.schema.json", context=f"{evd_id} metrics")
                    elif key == "stamp":
                        validate_schema(load_json(full_art_path), SCHEMAS / "stamp.schema.json", context=f"{evd_id} stamp")

    check_timestamps()
    print("OK: Evidence verified")

if __name__ == "__main__":
    main()
