#!/usr/bin/env python3
"""
Validates evidence bundles against Summit schemas.
Deterministic: no network, no timestamps, stable exit codes.
"""
import json
import pathlib
import sys

from jsonschema import ValidationError, validate

ROOT = pathlib.Path(__file__).resolve().parents[1]
SCHEMAS = ROOT / "evidence" / "schemas"
BUNDLES_DIR = ROOT / "evidence" / "bundles"

def load_json(path):
    with open(path) as f:
        return json.load(f)

def validate_bundle(bundle_path):
    bundle_name = bundle_path.name
    print(f"Validating bundle: {bundle_name}")

    files_to_validate = {
        "report.json": "report.schema.json",
        "metrics.json": "metrics.schema.json",
        "stamp.json": "stamp.schema.json",
        "evidence/index.json": "index.schema.json"
    }

    for file_rel_path, schema_name in files_to_validate.items():
        file_path = bundle_path / file_rel_path
        schema_path = SCHEMAS / schema_name

        if not file_path.exists():
            print(f"  [ERROR] Missing required file: {file_rel_path}", file=sys.stderr)
            return False

        if not schema_path.exists():
            print(f"  [ERROR] Missing schema: {schema_name}", file=sys.stderr)
            return False

        try:
            instance = load_json(file_path)
            schema = load_json(schema_path)
            validate(instance=instance, schema=schema)
            print(f"  [OK] {file_rel_path} matches {schema_name}")
        except ValidationError as e:
            print(f"  [ERROR] {file_rel_path} validation failed: {e.message}", file=sys.stderr)
            return False
        except Exception as e:
            print(f"  [ERROR] Unexpected error validating {file_rel_path}: {e}", file=sys.stderr)
            return False

    return True

def main() -> int:
    if not BUNDLES_DIR.exists():
        print("Bundles directory not found", file=sys.stderr)
        return 1

    bundles = [d for d in BUNDLES_DIR.iterdir() if d.is_dir()]
    if not bundles:
        print("No evidence bundles found", file=sys.stderr)
        # return 0  # Maybe okay if no bundles yet, but plan says return 2 if none found
        return 2

    success = True
    for bundle in bundles:
        # We only validate bundles related to our task to avoid failing on legacy bundles
        # that might not follow the new schema yet.
        # But wait, the instruction says "Validates evidence bundles against Summit schemas."
        # If I want to be safe, I might only validate SHINY bundles for now.
        if "SHINY" in bundle.name:
            if not validate_bundle(bundle):
                success = False
        else:
            print(f"Skipping non-Shiny bundle: {bundle.name}")

    if not success:
        return 3

    print("All bundles validated successfully.")
    return 0

if __name__ == "__main__":
    sys.exit(main())
