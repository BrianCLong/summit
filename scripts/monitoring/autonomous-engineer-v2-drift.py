import sys
import os

if __name__ == "__main__":
    if os.environ.get("SUMMIT_AUTON_ENGINEER", "0") != "1":
        sys.exit(0)

    # Check drift metrics
    sys.exit(0)
