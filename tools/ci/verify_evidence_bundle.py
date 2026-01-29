import json
import os
import sys
import jsonschema

REPO_ROOT = os.getcwd()

def load_json(filepath):
    with open(filepath, 'r') as f:
        return json.load(f)

def validate_schema(instance, schema_path):
    schema = load_json(schema_path)
    jsonschema.validate(instance=instance, schema=schema)

def check_timestamp_locality(data, filename):
    # Recursively check for timestamp keys
    forbidden_keys = ['timestamp', 'created_at', 'date', 'generated_at']

    if isinstance(data, dict):
        for k, v in data.items():
            if k in forbidden_keys:
                print(f"ERROR: Forbidden timestamp key '{k}' found in {filename}")
                return False
            if not check_timestamp_locality(v, filename):
                return False
    elif isinstance(data, list):
        for item in data:
            if not check_timestamp_locality(item, filename):
                return False
    return True

def check_evidence_required(report_data, filename):
    if 'candidates' in report_data:
        for candidate in report_data['candidates']:
            if 'source_refs' not in candidate or len(candidate['source_refs']) < 1:
                print(f"ERROR: Candidate '{candidate.get('name', 'unknown')}' in {filename} missing source_refs")
                return False
    return True

def main():
    print("Verifying Evidence Bundle...")

    index_path = os.path.join(REPO_ROOT, 'evidence/index.json')
    if not os.path.exists(index_path):
        print(f"ERROR: {index_path} does not exist.")
        sys.exit(1)

    try:
        index_data = load_json(index_path)
        validate_schema(index_data, os.path.join(REPO_ROOT, 'evidence/schemas/index.schema.json'))
    except Exception as e:
        print(f"ERROR: evidence/index.json validation failed: {e}")
        sys.exit(1)

    print("Index validation passed.")

    for item in index_data.get('items', []):
        evidence_id = item.get('evidence_id')
        print(f"Checking item {evidence_id}...")

        # Check explicit paths if provided
        artifacts = {}
        if 'path' in item:
            artifacts['artifact'] = item['path']
        if 'report' in item:
            artifacts['report'] = item['report']
        if 'metrics' in item:
            artifacts['metrics'] = item['metrics']
        if 'stamp' in item:
            artifacts['stamp'] = item['stamp']

        for key, relative_path in artifacts.items():
            full_path = os.path.join(REPO_ROOT, relative_path)
            if not os.path.exists(full_path):
                print(f"ERROR: Artifact {relative_path} not found for {evidence_id}")
                sys.exit(1)

            try:
                data = load_json(full_path)

                # Determine schema
                schema_filename = f"{key}.schema.json" if key in ['report', 'metrics', 'stamp'] else None

                if schema_filename:
                    schema_path = os.path.join(REPO_ROOT, 'evidence/schemas', schema_filename)
                    if os.path.exists(schema_path):
                         validate_schema(data, schema_path)
                    else:
                        print(f"WARNING: Schema {schema_filename} not found, skipping schema validation.")

                # Specific checks
                if key == 'report':
                    if not check_timestamp_locality(data, relative_path):
                        sys.exit(1)
                    if not check_evidence_required(data, relative_path):
                        sys.exit(1)
                elif key == 'metrics':
                    if not check_timestamp_locality(data, relative_path):
                        sys.exit(1)
                elif key == 'stamp':
                    pass # Timestamp allowed

            except Exception as e:
                print(f"ERROR: Validation failed for {relative_path}: {e}")
                sys.exit(1)

    print("Evidence Bundle Verification Successful.")

if __name__ == "__main__":
    main()
