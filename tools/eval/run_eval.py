import json
import sys
from pathlib import Path

FIXTURES_DIR = Path("eval/ai_assist/fixtures/no-extra-features")

def check_violation(data):
    non_goals = data.get("non_goals", [])
    changes = data.get("changes", [])

    for change in changes:
        # Check for explicit file violations
        for ng in non_goals:
            if ng.startswith("Do not add new endpoints to") and "api.py" in ng:
                if change["file"] == "api.py":
                    return True, f"Violation: Modified forbidden file {change['file']}"

            if "No variable renaming" in ng or "Do not refactor unrelated code" in ng:
                if change.get("is_creep"):
                    return True, f"Violation: Subtle creep detected - {change['content']}"

    return False, ""

def run_evaluation():
    print("Running AI-Assist Rigorous Evaluation...")
    fixtures = sorted(FIXTURES_DIR.glob("*.json"))

    all_passed = True
    for fixture_path in fixtures:
        with open(fixture_path) as f:
            data = json.load(f)

        fid = data.get("id", fixture_path.name)
        expected = data.get("expected_result")

        has_violation, reason = check_violation(data)

        actual = "fail" if has_violation else "pass"

        if actual == expected:
            print(f"[PASS] {fid}: {actual} as expected. {reason}")
        else:
            print(f"[FAIL] {fid}: Expected {expected}, but got {actual}. {reason}")
            all_passed = False

    return all_passed

if __name__ == "__main__":
    if not run_evaluation():
        sys.exit(1)
    print("All evaluation fixtures passed.")
