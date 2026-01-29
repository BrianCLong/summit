import os
import sys
import argparse

REQUIRED_SECTIONS = [
    "Problem",
    "Transformation Mechanism",
    "Milestones",
    "Evaluation",
    "Transition",
    "Security Boundaries",
    "Data Handling",
    "Evidence IDs"
]

def check_file(filepath):
    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            content = f.read()
    except Exception as e:
        print(f"Error reading {filepath}: {e}")
        return ["Could not read file"]

    errors = []
    for section in REQUIRED_SECTIONS:
        # Simple check: search for "## Section Name"
        # We can be flexible with case or exact match.
        # Markdown headers usually start with ##
        if f"## {section}" not in content:
            errors.append(f"Missing section: '{section}'")

    return errors

def main():
    parser = argparse.ArgumentParser(description="Check concept note completeness.")
    parser.add_argument("paths", nargs="*", help="Paths to check")
    args = parser.parse_args()

    paths_to_check = args.paths
    if not paths_to_check:
        # Default scan
        start_dir = "programops/concepts"
        paths_to_check = []
        if os.path.exists(start_dir):
            for root, _, files in os.walk(start_dir):
                for file in files:
                    if file == "concept.md":
                        paths_to_check.append(os.path.join(root, file))
        else:
            print(f"WARN: {start_dir} does not exist. Nothing to check.")

    all_errors = False
    for fp in paths_to_check:
        if not os.path.exists(fp):
             print(f"File not found: {fp}")
             continue

        # Skip fail fixtures if running in general mode (unless explicitly passed? No, logic above just walks)
        # We should probably skip files starting with "FAIL_" if we are scanning generally.
        # But if checking explicitly, we check.
        # But here logic is: if args.paths is empty, find concept.md.
        # Fixtures in _fixtures/ are named PASS_sample.md, FAIL_*.md.
        # The default scan looks for `concept.md`.
        # So fixtures are NOT `concept.md`. They are `PASS_sample.md` etc.
        # So the default scan won't pick them up! Which is GOOD.
        # Real concepts will be in `programops/concepts/<id>/concept.md`.

        errors = check_file(fp)
        if errors:
            print(f"FAIL: {fp}")
            for err in errors:
                print(f"  - {err}")
            all_errors = True
        else:
            print(f"PASS: {fp}")

    if all_errors:
        sys.exit(1)

if __name__ == "__main__":
    main()
