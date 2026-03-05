#!/usr/bin/env python3
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from agents.policy.diff_policy import PatchPolicyViolation, check_patch_policy


def main() -> int:
    patch_path = Path("artifacts/patch_stack.json")
    report_path = Path("artifacts/policy_report.json")
    if not patch_path.exists():
        report = {"check": "check_patch_policy", "pass": False, "reason": "missing patch_stack.json"}
        report_path.write_text(json.dumps(report, sort_keys=True, indent=2) + "\n", encoding="utf-8")
        return 1

    payload = json.loads(patch_path.read_text(encoding="utf-8"))
    lines = [patch.get("diff", "") for patch in payload.get("patches", [])]

    try:
        check_patch_policy(lines)
        report = {"check": "check_patch_policy", "pass": True}
        code = 0
    except PatchPolicyViolation as exc:
        report = {"check": "check_patch_policy", "pass": False, "reason": str(exc)}
        code = 1

    report_path.write_text(json.dumps(report, sort_keys=True, indent=2) + "\n", encoding="utf-8")
    return code


if __name__ == "__main__":
    sys.exit(main())
