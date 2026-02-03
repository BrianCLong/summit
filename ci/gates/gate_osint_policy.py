"""
CI Gate: Enforce OSINT policy.
Wraps summit.policy.osint_policy.
"""
import argparse
import json
import sys

# Ensure we can import from summit (assuming root is PYTHONPATH)
try:
    from summit.policy.osint_policy import OsintPolicyInput, evaluate
except ImportError:
    # If summit package is not in path, try relative import or adjust path
    sys.path.append(".")
    from summit.policy.osint_policy import OsintPolicyInput, evaluate

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--input", required=True, help="Path to JSON policy input")
    args = parser.parse_args()

    try:
        with open(args.input) as f:
            data = json.load(f)
    except Exception as e:
        print(f"failed_to_load_input error={e}")
        return 2

    # Convert data to OsintPolicyInput
    try:
        inp = OsintPolicyInput(
            target=data["target"],
            target_type=data["target_type"],
            allowlist=data["allowlist"],
            authorization_attestation=data.get("authorization_attestation"),
            tor_enabled=data.get("tor_enabled", False)
        )
    except KeyError as e:
        print(f"missing_field={e}")
        return 2

    allowed, reasons = evaluate(inp)
    if not allowed:
        print(f"policy_denied reasons={reasons}")
        return 1

    print("policy_allowed")
    return 0

if __name__ == "__main__":
    sys.exit(main())
