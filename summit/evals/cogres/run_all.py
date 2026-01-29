import json
import sys
from pathlib import Path
from summit.security.cogres.policy.gate import CogResGate

FIXTURES_DIR = Path(__file__).parent / "fixtures"

def run_evals():
    fixtures = sorted(FIXTURES_DIR.glob("*.json"))
    if not fixtures:
        print("No fixtures found.")
        return 0

    passed = 0
    total = 0
    gate = CogResGate(config={})

    for fixture_path in fixtures:
        with open(fixture_path, "r") as f:
            case = json.load(f)

        total += 1
        event = case.get("event")
        signals = case.get("signals", {})
        expected_allow = case.get("expected_allow")

        decision = gate.check(event=event, signals=signals)

        if decision.allow == expected_allow:
            print(f"PASS: {fixture_path.name}")
            passed += 1
        else:
            print(f"FAIL: {fixture_path.name} - Expected allow={expected_allow}, got {decision.allow}. Reasons: {decision.reasons}")

    print(f"Summary: {passed}/{total} passed.")
    if passed < total:
        sys.exit(1)

if __name__ == "__main__":
    run_evals()
