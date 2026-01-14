#!/usr/bin/env python3
import sys
import yaml
import json
import datetime
import os
from dateutil import parser

# Paths
EXCEPTIONS_PATH = "compliance/exceptions/EXCEPTIONS.yml"
CONTROLS_MATRIX_PATH = "compliance/control-matrix.yml"
REPORT_JSON_PATH = "exception_validation_report.json"

# Policy Constants
MAX_EXPIRY_DAYS_FROM_CREATION = 180
MAX_EXTENSION_DAYS = 90

def load_yaml(path):
    if not os.path.exists(path):
        print(f"Error: File not found: {path}")
        sys.exit(1)
    with open(path, 'r') as f:
        try:
            return yaml.safe_load(f)
        except yaml.YAMLError as e:
            print(f"Error parsing YAML {path}: {e}")
            sys.exit(1)

def validate_schema(exception, index):
    required_fields = [
        "exception_id", "control_ids", "status", "owner", "approvers",
        "created_at_utc", "expires_at_utc", "reason", "risk_statement",
        "evidence_plan"
    ]
    errors = []

    for field in required_fields:
        if field not in exception:
            errors.append(f"Missing required field: {field}")

    if "status" in exception and exception["status"] not in ["active", "resolved", "superseded"]:
         errors.append(f"Invalid status: {exception['status']}")

    if "compensating_controls" not in exception or not exception["compensating_controls"]:
        # Check if non-applicable is implied? No, policy says "required unless exception is 'non-applicable'"
        # Assuming reason might state non-applicable, but strictly we demand the field to exist.
        # If the prompt says "required unless exception is “non-applicable”", maybe it means if the reason is that the control is N/A.
        # But for machine readability, having the list empty might be fine if N/A, but prompt says "required".
        # I will enforce it being present as a list.
        if "compensating_controls" not in exception:
             errors.append("Missing field: compensating_controls")
        # If list is empty, maybe warn? But prompt implies it's required.

    return errors

def validate_exceptions():
    print(f"Validating exceptions from {EXCEPTIONS_PATH} against {CONTROLS_MATRIX_PATH}...")

    exceptions_data = load_yaml(EXCEPTIONS_PATH) or []
    controls_data = load_yaml(CONTROLS_MATRIX_PATH)

    # Extract valid control IDs
    if 'controls' not in controls_data:
        print("Error: Invalid control matrix format (missing 'controls' key)")
        sys.exit(1)

    valid_control_ids = {c['id'] for c in controls_data['controls']}

    violations = []
    active_exceptions_count = 0
    expired_exceptions_count = 0

    # Ensure exceptions_data is a list
    if not isinstance(exceptions_data, list):
        print("Error: Exceptions registry must be a list of objects.")
        sys.exit(1)

    now_utc = datetime.datetime.now(datetime.timezone.utc)

    for i, ex in enumerate(exceptions_data):
        ex_id = ex.get("exception_id", f"index_{i}")
        schema_errors = validate_schema(ex, i)

        if schema_errors:
            for err in schema_errors:
                violations.append({"id": ex_id, "error": err})
            continue

        # Referential Integrity
        for cid in ex.get("control_ids", []):
            if cid not in valid_control_ids:
                violations.append({"id": ex_id, "error": f"Invalid control_id: {cid}"})

        # Policy Constraints
        try:
            created_at = parser.parse(ex["created_at_utc"]).replace(tzinfo=datetime.timezone.utc)
            expires_at = parser.parse(ex["expires_at_utc"]).replace(tzinfo=datetime.timezone.utc)

            # Check expiry
            if ex["status"] == "active":
                active_exceptions_count += 1
                if expires_at < now_utc:
                    violations.append({"id": ex_id, "error": f"Active exception expired on {ex['expires_at_utc']}"})
                    expired_exceptions_count += 1

            # Horizon check (warning or error? Prompt says "Policy rules (document and enforce)")
            # "expires_at_utc must be within a bounded horizon (e.g., <= 180 days from creation)."
            # We enforce this on the *delta* between created and expires.

            if (expires_at - created_at).days > MAX_EXPIRY_DAYS_FROM_CREATION:
                 violations.append({"id": ex_id, "error": f"Expiry horizon exceeds {MAX_EXPIRY_DAYS_FROM_CREATION} days"})

        except ValueError as e:
             violations.append({"id": ex_id, "error": f"Date parsing error: {e}"})

    report = {
        "timestamp": now_utc.isoformat(),
        "total_exceptions": len(exceptions_data),
        "active_exceptions": active_exceptions_count,
        "expired_exceptions": expired_exceptions_count,
        "violations": violations,
        "status": "FAIL" if violations else "PASS"
    }

    with open(REPORT_JSON_PATH, 'w') as f:
        json.dump(report, f, indent=2)

    if violations:
        print("\n❌ Exception Validation FAILED")
        for v in violations:
            print(f"  - [{v['id']}] {v['error']}")
        sys.exit(1)
    else:
        print("\n✅ Exception Validation PASSED")
        sys.exit(0)

if __name__ == "__main__":
    validate_exceptions()
