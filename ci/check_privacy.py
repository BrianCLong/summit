#!/usr/bin/env python3
import json
import os
import sys
from pathlib import Path


def fail(msg):
    print(f"FAIL: {msg}", file=sys.stderr)
    sys.exit(1)

def load_sensitive_keys():
    policy_path = Path("pp_alerts/policy/sensitive_fields.json")
    if not policy_path.exists():
        fail(f"Policy file missing: {policy_path}")
    try:
        with open(policy_path) as f:
            data = json.load(f)
            return data.get("sensitive_keys", [])
    except Exception as e:
        fail(f"Could not load policy: {e}")

# Sensitive keys to check (should match policy)
SENSITIVE_KEYS = load_sensitive_keys()

def scan_file(filepath):
    print(f"Scanning {filepath}...")
    try:
        with open(filepath) as f:
            content = f.read()
            try:
                data = json.loads(content)
                for key in SENSITIVE_KEYS:
                    if has_sensitive_key(data, key):
                        fail(f"Sensitive key '{key}' found in {filepath}")
            except json.JSONDecodeError:
                # If not JSON, check for key string
                for key in SENSITIVE_KEYS:
                    if f'"{key}"' in content or f"'{key}'" in content:
                         fail(f"Sensitive key '{key}' string found in {filepath}")
    except Exception as e:
        print(f"Could not read {filepath}: {e}")

def has_sensitive_key(data, sensitive_key):
    if isinstance(data, dict):
        if sensitive_key in data:
            return True
        return any(has_sensitive_key(v, sensitive_key) for v in data.values())
    elif isinstance(data, list):
        return any(has_sensitive_key(v, sensitive_key) for v in data)
    return False

def main():
    # Scan evidence artifacts
    evidence_dir = Path("evidence")
    # Also scan pp_alerts evidence
    pp_alerts_evidence = Path("pp_alerts/evidence")

    paths_to_scan = []
    if evidence_dir.exists():
        paths_to_scan.extend(evidence_dir.glob("**/*.json"))
    if pp_alerts_evidence.exists():
        paths_to_scan.extend(pp_alerts_evidence.glob("**/*.json"))

    for p in paths_to_scan:
        # Skip schemas
        if "schema" in str(p):
            continue
        # Skip this script validation config if any
        if p.name == "sensitive_fields.json":
            continue

        scan_file(p)

    print("Privacy scan passed.")

if __name__ == "__main__":
    main()
