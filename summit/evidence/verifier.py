import argparse
import hashlib
import json
import os
import re
import sys

import jsonschema


def load_json(path):
    with open(path, encoding="utf-8") as f:
        return json.load(f)

def calculate_sha256(path):
    sha256_hash = hashlib.sha256()
    with open(path, "rb") as f:
        for byte_block in iter(lambda: f.read(4096), b""):
            sha256_hash.update(byte_block)
    return sha256_hash.hexdigest()

def validate_against_schema(data, schema_path):
    schema = load_json(schema_path)
    try:
        jsonschema.validate(instance=data, schema=schema)
        return True, ""
    except jsonschema.ValidationError as e:
        return False, e.message

def check_no_timestamps(path):
    """Simple regex scan for ISO-8601 in non-stamp files."""
    with open(path, encoding="utf-8") as f:
        content = f.read()
    # Very basic ISO-8601-like pattern: YYYY-MM-DDTHH:MM:SS
    pattern = r"\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}"
    matches = re.findall(pattern, content)
    return matches

def main():
    parser = argparse.ArgumentParser(description="Summit Evidence Verifier")
    parser.add_argument("index_path", help="Path to evidence index.json")
    parser.add_argument("--schemas", help="Directory containing schemas", default="summit/evidence/schemas")
    args = parser.parse_args()

    if not os.path.exists(args.index_path):
        print(f"ERROR: Index file not found at {args.index_path}")
        sys.exit(1)

    index = load_json(args.index_path)
    index_schema_path = os.path.join(args.schemas, "index.schema.json")

    ok, err = validate_against_schema(index, index_schema_path)
    if not ok:
        print(f"FAIL: Index schema validation failed: {err}")
        sys.exit(1)

    overall_success = True

    for item in index.get("items", []):
        evid_id = item["evidence_id"]
        print(f"Verifying {evid_id}...")

        artifacts = {
            "report": item["report"],
            "metrics": item["metrics"],
            "stamp": item["stamp"]
        }

        for art_type, path in artifacts.items():
            if not os.path.exists(path):
                print(f"  FAIL: {art_type} missing at {path}")
                overall_success = False
                continue

            # Validate against schema
            schema_file = f"{art_type}.schema.json"
            schema_path = os.path.join(args.schemas, schema_file)
            if os.path.exists(schema_path):
                art_data = load_json(path)
                ok, err = validate_against_schema(art_data, schema_path)
                if not ok:
                    print(f"  FAIL: {art_type} schema validation failed: {err}")
                    overall_success = False
                else:
                    print(f"  PASS: {art_type} schema validation")
            else:
                print(f"  WARN: Schema {schema_file} not found in {args.schemas}")

            # Check SHA256 if present in index
            if "sha256" in item and art_type in item["sha256"]:
                expected_sha = item["sha256"][art_type]
                actual_sha = calculate_sha256(path)
                if actual_sha != expected_sha:
                    print(f"  FAIL: {art_type} SHA256 mismatch. Expected {expected_sha}, got {actual_sha}")
                    overall_success = False
                else:
                    print(f"  PASS: {art_type} SHA256 integrity")

            # Ensure no timestamps in non-stamp files
            if art_type != "stamp":
                ts_matches = check_no_timestamps(path)
                if ts_matches:
                    print(f"  FAIL: Found forbidden timestamps in {art_type}: {ts_matches}")
                    overall_success = False
                else:
                    print(f"  PASS: No timestamps in {art_type}")

    if overall_success:
        print("\nALL EVIDENCE VERIFIED SUCCESSFULLY.")
        sys.exit(0)
    else:
        print("\nEVIDENCE VERIFICATION FAILED.")
        sys.exit(1)

if __name__ == "__main__":
    main()
