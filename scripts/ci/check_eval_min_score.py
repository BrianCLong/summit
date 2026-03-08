#!/usr/bin/env python3
import json
import os
import sys


def check_score():
    if os.environ.get("SUMMIT_AUTON_ENGINEER", "0") != "1":
        print("Feature flag SUMMIT_AUTON_ENGINEER is OFF. Skipping eval min score check.")
        sys.exit(0)

    min_score = 80
    try:
        with open("artifacts/eval_report.json") as f:
            report = json.load(f)

        score = report.get("score", 0)
        if score < min_score:
            print(f"Eval score {score} below threshold {min_score}")
            sys.exit(1)

        print("Eval min score passed")
    except FileNotFoundError:
        print("artifacts/eval_report.json not found")
        sys.exit(1)

if __name__ == "__main__":
    check_score()
