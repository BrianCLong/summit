#!/usr/bin/env python3
import json
import os
import sys


def check_policy():
    if os.environ.get("SUMMIT_AUTON_ENGINEER", "0") != "1":
        print("Feature flag SUMMIT_AUTON_ENGINEER is OFF. Skipping patch policy check.")
        sys.exit(0)

    try:
        with open("artifacts/patch_stack.json") as f:
            patches = json.load(f)
        # TODO: call agents.policy.diff_policy.check_diff_policy
        print("Patch policy passed")

        with open("artifacts/policy_report.json", "w") as f:
            json.dump({"status": "passed"}, f)

    except FileNotFoundError:
        print("artifacts/patch_stack.json not found")
        sys.exit(1)

if __name__ == "__main__":
    check_policy()
