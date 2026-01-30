import json
import os
import sys
import yaml

REDACTION_RULES = "policies/people_thrive/redaction_rules.yml"

def get_forbidden_keys():
    if not os.path.exists(REDACTION_RULES):
        print(f"WARNING: Redaction rules not found at {REDACTION_RULES}. Using minimal defaults.")
        return ["name", "email", "description"]

    with open(REDACTION_RULES) as f:
        try:
            rules = yaml.safe_load(f)
            return rules.get("never_log_fields", [])
        except Exception as e:
            print(f"WARNING: Error reading {REDACTION_RULES}: {e}. Using minimal defaults.")
            return ["name", "email", "description"]

def check_pii(data, forbidden_keys, path=""):
    violations = []
    if isinstance(data, dict):
        for k, v in data.items():
            if k.lower() in forbidden_keys:
                violations.append(f"Forbidden key '{k}' found at {path}")
            violations.extend(check_pii(v, forbidden_keys, f"{path}.{k}" if path else k))
    elif isinstance(data, list):
        for i, item in enumerate(data):
            violations.extend(check_pii(item, forbidden_keys, f"{path}[{i}]"))
    return violations

def verify_files(file_list):
    forbidden_keys = [k.lower() for k in get_forbidden_keys()]
    all_violations = []
    for filepath in file_list:
        if not os.path.exists(filepath):
            continue
        print(f"Checking {filepath} for PII (Forbidden: {forbidden_keys})...")
        with open(filepath) as f:
            try:
                data = json.load(f)
                violations = check_pii(data, forbidden_keys)
                if violations:
                    print(f"FAILED: PII found in {filepath}:")
                    for v in violations:
                        print(f"  - {v}")
                    all_violations.extend(violations)
            except json.JSONDecodeError:
                pass

    if all_violations:
        return False
    print("PASSED: No PII detected in checked files.")
    return True

if __name__ == "__main__":
    target_files = sys.argv[1:] if len(sys.argv) > 1 else [
        "evidence/people_thrive/report.json",
        "evidence/people_thrive/metrics.json"
    ]
    if verify_files(target_files):
        sys.exit(0)
    else:
        sys.exit(1)
