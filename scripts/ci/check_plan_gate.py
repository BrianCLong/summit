#!/usr/bin/env python3
import json
import sys
from pathlib import Path

REQUIRED = ["goal", "constraints", "acceptance_criteria", "risks", "non_goals"]


def main() -> int:
    plan_path = Path("artifacts/run_plan.json")
    report_path = Path("artifacts/policy_report.json")
    if not plan_path.exists():
        report = {"check": "check_plan_gate", "pass": False, "reason": "missing run_plan.json"}
        report_path.write_text(json.dumps(report, sort_keys=True, indent=2) + "\n", encoding="utf-8")
        return 1

    payload = json.loads(plan_path.read_text(encoding="utf-8"))
    missing = [field for field in REQUIRED if field not in payload]
    passed = not missing
    report = {
        "check": "check_plan_gate",
        "missing": missing,
        "pass": passed,
    }
    report_path.write_text(json.dumps(report, sort_keys=True, indent=2) + "\n", encoding="utf-8")
    return 0 if passed else 1


if __name__ == "__main__":
    sys.exit(main())
