import json
import sys
import argparse
import jsonschema
from typing import Dict, Any

def validate_spec(spec_path: str, schema_path: str) -> bool:
    with open(spec_path, 'r') as f:
        spec = json.load(f)
    with open(schema_path, 'r') as f:
        schema = json.load(f)

    try:
        jsonschema.validate(instance=spec, schema=schema)
        print(f"SUCCESS: {spec_path} is valid.")
        return True
    except jsonschema.exceptions.ValidationError as e:
        print(f"FAILURE: {spec_path} is invalid. Reason: {e.message}")
        return False

def main():
    parser = argparse.ArgumentParser(description="Validate ArchitectureSpec JSON.")
    parser.add_argument("spec", help="Path to ArchitectureSpec JSON file")
    parser.add_argument("--schema", default="schemas/archsim/architecture_spec_v1.schema.json", help="Path to schema file")

    args = parser.parse_args()

    if not validate_spec(args.spec, args.schema):
        sys.exit(1)

if __name__ == "__main__":
    main()
