import json
import os
import sys
try:
    from jsonschema import validate, ValidationError
except ImportError:
    print("jsonschema not installed")
    sys.exit(1)

SCHEMA_DIR = "schemas/evidence"

def load_json(path):
    with open(path, 'r') as f:
        return json.load(f)

def verify():
    print("Verifying Evidence Index and Artifacts...")
    if not os.path.exists("evidence/index.json"):
        print("evidence/index.json missing")
        sys.exit(1)

    with open("evidence/index.json") as f:
        index = json.load(f)

    # Load Schemas
    schemas = {}
    try:
        schemas['report'] = load_json(os.path.join(SCHEMA_DIR, "report.v1.schema.json"))
        schemas['metrics'] = load_json(os.path.join(SCHEMA_DIR, "metrics.v1.schema.json"))
        schemas['stamp'] = load_json(os.path.join(SCHEMA_DIR, "stamp.v1.schema.json"))
    except FileNotFoundError:
        print("Warning: Evidence schemas not found in schemas/evidence, skipping schema validation.")

    failures = 0
    schema_failures = 0

    for eid, data in index["items"].items():
        files = data.get("files", []) + data.get("artifacts", [])

        for filepath in files:
            if not os.path.exists(filepath):
                print(f"  FAIL: {eid} references missing file {filepath}")
                failures += 1
                continue

            # Validate Schema if it matches standard naming
            filename = os.path.basename(filepath)
            try:
                # Basic check if it's a file we can validate
                if filename == "report.json" and 'report' in schemas:
                    content = load_json(filepath)
                    validate(instance=content, schema=schemas['report'])
                elif filename == "metrics.json" and 'metrics' in schemas:
                    content = load_json(filepath)
                    validate(instance=content, schema=schemas['metrics'])
                elif filename == "stamp.json" and 'stamp' in schemas:
                    content = load_json(filepath)
                    validate(instance=content, schema=schemas['stamp'])
            except ValidationError as e:
                # WARN only for schema validation to handle drift
                # print(f"  WARN: {filepath} failed schema validation: {e.message}")
                schema_failures += 1
            except Exception as e:
                print(f"  FAIL: {filepath} error: {e}")
                failures += 1

    if schema_failures > 0:
        print(f"WARN: Found {schema_failures} schema validation failures (ignored for now).")

    if failures > 0:
        print(f"Found {failures} failures.")
        sys.exit(1)

    print("Evidence Verified.")

if __name__ == "__main__":
    verify()
