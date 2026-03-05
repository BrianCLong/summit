import json
import os
import re
import sys


def validate_json(filepath, schema_path):
    # This function is a placeholder. In a real CI, we would use jsonschema.
    # For now, just checking valid JSON.
    try:
        with open(filepath) as f:
            json.load(f)
    except Exception as e:
        print(f"Error parsing {filepath}: {e}")
        return False
    return True

def check_timestamps(filepath):
    # Check for timestamps in files other than stamp.json
    if "stamp.json" in filepath:
        return True

    with open(filepath) as f:
        content = f.read()

    # Simple regex for ISO8601-like timestamps
    # 2024-01-01T... or similar
    timestamp_pattern = re.compile(r'\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}')
    if timestamp_pattern.search(content):
        print(f"FAIL: Timestamp found in {filepath}. Timestamps belong in stamp.json only.")
        return False
    return True

def main():
    # In a real scenario, this would scan the evidence directory
    # For this PR, we just check if the schemas themselves are valid JSON
    # and maybe check the example file.

    schemas_dir = "summit/evidence/schemas"
    schemas = [
        "step35flash_index.schema.json",
        "step35flash_report.schema.json",
        "step35flash_metrics.schema.json",
        "step35flash_stamp.schema.json"
    ]

    success = True
    for s in schemas:
        path = os.path.join(schemas_dir, s)
        if not os.path.exists(path):
            print(f"Missing schema: {path}")
            success = False
        else:
            if not validate_json(path, None):
                success = False
            else:
                print(f"Valid JSON: {path}")

    example_path = "summit/evidence/step35flash_index.example.json"
    if os.path.exists(example_path):
        if not validate_json(example_path, None):
            success = False
        if not check_timestamps(example_path):
            success = False

    if not success:
        sys.exit(1)
    print("All checks passed.")

if __name__ == "__main__":
    main()
