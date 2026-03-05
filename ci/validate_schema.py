#!/usr/bin/env python3
import json
import os
import re
import sys
from pathlib import Path


def fail(msg):
    print(f"FAIL: {msg}", file=sys.stderr)
    sys.exit(1)

def _validate_recursive(instance, schema, context, root_schema_dir):
    # Handle $ref (simplified)
    if "$ref" in schema:
        ref_path = root_schema_dir / schema["$ref"]
        with open(ref_path) as f:
            schema = json.load(f)

    ptype = schema.get("type")

    # Type checking
    if ptype == "string" and not isinstance(instance, str):
        fail(f"{context} must be string")
    elif ptype == "array" and not isinstance(instance, list):
        fail(f"{context} must be array")
    elif ptype == "object" and not isinstance(instance, dict):
        fail(f"{context} must be object")
    elif ptype == "number" and not isinstance(instance, (int, float)):
        fail(f"{context} must be number")
    elif ptype == "integer" and not isinstance(instance, int):
        fail(f"{context} must be integer")
    elif ptype == "boolean" and not isinstance(instance, bool):
        fail(f"{context} must be boolean")

    if isinstance(instance, dict):
        required = schema.get("required", [])
        for field in required:
            if field not in instance:
                fail(f"Missing required field '{field}' in {context}")

        props = schema.get("properties", {})
        for key, val in instance.items():
            if key in props:
                _validate_recursive(val, props[key], f"{context}.{key}", root_schema_dir)

            # enum check
            if key in props and "enum" in props[key]:
                if val not in props[key]["enum"]:
                    fail(f"Field '{key}' in {context} has invalid value '{val}'. Must be one of {props[key]['enum']}")

    elif isinstance(instance, list):
        if "items" in schema:
            item_schema = schema["items"]
            for idx, item in enumerate(instance):
                _validate_recursive(item, item_schema, f"{context}[{idx}]", root_schema_dir)

def main():
    if len(sys.argv) != 3:
        print("Usage: validate_schema.py <file> <schema>")
        sys.exit(1)

    data_path = Path(sys.argv[1])
    schema_path = Path(sys.argv[2])

    if not data_path.exists():
        fail(f"Data file not found: {data_path}")
    if not schema_path.exists():
        fail(f"Schema file not found: {schema_path}")

    with open(data_path) as f:
        data = json.load(f)
    with open(schema_path) as f:
        schema = json.load(f)

    _validate_recursive(data, schema, "root", schema_path.parent)
    print(f"Validation PASSED for {data_path}")

if __name__ == "__main__":
    main()
