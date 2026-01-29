#!/usr/bin/env python3
import json
import sys
import re
import os
from pathlib import Path

def fail(msg):
    print(f"FAIL: {msg}")
    sys.exit(1)

def load_json(p):
    try:
        with open(p, 'r') as f:
            return json.load(f)
    except Exception as e:
        fail(f"Could not load {p}: {e}")

def check_no_timestamps(data, filename, path=[]):
    if isinstance(data, dict):
        for k, v in data.items():
            if "time" in k.lower() or "date" in k.lower() or "created" in k.lower():
                # Allow specific non-timestamp fields if necessary, but broadly deny
                # Unless it's explicitly allowed.
                # But requirement is "timestamps ONLY in stamp.json".
                # "created_utc" is in stamp.json.
                fail(f"Potential timestamp field '{k}' found in {filename} at {'.'.join(path)}")
            check_no_timestamps(v, filename, path + [k])
    elif isinstance(data, list):
        for i, item in enumerate(data):
            check_no_timestamps(item, filename, path + [str(i)])

def main():
    print("Running Evidence Index Check...")
    if not os.path.exists("evidence/index.json"):
        fail("evidence/index.json missing")

    index = load_json("evidence/index.json")

    # Check version (optional, but good practice)
    # if index.get("version") != "1.0": ...

    items = index.get("items", [])
    if not isinstance(items, list):
        fail("items is not a list")

    evidence_id_pattern = re.compile(r"^EVD-[A-Z0-9]+-[A-Z0-9]+-[0-9]{3}$")

    for item in items:
        # Check ID format
        evd_id = item.get("evidence_id")
        if not evd_id:
            fail(f"Item missing evidence_id: {item}")
        if not evidence_id_pattern.match(evd_id):
            fail(f"Invalid Evidence ID format: {evd_id}")

        # Check artifacts
        artifacts = item.get("artifacts")
        if not artifacts:
            fail(f"Item {evd_id} missing artifacts")

        for key in ["report", "metrics", "stamp"]:
            path_str = artifacts.get(key)
            if not path_str:
                fail(f"Item {evd_id} missing artifact '{key}'")

            if not os.path.exists(path_str):
                fail(f"Artifact file not found: {path_str}")

            # Load and validate artifact specific rules
            content = load_json(path_str)

            # Check Evidence ID match
            if content.get("evidence_id") != evd_id:
                fail(f"Evidence ID mismatch in {path_str}: expected {evd_id}, got {content.get('evidence_id')}")

            # Check for timestamps in non-stamp files
            if key != "stamp":
                check_no_timestamps(content, path_str)

    print("EVIDENCE INDEX CHECK PASSED.")

if __name__ == "__main__":
    main()
