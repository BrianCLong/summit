#!/usr/bin/env python3
import json
import argparse
import sys
import hashlib
import re
from pathlib import Path
from jsonschema import validate, ValidationError

TIMESTAMP_REGEX = re.compile(r'^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}')

def load_json(path):
    with open(path, 'r') as f:
        return json.load(f)

def validate_schema(data, schema_path):
    with open(schema_path, 'r') as f:
        schema = json.load(f)
    validate(instance=data, schema=schema)

def verify_hash(filepath, expected_hash):
    sha256 = hashlib.sha256()
    with open(filepath, 'rb') as f:
        while True:
            data = f.read(65536)
            if not data:
                break
            sha256.update(data)
    if sha256.hexdigest() != expected_hash:
        raise ValueError(f"Hash mismatch for {filepath}: expected {expected_hash}, got {sha256.hexdigest()}")

def scan_for_timestamps(data, path=""):
    """Recursively scan for timestamp-like strings."""
    if isinstance(data, dict):
        for k, v in data.items():
            scan_for_timestamps(v, f"{path}.{k}" if path else k)
    elif isinstance(data, list):
        for i, v in enumerate(data):
            scan_for_timestamps(v, f"{path}[{i}]")
    elif isinstance(data, str):
        if TIMESTAMP_REGEX.match(data):
            raise ValueError(f"Found timestamp in {path}: {data}. Timestamps are only allowed in stamp.json.")

def main():
    parser = argparse.ArgumentParser(description="Verify Summit Evidence Artifacts")
    parser.add_argument("--path", required=True, help="Path to evidence directory")
    parser.add_argument("--schemas", required=True, help="Path to schemas directory")
    args = parser.parse_args()

    evidence_dir = Path(args.path)
    schemas_dir = Path(args.schemas)

    if not evidence_dir.exists():
        print(f"Error: Evidence directory {evidence_dir} does not exist.")
        sys.exit(1)

    # 1. Validate index.json
    index_path = evidence_dir / "index.json"
    if not index_path.exists():
        print("Error: index.json not found.")
        sys.exit(1)

    try:
        index_data = load_json(index_path)
        validate_schema(index_data, schemas_dir / "index.schema.json")
    except Exception as e:
        print(f"Error validating index.json: {e}")
        sys.exit(1)

    # 2. Iterate items and validate
    for item in index_data["items"]:
        evd_id = item["evidence_id"]
        files = item["files"]
        hashes = item["sha256"]

        if len(files) != len(hashes):
            print(f"Error: Mismatch in files and hashes count for {evd_id}")
            sys.exit(1)

        # Check required files
        required_files = {"report.json", "metrics.json", "stamp.json"}
        file_set = set(files)
        missing_required = required_files - file_set
        if missing_required:
             print(f"Error: Missing required files for {evd_id}: {missing_required}")
             sys.exit(1)

        for fname, expected_hash in zip(files, hashes):
            fpath = evidence_dir / fname
            if not fpath.exists():
                print(f"Error: File {fname} not found for {evd_id}")
                sys.exit(1)

            # Verify hash
            try:
                verify_hash(fpath, expected_hash)
            except ValueError as e:
                print(f"Error: {e}")
                sys.exit(1)

            # Validate schema if applicable
            if fname == "report.json":
                try:
                    data = load_json(fpath)
                    validate_schema(data, schemas_dir / "report.schema.json")
                    # Scan for timestamps
                    scan_for_timestamps(data)
                except Exception as e:
                    print(f"Error validating {fname}: {e}")
                    sys.exit(1)
            elif fname == "metrics.json":
                try:
                    data = load_json(fpath)
                    validate_schema(data, schemas_dir / "metrics.schema.json")
                except Exception as e:
                    print(f"Error validating {fname}: {e}")
                    sys.exit(1)
            elif fname == "stamp.json":
                try:
                    data = load_json(fpath)
                    validate_schema(data, schemas_dir / "stamp.schema.json")
                except Exception as e:
                    print(f"Error validating {fname}: {e}")
                    sys.exit(1)

    print("Evidence verification passed.")

if __name__ == "__main__":
    main()
