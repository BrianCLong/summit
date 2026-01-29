#!/usr/bin/env python3
import json
import sys
import re
from pathlib import Path
try:
    import warnings
    warnings.filterwarnings("ignore", category=DeprecationWarning)
    from jsonschema import validate
except ImportError:
    print("jsonschema not found.")
    sys.exit(1)

def load_json(path):
    with open(path, 'r') as f:
        return json.load(f)

def check_pii(data, filename):
    pii_patterns = [r'email', r'phone', r'ssn', r'user_id', r'username', r'attribution', r'actor']
    # Added 'attribution' and 'actor' as per "Non-attributive by default" rule
    pii_regex = re.compile('|'.join(pii_patterns), re.IGNORECASE)

    if isinstance(data, dict):
        for k, v in data.items():
            if pii_regex.search(k):
                raise ValueError(f"Forbidden key '{k}' (PII or attribution) found in {filename}.")
            check_pii(v, filename)
    elif isinstance(data, list):
        for item in data:
            check_pii(item, filename)

def main():
    root = Path(".")
    evidence_dir = root / "evidence"
    cogdef_schema_path = root / "cogdef/schemas/scorecard.schema.json"

    if not cogdef_schema_path.exists():
        print("CogDef schema not found.")
        return 1

    cogdef_schema = load_json(cogdef_schema_path)

    from jsonschema import RefResolver
    schema_dir = cogdef_schema_path.parent.resolve()
    # Use file:// URI for local file resolution
    resolver = RefResolver(base_uri=f'file://{schema_dir}/', referrer=cogdef_schema)

    index_path = evidence_dir / "index.json"
    if not index_path.exists():
        print("Evidence index not found.")
        return 1

    try:
        index_data = load_json(index_path)
    except Exception as e:
        print(f"Failed to load index: {e}")
        return 1

    files_to_check = []

    if "evidence" in index_data:
        for item in index_data["evidence"]:
            if "COGDEF" in item.get("id", ""):
                files = item.get("files", {})
                if "metrics" in files:
                    files_to_check.append(files["metrics"])

    errors = 0
    for rel_path in files_to_check:
        path = root / rel_path
        if not path.exists():
            print(f"Warning: File {rel_path} not found.")
            continue

        print(f"Verifying CogDef metrics: {rel_path}")
        try:
            data = load_json(path)
            validate(instance=data, schema=cogdef_schema, resolver=resolver)
            check_pii(data, str(rel_path))
        except Exception as e:
            print(f"Error in {rel_path}: {e}")
            errors += 1

    if errors > 0:
        print(f"CogDef verification failed with {errors} errors.")
        return 1
    print("CogDef metrics verification passed.")
    return 0

if __name__ == "__main__":
    sys.exit(main())
