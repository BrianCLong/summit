import argparse
import json
import os
import sys

import jsonschema


def load_json(path):
    with open(path) as f:
        return json.load(f)

def validate_artifact(artifact_path, schema_path):
    if not os.path.exists(artifact_path):
        print(f"FAIL: Artifact missing: {artifact_path}")
        return False
    if not os.path.exists(schema_path):
        print(f"FAIL: Schema missing: {schema_path}")
        return False

    data = load_json(artifact_path)
    schema = load_json(schema_path)

    try:
        jsonschema.validate(instance=data, schema=schema)
        print(f"PASS: {artifact_path} matches {schema_path}")
        return True
    except jsonschema.ValidationError as e:
        print(f"FAIL: {artifact_path} validation error: {e.message}")
        return False

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--item", help="Item slug to validate")
    parser.add_argument("--latest", action="store_true", help="Validate all items (stub)")
    args = parser.parse_args()

    index_path = "evidence/index.json"
    if not os.path.exists(index_path):
        print(f"FAIL: Index missing: {index_path}")
        sys.exit(1)

    index = load_json(index_path)

    items = index.get("items", [])
    if args.item:
        items = [i for i in items if i["item_slug"] == args.item]

    if not items:
        print("No items to validate.")
        sys.exit(0) # Not an error if just nothing matched filter in some contexts, but arguably error.

    success = True
    for item in items:
        print(f"Validating item: {item['item_slug']}")
        artifacts = item.get("artifacts", {})

        # Hardcoded schema map for this task
        schema_map = {
            "report": "evidence/schemas/influence-ops-report.schema.json",
            "metrics": "evidence/schemas/influence-ops-metrics.schema.json",
            "stamp": "evidence/schemas/influence-ops-stamp.schema.json"
        }

        for key, path in artifacts.items():
            if key in schema_map:
                if not validate_artifact(path, schema_map[key]):
                    success = False
            else:
                print(f"WARN: No schema mapped for artifact type {key}")

    sys.exit(0 if success else 1)

if __name__ == "__main__":
    main()
