import json
import os
import sys
from jsonschema import validate, ValidationError

SCHEMAS = {
    "report": "schemas/people_thrive/report.schema.json",
    "metrics": "schemas/people_thrive/metrics.schema.json",
    "stamp": "schemas/people_thrive/stamp.schema.json"
}

def load_schema(schema_path):
    with open(schema_path) as f:
        return json.load(f)

def verify_schema(data_path, schema_type):
    if not os.path.exists(data_path):
        print(f"FAILED: File not found: {data_path}")
        return False

    schema_path = SCHEMAS.get(schema_type)
    if not schema_path:
        print(f"FAILED: Unknown schema type: {schema_type}")
        return False

    try:
        schema = load_schema(schema_path)
        with open(data_path) as f:
            data = json.load(f)
        validate(instance=data, schema=schema)
        print(f"PASSED: {data_path} validated against {schema_path}")
        return True
    except ValidationError as e:
        print(f"FAILED: Schema validation error for {data_path}: {e.message}")
        return False
    except Exception as e:
        print(f"FAILED: Error validating {data_path}: {e}")
        return False

if __name__ == "__main__":
    success = True
    # Default check for skeleton files
    targets = [
        ("evidence/people_thrive/report.json", "report"),
        ("evidence/people_thrive/metrics.json", "metrics"),
        ("evidence/people_thrive/stamp.json", "stamp")
    ]

    if len(sys.argv) == 3:
        targets = [(sys.argv[1], sys.argv[2])]

    for path, stype in targets:
        if not verify_schema(path, stype):
            success = False

    if success:
        sys.exit(0)
    else:
        sys.exit(1)
