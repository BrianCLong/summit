#!/usr/bin/env python3
import json
import os
import sys
from jsonschema import validate, ValidationError

SCHEMA_PATH = "control_plane/agents/manifest.schema.json"
DEFAULT_MANIFEST_DIRS = ["agents/"]

def validate_manifest(file_path, schema):
    with open(file_path, 'r') as f:
        try:
            instance = json.load(f)
            validate(instance=instance, schema=schema)
            print(f"✓ {file_path} is valid.")
            return True
        except json.JSONDecodeError:
            print(f"✗ {file_path} is not valid JSON.")
            return False
        except ValidationError as e:
            print(f"✗ {file_path} failed validation: {e.message}")
            return False
        except Exception as e:
            print(f"✗ {file_path} unexpected error: {e}")
            return False

def main():
    if not os.path.exists(SCHEMA_PATH):
        print(f"Schema not found at {SCHEMA_PATH}")
        sys.exit(1)

    with open(SCHEMA_PATH, 'r') as f:
        schema = json.load(f)

    success = True
    # In a real environment, we'd look in registry storage and standard agent folders
    search_dirs = DEFAULT_MANIFEST_DIRS

    found_any = False
    for s_dir in search_dirs:
        if os.path.exists(s_dir):
            for filename in os.listdir(s_dir):
                if filename.endswith(".json") and not filename.endswith(".schema.json"):
                    found_any = True
                    if not validate_manifest(os.path.join(s_dir, filename), schema):
                        success = False

    if not found_any:
        print("No manifests found to validate.")
    elif success:
        print("All manifests validated successfully.")
    else:
        print("Some manifests failed validation.")
        sys.exit(1)

if __name__ == "__main__":
    main()
