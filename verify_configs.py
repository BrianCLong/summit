import yaml
import json
import sys

files_yaml = [
    ".github/workflows/ci.yml",
    ".github/workflows/ci-core.yml",
    ".github/workflows/ci-actionlint.yml",
    ".github/workflows/codeql.yml",
    ".github/dependabot.yml"
]

files_json = [
    ".github/governance/branch_protection_rules.json"
]

def check_yaml(file_path):
    try:
        with open(file_path, 'r') as f:
            yaml.safe_load(f)
        print(f"YAML Valid: {file_path}")
    except Exception as e:
        print(f"YAML Invalid: {file_path} - {e}")
        sys.exit(1)

def check_json(file_path):
    try:
        with open(file_path, 'r') as f:
            json.load(f)
        print(f"JSON Valid: {file_path}")
    except Exception as e:
        print(f"JSON Invalid: {file_path} - {e}")
        sys.exit(1)

for f in files_yaml:
    check_yaml(f)

for f in files_json:
    check_json(f)
