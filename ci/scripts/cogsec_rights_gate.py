#!/usr/bin/env python3
import os
import sys

GOVERNANCE_DIR = 'governance/cogsec'
REQUIRED_FILES = [
    'retention_policy.yaml',
    'redress_process.md',
    'never_log_fields.yaml',
    'rights_impact_assessment.template.md'
]

def load_never_log_fields():
    path = os.path.join(GOVERNANCE_DIR, 'never_log_fields.yaml')
    fields = []
    try:
        with open(path, 'r') as f:
            for line in f:
                line = line.strip()
                if line.startswith('-'):
                    # Extract field name from "- "field"" or "- field"
                    part = line[1:].strip().strip('"').strip("'")
                    # Ignore comments
                    if '#' in part:
                        part = part.split('#')[0].strip()
                    if part:
                        fields.append(part)
    except FileNotFoundError:
        pass
    return fields

def check_log_content(content, never_log_fields):
    """
    Scans content for presence of restricted field names as keys.
    """
    issues = []
    # This is a naive check for keys in JSON or similar
    for field in never_log_fields:
        # Check for "field" or 'field' to avoid partial matches on values
        if f'"{field}"' in content or f"'{field}'" in content:
            issues.append(field)
    return issues

def validate_governance_files():
    print("Checking governance files...")
    missing = []
    for f in REQUIRED_FILES:
        path = os.path.join(GOVERNANCE_DIR, f)
        if not os.path.exists(path):
            missing.append(f)

    if missing:
        print(f"ERROR: Missing required governance files: {missing}")
        return False
    print("All governance files present.")
    return True

def run_gate(target_dir=None):
    if not validate_governance_files():
        return False

    if target_dir:
        print(f"Scanning {target_dir} for violations...")
        never_log = load_never_log_fields()
        violations = 0

        for root, dirs, files in os.walk(target_dir):
            for file in files:
                filepath = os.path.join(root, file)
                try:
                    with open(filepath, 'r') as f:
                        content = f.read()
                        issues = check_log_content(content, never_log)
                        if issues:
                            print(f"VIOLATION: Found never-log fields in {filepath}: {issues}")
                            violations += 1
                except Exception as e:
                    print(f"WARNING: Could not read {filepath}: {e}")

        if violations > 0:
            print(f"Gate failed: {violations} privacy violations found.")
            return False

    return True

if __name__ == "__main__":
    import argparse
    parser = argparse.ArgumentParser()
    parser.add_argument("--scan", help="Directory to scan for violations")
    args = parser.parse_args()

    success = run_gate(args.scan)
    if not success:
        sys.exit(1)
    print("Gate passed.")
