import json
import os
import re
import sys

def check_no_timestamps(filepath):
    """Checks that a JSON/JSONL file does not contain wall-clock timestamps."""
    forbidden_keys = {"run_at", "timestamp", "generated_at", "exported_at"}

    with open(filepath, "r") as f:
        # Check if it looks like JSONL or single JSON
        content = f.read().strip()
        if not content:
            return True

        lines = content.split("\n")
        # Try as single JSON first if it starts with { and ends with } and only one "line"
        if len(lines) == 1 or (content.startswith("{") and content.endswith("}")):
            try:
                data = json.loads(content)
                return _check_dict(data, forbidden_keys, filepath)
            except json.JSONDecodeError:
                # Fallback to JSONL
                pass

        # JSONL path
        for line in lines:
            if not line.strip():
                continue
            try:
                data = json.loads(line)
                if not _check_dict(data, forbidden_keys, filepath):
                    return False
            except json.JSONDecodeError as e:
                print(f"Error parsing JSONL line in {filepath}: {e}")
                return False
    return True

def _check_dict(data, forbidden_keys, filepath):
    if not isinstance(data, dict):
        return True
    for key in data.keys():
        if key.lower() in forbidden_keys:
            print(f"❌ Forbidden key '{key}' found in {filepath}")
            return False
        # Recurse for nested dicts
        if isinstance(data[key], dict):
            if not _check_dict(data[key], forbidden_keys, filepath):
                return False
    return True

def main():
    target_dir = "artifacts/vuln-intel/hand-cve-private-sector"
    files_to_check = ["vuln_records.jsonl", "metrics.json"]

    all_passed = True
    for filename in files_to_check:
        path = os.path.join(target_dir, filename)
        if os.path.exists(path):
            if not check_no_timestamps(path):
                all_passed = False
        else:
            print(f"⚠️ Warning: {path} not found")

    if not all_passed:
        sys.exit(1)
    print("✅ Determinism check passed (no forbidden timestamp keys).")

if __name__ == "__main__":
    main()
