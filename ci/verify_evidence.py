import json
import sys
import os
import re
from pathlib import Path

# Paths
ROOT = Path(__file__).resolve().parents[1]
EVID = ROOT / "evidence"
INDEX_PATH = EVID / "index.json"
SCHEMA_DIR = EVID / "schema"

def fail(msg):
    print(f"FAIL: {msg}")
    sys.exit(1)

def load_json(path):
    try:
        with open(path, "r") as f:
            return json.load(f)
    except Exception as e:
        fail(f"Could not read {path}: {e}")

def validate_schema(instance, schema_path):
    schema = load_json(schema_path)
    # Simple validation (required fields)
    for field in schema.get("required", []):
        if field not in instance:
            fail(f"Missing required field '{field}' in {instance} (schema: {schema_path})")
    # Properties check (primitive types)
    props = schema.get("properties", {})
    for k, v in instance.items():
        if k in props:
            ptype = props[k].get("type")
            if ptype == "string" and not isinstance(v, str):
                fail(f"Field '{k}' must be string")
            elif ptype == "object" and not isinstance(v, dict):
                fail(f"Field '{k}' must be object")
            elif ptype == "array" and not isinstance(v, list):
                fail(f"Field '{k}' must be array")

def check_timestamps(path):
    # Recursively check for timestamps in json files, excluding stamp.json
    # Timestamp regex: YYYY-MM-DD or ISO8601-ish
    # We look for typical JSON date strings
    TIMESTAMP_RE = re.compile(r'"\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}:\d{2}')

    IGNORE_FILES = {
        "provenance.json", "governance-bundle.json", "release_abort_events.json",
        "taxonomy.stamp.json", "compliance_report.json", "ga-evidence-manifest.json",
        "evidence-index.json", "index.json"
    }
    IGNORE_DIRS = {"schemas", "ecosystem", "jules", "project19", "governance", "azure-turin-v7", "ci", "context", "mcp", "mcp-apps", "runs", "runtime", "subsumption", "schema"}

    for root, _, files in os.walk(path):
        # Check ignore dirs
        parts = Path(root).parts
        if any(d in parts for d in IGNORE_DIRS):
            continue

        for fname in files:
            if not fname.endswith(".json"):
                continue
            if fname == "stamp.json":
                continue
            if fname in IGNORE_FILES:
                continue

            fpath = Path(root) / fname
            try:
                content = fpath.read_text()
                if TIMESTAMP_RE.search(content):
                    fail(f"Timestamp found in {fpath}. Timestamps only allowed in stamp.json")
            except Exception as e:
                print(f"WARN: Could not read {fpath}: {e}")

def main():
    print("Verifying evidence system...")
    if not INDEX_PATH.exists():
        fail("evidence/index.json missing")

    index = load_json(INDEX_PATH)
    items = index.get("items")
    if not isinstance(items, dict):
        fail("index.json 'items' must be an object")

    for evid, paths in items.items():
        if evid.startswith("EVD-vfgnn-"):
            print(f"Skipping legacy item {evid}")
            continue

        print(f"Verifying {evid}...")
        # Expect paths to be a dict of {report, metrics, stamp}
        if not isinstance(paths, dict):
             fail(f"Item {evid} in index must be a dict of paths")

        # Report
        rpath = ROOT / paths.get("report", "")
        if not rpath.exists():
            fail(f"Report not found for {evid}: {rpath}")
        validate_schema(load_json(rpath), SCHEMA_DIR / "report.schema.json")

        # Metrics
        mpath = ROOT / paths.get("metrics", "")
        if not mpath.exists():
            fail(f"Metrics not found for {evid}: {mpath}")
        validate_schema(load_json(mpath), SCHEMA_DIR / "metrics.schema.json")

        # Stamp
        spath = ROOT / paths.get("stamp", "")
        if not spath.exists():
            fail(f"Stamp not found for {evid}: {spath}")
        validate_schema(load_json(spath), SCHEMA_DIR / "stamp.schema.json")

    print("Checking for leaked timestamps...")
    check_timestamps(EVID)

    print("PASSED: Evidence verification")

if __name__ == "__main__":
    main()
