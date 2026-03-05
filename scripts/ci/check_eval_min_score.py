#!/usr/bin/env python3
import json
import sys
from pathlib import Path


def main() -> int:
    threshold = 0.8
    path = Path("artifacts/eval_report.json")
    if not path.exists():
        path.parent.mkdir(parents=True, exist_ok=True)
        report = {"check": "check_eval_min_score", "pass": False, "reason": "missing eval_report.json", "threshold": threshold}
        path.write_text(json.dumps(report, sort_keys=True, indent=2) + "\n", encoding="utf-8")
        return 1

    payload = json.loads(path.read_text(encoding="utf-8"))
    average = float(payload.get("average", 0.0))
    passed = average >= threshold
    report = {
        "check": "check_eval_min_score",
        "average": average,
        "threshold": threshold,
        "pass": passed,
    }
    path.write_text(json.dumps(report, sort_keys=True, indent=2) + "\n", encoding="utf-8")
    return 0 if passed else 1


if __name__ == "__main__":
    sys.exit(main())
