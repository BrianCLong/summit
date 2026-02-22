import json
import sys
from datetime import datetime

def validate_flags():
    file_path = 'config/feature-flags.json'
    try:
        with open(file_path, 'r') as f:
            data = json.load(f)
    except FileNotFoundError:
        print(f"Error: {file_path} not found.")
        sys.exit(1)
    except json.JSONDecodeError:
        print(f"Error: {file_path} is not valid JSON.")
        sys.exit(1)

    if 'flags' not in data:
        print("Error: 'flags' key missing in feature-flags.json")
        sys.exit(1)

    errors = []
    today = datetime.now().date()

    for key, flag in data['flags'].items():
        # Check owner
        if 'owner' not in flag or not flag['owner']:
            errors.append(f"Flag '{key}' missing required field: 'owner'")

        # Check expiry
        if 'expiry' not in flag:
            errors.append(f"Flag '{key}' missing required field: 'expiry'")
        else:
            expiry_str = flag['expiry']
            try:
                expiry_date = datetime.strptime(expiry_str, '%Y-%m-%d').date()
                if expiry_date < today:
                    errors.append(f"Flag '{key}' has expired (expiry: {expiry_str})")
            except ValueError:
                errors.append(f"Flag '{key}' has invalid expiry format (expected YYYY-MM-DD, got: {expiry_str})")

    if errors:
        print(f"Found {len(errors)} errors in feature flags configuration:")
        for error in errors:
            print(f"- {error}")
        sys.exit(1)

    print("All feature flags are valid.")
    sys.exit(0)

if __name__ == "__main__":
    validate_flags()
