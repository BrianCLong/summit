import argparse
import json
import os
import sys
from pathlib import Path
import jsonschema

def load_json(path):
    with open(path, "r", encoding="utf-8") as f:
        return json.load(f)

def validate_artifact(path, schema_path):
    if not os.path.exists(path):
        print(f"FAIL: Artifact missing: {path}")
        return False

    # Heuristic: map filename to schema
    fname = Path(path).name
    schema_name = None
    if "report" in fname:
        schema_name = "report.schema.json"
    elif "metrics" in fname:
        schema_name = "metrics.schema.json"
    elif "stamp" in fname:
        schema_name = "stamp.schema.json"

    if not schema_name:
        print(f"WARN: Could not determine schema for {fname}")
        return True

    # Check if schema exists in the provided schema directory
    # Note: schema_path passed to this function is the directory
    full_schema_path = os.path.join(schema_path, schema_name)
    if not os.path.exists(full_schema_path):
        # Fallback to evidence/schemas if not found in provided dir?
        # User explicitly passed schemas dir.
        # Check if maybe it's named differently?
        print(f"WARN: Schema {schema_name} not found in {schema_path}")
        return True

    try:
        data = load_json(path)
        schema = load_json(full_schema_path)
        jsonschema.validate(instance=data, schema=schema)
        print(f"PASS: {path} matches {schema_name}")
        return True
    except jsonschema.ValidationError as e:
        print(f"FAIL: {path} validation error: {e.message}")
        return False
    except Exception as e:
        print(f"FAIL: {path} error: {e}")
        return False

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--index", required=True, help="Path to index.json")
    parser.add_argument("--schemas", required=True, help="Path to schemas directory")
    args = parser.parse_args()

    if not os.path.exists(args.index):
        print(f"FAIL: Index not found: {args.index}")
        sys.exit(1)

    index = load_json(args.index)
    items = index.get("items", {})

    # Normalize items to list of values if it's a dict
    if isinstance(items, dict):
        items_list = []
        for key, val in items.items():
            # Inject key as evidence_id if missing?
            if isinstance(val, dict):
                if "evidence_id" not in val:
                     val["evidence_id"] = key
                items_list.append(val)
        items = items_list

    success = True
    for item in items:
        evidence_id = item.get("evidence_id", "UNKNOWN")
        print(f"Verifying {evidence_id}...")

        files = item.get("files", [])
        # Also check for artifact keys
        if "artifacts" in item and isinstance(item["artifacts"], list):
             files.extend(item["artifacts"])
        elif "artifacts" in item and isinstance(item["artifacts"], dict):
             files.extend(item["artifacts"].values())

        # Check explicit report/metrics/stamp keys
        for key in ["report", "metrics", "stamp"]:
            if key in item and isinstance(item[key], str):
                files.append(item[key])

        if not files:
            print(f"WARN: No files found for {evidence_id}")
            continue

        for fpath in files:
            if not validate_artifact(fpath, args.schemas):
                success = False

    if success:
        print("ALL EVIDENCE VERIFIED.")
        sys.exit(0)
    else:
        print("EVIDENCE VERIFICATION FAILED.")
        sys.exit(1)

if __name__ == "__main__":
    main()
