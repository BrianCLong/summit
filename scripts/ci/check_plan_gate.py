#!/usr/bin/env python3
import json
import os
import sys


def check_plan():
    if os.environ.get("SUMMIT_AUTON_ENGINEER", "0") != "1":
        print("Feature flag SUMMIT_AUTON_ENGINEER is OFF. Skipping plan gate.")
        sys.exit(0)

    try:
        with open("artifacts/run_plan.json") as f:
            plan = json.load(f)
        # TODO: Add schema validation logic
        print("Plan gate passed")
    except FileNotFoundError:
        print("artifacts/run_plan.json not found")
        sys.exit(1)

if __name__ == "__main__":
    check_plan()
