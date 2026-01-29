import json
import os
import sys
import re

ROOT = os.getcwd()

def fail(msg):
    print(f"FAIL: {msg}")
    sys.exit(1)

def load_json(path):
    with open(path, 'r') as f:
        return json.load(f)

def check_no_timestamps(data, filename):
    # Recursive check for keys
    if isinstance(data, dict):
        for k, v in data.items():
            if k in ["created_utc", "timestamp", "date", "created_at"] and "stamp.json" not in filename:
                return f"Found timestamp key '{k}' in {filename}"
            if isinstance(v, (dict, list)):
                err = check_no_timestamps(v, filename)
                if err: return err
    elif isinstance(data, list):
        for item in data:
            if isinstance(item, (dict, list)):
                err = check_no_timestamps(item, filename)
                if err: return err
    return None

def main():
    index_path = os.path.join(ROOT, "evidence/index.json")
    if not os.path.exists(index_path):
        fail("evidence/index.json missing")

    try:
        index = load_json(index_path)
    except Exception as e:
        fail(f"Invalid JSON in index: {e}")

    if index.get("version") != "1.0":
        fail(f"Index version must be '1.0', got '{index.get('version')}'")

    items = index.get("items")
    if not isinstance(items, list):
        fail("Index 'items' must be a list")

    for item in items:
        evd_id = item.get("evidence_id")
        if not evd_id:
            fail(f"Item missing evidence_id: {item}")

        # Check ID format
        if not re.match(r"^EVD-[A-Z0-9]+-[A-Z0-9]+-[0-9]{3}$", evd_id):
            fail(f"Invalid Evidence ID format: {evd_id}")

        artifacts = item.get("artifacts")
        if not artifacts:
            fail(f"Item {evd_id} missing artifacts")

        for key in ["report", "metrics", "stamp"]:
            path = artifacts.get(key)
            if not path:
                fail(f"Item {evd_id} missing artifact '{key}'")

            full_path = os.path.join(ROOT, path)
            if not os.path.exists(full_path):
                fail(f"Artifact not found: {path}")

            # Load and check content
            try:
                data = load_json(full_path)

                # Check timestamps
                err = check_no_timestamps(data, path)
                if err:
                    fail(err)

                # Verify stamp has created_utc
                if key == "stamp":
                    if "created_utc" not in data:
                        fail(f"stamp.json missing 'created_utc': {path}")

            except Exception as e:
                fail(f"Error reading/parsing {path}: {e}")

    print("Evidence Index Verified.")

if __name__ == "__main__":
    main()
