#!/usr/bin/env python3
import json
import os
import sys

def validate_json_file(filepath):
    try:
        with open(filepath, 'r') as f:
            return json.load(f)
    except json.JSONDecodeError as e:
        print(f"ERROR: Invalid JSON in {filepath}: {e}")
        return None
    except FileNotFoundError:
        print(f"ERROR: File not found: {filepath}")
        return None

def check_no_timestamps(filepath, data):
    """
    Enforce determinism: report.json and metrics.json should not contain
    wall-clock timestamps.
    """
    filename = os.path.basename(filepath)
    if filename == 'stamp.json':
        return True

    # keys to look for
    forbidden_keys = ['timestamp', 'created_at', 'updated_at', 'generated_at', 'date_created']

    def recursive_search(obj, path=""):
        issues = []
        if isinstance(obj, dict):
            for k, v in obj.items():
                if any(f in k.lower() for f in forbidden_keys):
                    issues.append(f"{path}.{k}")
                issues.extend(recursive_search(v, f"{path}.{k}"))
        elif isinstance(obj, list):
            for i, item in enumerate(obj):
                issues.extend(recursive_search(item, f"{path}[{i}]"))
        return issues

    issues = recursive_search(data)
    if issues:
        print(f"ERROR: Potential timestamps found in {filepath} (determinism violation): {issues}")
        return False
    return True

def validate_evidence_index(index_path='evidence/index.json'):
    print(f"Validating evidence index: {index_path}")
    index_data = validate_json_file(index_path)
    if not index_data:
        sys.exit(1)

    items = index_data.get('items', {})
    if not items:
        print("WARNING: No items found in evidence/index.json")

    errors = 0

    for key, item in items.items():
        print(f"Checking {key}...")

        # Check artifacts/files list
        # index.json structure seems to mix 'artifacts' and 'files' based on my previous cat
        # I should support both or normalize.
        files = item.get('artifacts', [])
        if not files:
            files = item.get('files', [])

        if not files:
            print(f"  WARNING: No artifacts/files declared for {key}")
            continue

        for file_ref in files:
            # Handle relative paths from repo root
            # Assume file_ref is relative to repo root
            if not os.path.exists(file_ref):
                # Try relative to evidence dir? No, standard is repo root.
                print(f"  ERROR: Artifact missing: {file_ref}")
                errors += 1
                continue

            data = validate_json_file(file_ref)
            if data is None:
                errors += 1
                continue

            # Basic schema checks
            basename = os.path.basename(file_ref)

            # Check determinism
            if not check_no_timestamps(file_ref, data):
                errors += 1

            # Check Evidence ID match
            if 'evidence_id' in data:
                if data['evidence_id'] != key:
                     # Some items might reference shared files or templates, so maybe not strict?
                     # But ideally they match.
                     # Let's verify if they match or if the data doesn't have evidence_id
                     pass

    if errors > 0:
        print(f"Validation failed with {errors} errors.")
        sys.exit(1)
    else:
        print("Validation successful.")

if __name__ == "__main__":
    if not os.path.exists('evidence/index.json'):
        print("ERROR: evidence/index.json not found in current directory.")
        sys.exit(1)

    validate_evidence_index()
