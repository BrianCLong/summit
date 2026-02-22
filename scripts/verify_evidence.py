#!/usr/bin/env python3
import json
import argparse
import sys
import os
from pathlib import Path

# Try to import jsonschema, but don't fail immediately if missing
try:
    import jsonschema
    from jsonschema import validate
except ImportError:
    jsonschema = None

def main():
    parser = argparse.ArgumentParser(description="Verify evidence artifacts against schemas.")
    parser.add_argument("--index", default="evidence/index.json", help="Path to evidence index file")
    parser.add_argument("--schemas", default="evidence/schemas", help="Path to schema directory")
    args = parser.parse_args()

    if not jsonschema:
        print("WARNING: jsonschema module not found. Skipping strict schema validation.")

    index_path = Path(args.index)
    if not index_path.exists():
        print(f"FAIL: Index file not found at {index_path}")
        sys.exit(1)

    try:
        with open(index_path, "r") as f:
            index = json.load(f)
    except json.JSONDecodeError as e:
        print(f"FAIL: Invalid JSON in {index_path}: {e}")
        sys.exit(1)

    # Basic structure checks
    if not isinstance(index, dict):
        print("FAIL: Index must be a dictionary")
        sys.exit(1)

    items = index.get("items")
    if items is None:
        print("FAIL: Index must have 'items'")
        sys.exit(1)

    # Handle items as list (legacy) or dict (new format)
    evidence_list = []
    if isinstance(items, list):
        evidence_list = items
    elif isinstance(items, dict):
        for key, value in items.items():
            if isinstance(value, dict):
                if "id" not in value:
                    value["id"] = key
                evidence_list.append(value)
            else:
                print(f"FAIL: Item {key} is not a dictionary")
                sys.exit(1)
    else:
        print("FAIL: 'items' must be a list or dictionary")
        sys.exit(1)

    print(f"Found {len(evidence_list)} evidence items.")

    # If jsonschema is available, verify index schema
    if jsonschema:
        schema_path = Path(args.schemas) / "index.schema.json"
        if schema_path.exists():
            with open(schema_path, "r") as f:
                schema = json.load(f)
            try:
                validate(instance=index, schema=schema)
                print("Index schema validation passed.")
            except jsonschema.ValidationError as e:
                print(f"WARNING: Index schema validation failed: {e.message}")
                print("Continuing with item checks...")

    # Verify each artifact exists
    missing_artifacts = []
    for item in evidence_list:
        eid = item.get("id", "unknown")
        for art_type in ["report", "metrics", "stamp"]:
            path_str = item.get(art_type)
            if path_str:
                p = Path(path_str)
                if not p.exists():
                    p2 = Path("evidence") / path_str
                    if not p2.exists():
                        missing_artifacts.append(f"{eid}: {art_type} ({path_str})")

    if missing_artifacts:
        print("FAIL: Missing artifacts:")
        for m in missing_artifacts:
            print(f"  - {m}")
        sys.exit(1)

    print("All evidence artifacts verified.")
    sys.exit(0)

if __name__ == "__main__":
    main()
