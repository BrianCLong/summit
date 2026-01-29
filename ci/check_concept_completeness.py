#!/usr/bin/env python3
import os
import sys

CONCEPT_FILE_PATTERN = "programops/concepts/"
REQUIRED_SECTIONS = [
    "Problem Statement",
    "Transformation Mechanism",
    "Milestones",
    "Evaluation Plan",
    "Transition Path",
    "Security Boundaries",
    "Data Handling",
    "Evidence ID"
]

def check_file(filepath):
    errors = []
    try:
        with open(filepath, 'r', encoding='utf-8', errors='ignore') as f:
            content = f.read()

            # Check for required sections (case insensitive search for headers?)
            # Assuming markdown headers "## Section" or just "Section"
            # We'll look for the string in content
            for section in REQUIRED_SECTIONS:
                if section not in content:
                    errors.append(f"Missing required section '{section}'")

    except Exception as e:
        print(f"WARN: Could not read {filepath}: {e}")
        return errors

    return errors

def main():
    print("Running Concept Completeness Check...")
    params = sys.argv[1:]
    if not params:
        root_dir = "."
    else:
        root_dir = params[0]

    all_errors = []

    for root, dirs, files in os.walk(root_dir):
        if ".git" in root:
            continue

        for name in files:
            filepath = os.path.join(root, name)

            # Only check concept files
            if CONCEPT_FILE_PATTERN in filepath and filepath.endswith("concept.md"):
                # Skip fixtures if we want (or maybe we want to test fixtures?)
                # We usually want to enforce completeness on real concepts.
                # If we have failure fixtures, they will fail this check.
                # We should exclude _fixtures/ unless explicitly testing.
                if "_fixtures/" in filepath:
                    continue

                file_errors = check_file(filepath)
                if file_errors:
                    for err in file_errors:
                        all_errors.append(f"{filepath}: {err}")

    if all_errors:
        print("CONCEPT COMPLETENESS CHECK FAILED:")
        for err in all_errors:
            print(f"  - {err}")
        sys.exit(1)
    else:
        print("CONCEPT COMPLETENESS CHECK PASSED.")
        sys.exit(0)

if __name__ == "__main__":
    main()
