import argparse
import json
import os
import sys
from jsonschema import validate, ValidationError

# Map file types to schema files
SCHEMA_MAP = {
    "report": "report.schema.json",
    "metrics": "metrics.schema.json",
    "stamp": "stamp.schema.json",
    "index": "index.schema.json",
}

SCHEMA_DIR = os.path.join(os.path.dirname(__file__), "schemas")

def load_schema(schema_name):
    schema_path = os.path.join(SCHEMA_DIR, schema_name)
    with open(schema_path, "r") as f:
        return json.load(f)

def validate_file(file_path, file_type=None):
    if file_type is None:
        # Try to deduce from filename
        filename = os.path.basename(file_path)
        if "report" in filename:
            file_type = "report"
        elif "metrics" in filename:
            file_type = "metrics"
        elif "stamp" in filename:
            file_type = "stamp"
        elif "index" in filename:
            file_type = "index"
        else:
            print(f"Error: Could not deduce file type for {filename}. Please specify --type.")
            return False

    if file_type not in SCHEMA_MAP:
        print(f"Error: Unknown file type '{file_type}'. Supported: {list(SCHEMA_MAP.keys())}")
        return False

    schema_file = SCHEMA_MAP[file_type]
    try:
        schema = load_schema(schema_file)
    except FileNotFoundError:
        print(f"Error: Schema file {schema_file} not found in {SCHEMA_DIR}.")
        return False

    try:
        with open(file_path, "r") as f:
            data = json.load(f)
    except json.JSONDecodeError as e:
        print(f"Error: Invalid JSON in {file_path}: {e}")
        return False

    try:
        validate(instance=data, schema=schema)
        print(f"SUCCESS: {file_path} is valid against {schema_file}.")
        return True
    except ValidationError as e:
        print(f"FAILURE: {file_path} failed validation against {schema_file}.")
        print(e.message)
        return False

def main():
    parser = argparse.ArgumentParser(description="Validate Summit IO Evidence JSON files.")
    parser.add_argument("files", nargs="+", help="Path to JSON files to validate")
    parser.add_argument("--type", choices=SCHEMA_MAP.keys(), help="Force file type (report, metrics, stamp, index)")

    args = parser.parse_args()

    success = True
    for file_path in args.files:
        if not validate_file(file_path, args.type):
            success = False

    if not success:
        sys.exit(1)

if __name__ == "__main__":
    main()
