import os
import sys

FEATURE_CDA = os.environ.get("FEATURE_CDA", "OFF").upper() == "ON"

def check_cda():
    if not FEATURE_CDA:
        print("CDA flag is off, skipping check")
        sys.exit(0)

    if not os.path.exists("artifacts/dissent_record.json"):
        print("CDA check failed: dissent_record.json is missing")
        sys.exit(1)

    print("CDA check passed")
    sys.exit(0)

if __name__ == "__main__":
    check_cda()
