import sys
import json
import os

def check_policy(policy_path):
    if not os.path.exists(policy_path):
        print(f"Policy file not found: {policy_path}")
        sys.exit(1)

    try:
        with open(policy_path, 'r') as f:
            policy = json.load(f)

        # Basic validation: Check for required keys
        required_keys = ['version', 'rules']
        for key in required_keys:
            if key not in policy:
                print(f"Missing required key in policy: {key}")
                sys.exit(1)

        print(f"Policy {policy_path} passed enforcement check.")
        sys.exit(0)
    except json.JSONDecodeError:
        print(f"Invalid JSON in policy file: {policy_path}")
        sys.exit(1)
    except Exception as e:
        print(f"Error enforcing policy: {e}")
        sys.exit(1)

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python3 enforce.py <policy_file>")
        sys.exit(1)

    check_policy(sys.argv[1])
