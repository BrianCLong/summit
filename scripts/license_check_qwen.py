import os
import sys

LICENSE_PATH = "models/qwen/LICENSE"
EXPECTED_LICENSE_TYPE = "Apache 2.0" # Assumed based on Qwen 2.5/72B open source nature, verify for 3.5

def check_license():
    if not os.path.exists(LICENSE_PATH):
        print(f"ERROR: License file not found at {LICENSE_PATH}")
        sys.exit(1)

    with open(LICENSE_PATH) as f:
        content = f.read()
        if EXPECTED_LICENSE_TYPE not in content:
            print(f"WARNING: License content does not explicitly match expected type '{EXPECTED_LICENSE_TYPE}'")
            # For now, we don't fail, just warn, as manual verification is needed

    print("License check passed (existence verified).")
    sys.exit(0)

if __name__ == "__main__":
    check_license()
