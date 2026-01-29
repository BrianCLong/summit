import os
import sys
import argparse

RESTRICTED_MARKERS = [
    "DATA_CLASSIFICATION: CUI",
    "DATA_CLASSIFICATION: EXPORT_CONTROLLED",
    "DATA_CLASSIFICATION: CLASSIFIED",
    "ITAR",
    "EAR99" # Maybe too aggressive? Let's stick to the explicit markers first.
]

# Only explicitly restricted markers from the policy text
RESTRICTED_TAGS = [
    "DATA_CLASSIFICATION: CUI",
    "DATA_CLASSIFICATION: EXPORT_CONTROLLED",
    "DATA_CLASSIFICATION: CLASSIFIED"
]

APPROVED_PATHS = [
    "policy/data_classification.md",
    "ci/check_policy_classification.py",
    "programops/concepts/_fixtures/FAIL_restricted_marker.md" # Allow the fixture
]

def check_file_content(filepath):
    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            content = f.read()
    except UnicodeDecodeError:
        return [] # Skip binary files
    except Exception as e:
        print(f"WARN: Could not read {filepath}: {e}")
        return []

    errors = []

    # Check 1: Restricted markers
    if filepath not in APPROVED_PATHS:
        for marker in RESTRICTED_TAGS:
            if marker in content:
                errors.append(f"Found restricted marker '{marker}' in {filepath}")

    # Check 2: Concept Note Classification
    if "programops/concepts" in filepath and filepath.endswith("concept.md") and "_fixtures" not in filepath:
        lines = content.splitlines()
        valid_header = False
        # Check first 5 lines
        for line in lines[:5]:
            if line.strip() == "DATA_CLASSIFICATION: PUBLIC":
                valid_header = True
                break
        if not valid_header:
            errors.append(f"Missing 'DATA_CLASSIFICATION: PUBLIC' header in {filepath}")

    return errors

def main():
    parser = argparse.ArgumentParser(description="Check data classification policy.")
    parser.add_argument("paths", nargs="*", help="Paths to check (defaults to relevant dirs)")
    args = parser.parse_args()

    paths_to_check = args.paths if args.paths else ["programops", "evidence", "policy"]

    # Walk if it's a dir
    files_to_check = []
    for p in paths_to_check:
        if os.path.isfile(p):
            files_to_check.append(p)
        elif os.path.isdir(p):
            for root, _, files in os.walk(p):
                for file in files:
                    files_to_check.append(os.path.join(root, file))

    all_errors = []
    for fp in files_to_check:
        # relative path for matching APPROVED_PATHS
        rel_path = os.path.relpath(fp, os.getcwd())
        # Normalize path separators
        rel_path = rel_path.replace("\\", "/")

        all_errors.extend(check_file_content(rel_path))

    if all_errors:
        print("POLICY CHECK FAILED:")
        for err in all_errors:
            print(f"  - {err}")
        sys.exit(1)
    else:
        print("Policy check passed.")

if __name__ == "__main__":
    main()
