import json
import argparse
import sys
from pathlib import Path

try:
    from jsonschema import validate, ValidationError
except ImportError:
    print("jsonschema not found. Please install it with 'pip install jsonschema'.")
    sys.exit(1)

SCHEMAS = {
    "report.json": "evidence/schema/report.schema.json",
    "metrics.json": "evidence/schema/metrics.schema.json",
    "stamp.json": "evidence/schema/stamp.schema.json",
}

def validate_file(file_path: Path):
    if not file_path.exists():
        print(f"Error: File {file_path} not found.")
        return False

    schema_path = None
    for pattern, s_path in SCHEMAS.items():
        if file_path.name.endswith(pattern):
            schema_path = Path(s_path)
            break

    if not schema_path:
        print(f"Error: No schema found for file {file_path.name}")
        return False

    if not schema_path.exists():
        print(f"Error: Schema file {schema_path} not found.")
        return False

    try:
        with open(file_path, 'r') as f:
            data = json.load(f)
        with open(schema_path, 'r') as f:
            schema = json.load(f)

        validate(instance=data, schema=schema)
        print(f"OK: {file_path} is valid against {schema_path}")
        return True
    except json.JSONDecodeError as e:
        print(f"Error decoding JSON in {file_path}: {e}")
        return False
    except ValidationError as e:
        print(f"Validation error in {file_path}: {e.message}")
        return False
    except Exception as e:
        print(f"Unexpected error validating {file_path}: {e}")
        return False

def main():
    parser = argparse.ArgumentParser(description="Validate evidence files against schemas.")
    parser.add_argument("files", nargs="+", help="Files to validate.")
    args = parser.parse_args()

    success = True
    for file in args.files:
        if not validate_file(Path(file)):
            success = False

    if not success:
        sys.exit(1)

if __name__ == "__main__":
    main()
