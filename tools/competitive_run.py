#!/usr/bin/env python3
import argparse
import datetime
import os
import sys
import re

# --- Simple YAML Parser (Subset) ---
# Since PyYAML is not available, we implement a very basic parser
# that handles lists of dictionaries, which is what we need for claims.yml and integration_matrix.yml.

def parse_yaml_list_of_dicts(content):
    """
    Parses a YAML string that represents a list of dictionaries.
    Assumes format:
    - key: value
      key2: value
    - key: value
    """
    items = []
    current_item = {}

    lines = content.split('\n')
    for line in lines:
        line = line.rstrip()
        if not line or line.strip().startswith('#'):
            continue

        # Detect new item start
        match_new = re.match(r'^-\s+(.+?):\s*(.*)$', line)
        match_cont = re.match(r'^\s+(.+?):\s*(.*)$', line)

        if match_new:
            if current_item:
                items.append(current_item)
            current_item = {}
            key = match_new.group(1).strip()
            value = match_new.group(2).strip()
            current_item[key] = value
        elif match_cont:
            key = match_cont.group(1).strip()
            value = match_cont.group(2).strip()
            if current_item is not None:
                current_item[key] = value
        else:
            # Handle multiline or mismatch (ignore for now in this simple parser)
            pass

    if current_item:
        items.append(current_item)

    return items

# --- Templates ---

CLAIMS_TEMPLATE = """# Claims Ledger
# Format:
# - claim: "Description of the claim"
#   evidence_pointer: "URL or FilePath"
#   confidence: "H/M/L"

- claim: "Example claim"
  evidence_pointer: "https://example.com"
  confidence: "L"
"""

INTEGRATION_MATRIX_TEMPLATE = """# Integration Matrix
# Format:
# - capability: "Capability Name"
#   summit_module_target: "Target Module"
#   delta: "new/replace/enhance"
#   effort: "S/M/L"
#   risk: "L/M/H"
#   acceptance_tests: "Description of tests"

- capability: "Example Capability"
  summit_module_target: "TBD"
  delta: "new"
  effort: "S"
  risk: "L"
  acceptance_tests: "Verify X"
"""

MOAT_AND_GATES_TEMPLATE = """# Moat and Gates
# Define enterprise, scale, AI, ecosystem, and data gates.

enterprise_gates:
  - name: "RBAC"
    status: "Planned"

scale_gates:
  - name: "Multi-tenancy"
    status: "Planned"
"""

GENERIC_TEMPLATE = """# {title}
# {description}

## Content
"""

# --- Commands ---

def init_run(target_slug):
    today = datetime.date.today().strftime("%Y-%m-%d")
    base_dir = f"docs/competitive/targets/{target_slug}/run_{today}"

    if os.path.exists(base_dir):
        print(f"Run directory already exists: {base_dir}")
        return

    os.makedirs(base_dir)
    print(f"Created run directory: {base_dir}")

    files = {
        "claims.yml": CLAIMS_TEMPLATE,
        "integration_matrix.yml": INTEGRATION_MATRIX_TEMPLATE,
        "moat_and_gates.yml": MOAT_AND_GATES_TEMPLATE,
        "findings.md": GENERIC_TEMPLATE.format(title="Findings", description="General findings and observations."),
        "sources.yml": "# List of sources\n- url: ",
        "surpass_plan.md": GENERIC_TEMPLATE.format(title="Surpass Plan", description="Plan to surpass the competitor."),
        "risks.yml": "# Risks\n- risk: ",
        "license_review.md": GENERIC_TEMPLATE.format(title="License Review", description="Analysis of licenses."),
        "evidence_ledger.md": GENERIC_TEMPLATE.format(title="Evidence Ledger", description="Detailed evidence tracking.")
    }

    for filename, content in files.items():
        filepath = os.path.join(base_dir, filename)
        with open(filepath, 'w') as f:
            f.write(content)
        print(f"  Created {filename}")

def validate_run(target_slug):
    target_dir = f"docs/competitive/targets/{target_slug}"
    if not os.path.exists(target_dir):
        print(f"Target directory not found: {target_dir}")
        sys.exit(1)

    runs = sorted([d for d in os.listdir(target_dir) if d.startswith("run_")])
    if not runs:
        print(f"No runs found for target: {target_slug}")
        sys.exit(1)

    latest_run = runs[-1]
    run_dir = os.path.join(target_dir, latest_run)
    print(f"Validating latest run: {run_dir}")

    required_files = [
        "claims.yml", "integration_matrix.yml", "findings.md",
        "surpass_plan.md", "moat_and_gates.yml", "risks.yml",
        "license_review.md", "evidence_ledger.md", "sources.yml"
    ]

    missing = []
    for f in required_files:
        if not os.path.exists(os.path.join(run_dir, f)):
            missing.append(f)

    if missing:
        print(f"Missing files: {', '.join(missing)}")
        sys.exit(1)

    # Validate claims.yml
    claims_path = os.path.join(run_dir, "claims.yml")
    with open(claims_path, 'r') as f:
        content = f.read()
    claims = parse_yaml_list_of_dicts(content)

    for i, claim in enumerate(claims):
        required_keys = ["claim", "evidence_pointer", "confidence"]
        for k in required_keys:
            if k not in claim:
                print(f"claims.yml entry {i+1} missing key: {k}")
                sys.exit(1)

    # Validate integration_matrix.yml
    matrix_path = os.path.join(run_dir, "integration_matrix.yml")
    with open(matrix_path, 'r') as f:
        content = f.read()
    matrix = parse_yaml_list_of_dicts(content)

    for i, item in enumerate(matrix):
        required_keys = ["capability", "summit_module_target", "delta", "effort", "risk", "acceptance_tests"]
        for k in required_keys:
            if k not in item:
                print(f"integration_matrix.yml entry {i+1} missing key: {k}")
                sys.exit(1)

    print("Validation successful.")

def main():
    parser = argparse.ArgumentParser(description="Competitive Intelligence Tool")
    subparsers = parser.add_subparsers(dest="command", required=True)

    init_parser = subparsers.add_parser("init", help="Initialize a new run")
    init_parser.add_argument("target", help="Target slug (e.g. competitor-a)")

    validate_parser = subparsers.add_parser("validate", help="Validate a run")
    validate_parser.add_argument("target", help="Target slug")

    args = parser.parse_args()

    if args.command == "init":
        init_run(args.target)
    elif args.command == "validate":
        validate_run(args.target)

if __name__ == "__main__":
    main()
