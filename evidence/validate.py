import json
import sys
import re
from pathlib import Path
import argparse

ROOT = Path(__file__).resolve().parents[1]

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
    # Basic validation: required fields
    required = schema.get("required", [])
    for field in required:
        if field not in instance:
            fail(f"Missing required field '{field}' in {context}")

    # Check types for top level properties (simplistic)
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

            # Pattern check
            pattern = props[key].get("pattern")
            if pattern and isinstance(val, str):
                if not re.match(pattern, val):
                     fail(f"Field '{key}' in {context} value '{val}' does not match pattern '{pattern}'")

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--latest", action="store_true", help="Check latest evidence only")
    args = parser.parse_args()

    index_path = ROOT / "evidence" / "index.json"
    if not index_path.exists():
        fail("evidence/index.json missing")

    index = load_json(index_path)
    # Validate index against schema
    validate_schema(index, ROOT / "evidence" / "schemas" / "index.schema.json", context="index.json")

    items = index.get("items", {})
    if not isinstance(items, dict):
        fail("index.json 'items' must be a dict")

    print(f"Index valid. {len(items)} items found.")

    for evd_id, path in items.items():
        # Check if path exists
        item_path = ROOT / path
        if not item_path.exists():
            fail(f"Evidence file not found: {item_path}")

        # Load evidence report
        report = load_json(item_path)

        # Determine which schema to use.
        if "evd_id" in report:
             validate_schema(report, ROOT / "evidence" / "schemas" / "report.schema.json", context=evd_id)
             print(f"Validated {evd_id} as Standard Report")
        elif "summary" in report and "artifacts" in report:
            validate_schema(report, ROOT / "evidence" / "schemas" / "agentic_report.schema.json", context=evd_id)
            print(f"Validated {evd_id} as Agentic Report")
        elif "claims" in report:
             print(f"Validated {evd_id} as Legacy Report")
        else:
             print(f"WARN: Unknown report format for {evd_id}")

    print("All evidence verified.")

if __name__ == "__main__":
    main()
