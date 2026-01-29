#!/usr/bin/env python3
import os
import sys

# Restricted markers to search for
RESTRICTED_MARKERS = [
    "DATA_CLASSIFICATION: CUI",
    "DATA_CLASSIFICATION: EXPORT_CONTROLLED",
    "DATA_CLASSIFICATION: CLASSIFIED",
    "CUI//"
]

# Paths allowed to contain restricted markers (e.g. policy definitions, tests)
ALLOWED_PATHS = [
    "policy/",
    "ci/",
    "_fixtures/"
]

# Files to check for REQUIRED public marker
CONCEPT_FILE_PATTERN = "programops/concepts/"
REQUIRED_MARKER = "DATA_CLASSIFICATION: PUBLIC"

def is_allowed(path):
    for allowed in ALLOWED_PATHS:
        if allowed in path:
            return True
    return False

def check_file(filepath):
    errors = []
    try:
        with open(filepath, 'r', encoding='utf-8', errors='ignore') as f:
            content = f.read()

            # Check 1: Restricted Markers
            if not is_allowed(filepath):
                for marker in RESTRICTED_MARKERS:
                    if marker in content:
                        errors.append(f"Found restricted marker '{marker}' in {filepath}")

            # Check 2: Concept Note Requirements
            if CONCEPT_FILE_PATTERN in filepath and filepath.endswith("concept.md"):
                if REQUIRED_MARKER not in content:
                    errors.append(f"Missing required marker '{REQUIRED_MARKER}' in {filepath}")

    except Exception as e:
        print(f"WARN: Could not read {filepath}: {e}")

    return errors

def main():
    print("Running Policy Classification Check...")
    params = sys.argv[1:]
    if not params:
        # Default to walk from root
        root_dir = "."
    else:
        root_dir = params[0]

    all_errors = []

    for root, dirs, files in os.walk(root_dir):
        # Skip git and hidden
        if ".git" in root:
            continue

        for name in files:
            filepath = os.path.join(root, name)
            # Skip this script itself if running from root
            if filepath.endswith("check_policy_classification.py"):
                continue

            file_errors = check_file(filepath)
            all_errors.extend(file_errors)

    if all_errors:
        print("POLICY CHECK FAILED:")
        for err in all_errors:
            print(f"  - {err}")
        sys.exit(1)
    else:
        print("POLICY CHECK PASSED.")
        sys.exit(0)

if __name__ == "__main__":
    main()
