import json
import os
import sys

def verify_evidence_index(index_path="evidence/index.json"):
    print(f"Checking {index_path}...")
    if not os.path.exists(index_path):
        print("FAILED: evidence/index.json not found")
        return False

    with open(index_path) as f:
        try:
            index = json.load(f)
        except json.JSONDecodeError:
            print("FAILED: evidence/index.json is not valid JSON")
            return False

    required_ids = [
        "EVD-PEOPLETHRIVE-SCHEMA-001",
        "EVD-PEOPLETHRIVE-POLICY-001",
        "EVD-PEOPLETHRIVE-TESTS-001",
        "EVD-PEOPLETHRIVE-METRICS-001",
        "EVD-PEOPLETHRIVE-RUNBOOK-001"
    ]

    items = index.get('items', [])
    found_ids = {item['evidence_id'] for item in items if 'evidence_id' in item}

    missing = [rid for rid in required_ids if rid not in found_ids]
    if missing:
        print(f"FAILED: Missing People Thrive evidence IDs: {missing}")
        return False

    # Check if files exist
    for rid in required_ids:
        item = next(i for i in items if i['evidence_id'] == rid)
        for key in ['report', 'metrics', 'stamp']:
            path = item.get(key)
            if not path or not os.path.exists(path):
                print(f"FAILED: {rid} missing {key} file at {path}")
                return False

    print("PASSED: People Thrive Evidence integrity check")
    return True

if __name__ == "__main__":
    idx = sys.argv[1] if len(sys.argv) > 1 else "evidence/index.json"
    if verify_evidence_index(idx):
        sys.exit(0)
    else:
        sys.exit(1)
