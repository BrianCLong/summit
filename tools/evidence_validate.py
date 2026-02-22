#!/usr/bin/env python3
import json
import sys
import pathlib

# Try to import jsonschema, but fall back gracefully if missing
# This allows the script to function in basic environments for index verification
try:
    import jsonschema
    HAS_JSONSCHEMA = True
except ImportError:
    HAS_JSONSCHEMA = False

def main() -> int:
    root = pathlib.Path("evidence/index.json")
    if not root.exists():
        print("Error: missing evidence/index.json")
        return 2

    try:
        idx = json.loads(root.read_text(encoding="utf-8"))
    except json.JSONDecodeError as e:
        print(f"Error: evidence/index.json is not valid JSON: {e}")
        return 2

    # Verify that 'evidence' key exists and is a list
    if "evidence" not in idx or not isinstance(idx["evidence"], list):
        print("Error: evidence/index.json missing 'evidence' list")
        return 2

    ok = True

    # 1. Check file existence
    print("Checking evidence file existence...")
    for ev in idx["evidence"]:
        ev_id = ev.get("id", "unknown")
        paths = ev.get("paths", {})
        if not paths:
             print(f"Warning: Evidence {ev_id} has no paths")
             continue

        for key, path_str in paths.items():
            if not pathlib.Path(path_str).exists():
                print(f"Error: missing {ev_id} {key}: {path_str}")
                ok = False
            else:
                print(f"  OK: {ev_id} {key} -> {path_str}")

    # 2. Validate schemas if jsonschema is available
    if HAS_JSONSCHEMA:
        print("\nValidating schemas...")
        schema_map = {
            "report": "evidence/schema/report.schema.json",
            "metrics": "evidence/schema/metrics.schema.json",
            "stamp": "evidence/schema/stamp.schema.json"
        }

        # Pre-load schemas
        schemas = {}
        for key, schema_path in schema_map.items():
             p = pathlib.Path(schema_path)
             if p.exists():
                 try:
                     schemas[key] = json.loads(p.read_text(encoding="utf-8"))
                 except Exception as e:
                     print(f"Warning: Could not load schema {schema_path}: {e}")

        for ev in idx["evidence"]:
            paths = ev.get("paths", {})
            for key, path_str in paths.items():
                if key in schemas and pathlib.Path(path_str).exists():
                     try:
                         data = json.loads(pathlib.Path(path_str).read_text(encoding="utf-8"))
                         jsonschema.validate(instance=data, schema=schemas[key])
                         print(f"  Valid: {path_str} matches {key} schema")
                     except jsonschema.ValidationError as e:
                         print(f"Error: {path_str} failed validation against {key} schema: {e.message}")
                         ok = False
                     except json.JSONDecodeError:
                         print(f"Error: {path_str} is not valid JSON")
                         ok = False
    else:
        print("\nSkipping schema validation (jsonschema not installed).")

    return 0 if ok else 1

if __name__ == "__main__":
    sys.exit(main())
