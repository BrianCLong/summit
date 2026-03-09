#!/usr/bin/env python3
"""Validate route optimization output schema compliance."""

from __future__ import annotations

import sys
from pathlib import Path

ROOT = Path(__file__).resolve()
while ROOT != ROOT.parent and not (ROOT / ".git").exists():
    ROOT = ROOT.parent
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

import json

from agents.route_opt.validator import validate_output

REPORT_PATH = Path("artifacts/route_plan/report.json")


def main() -> int:
    """Entry point for route schema validation.

    Reads the generated report artifact and validates it against the schema.
    Returns 0 on success, non-zero on failure.
    """
    if not REPORT_PATH.exists():
        raise FileNotFoundError(f"Missing report artifact: {REPORT_PATH}")

    payload = json.loads(REPORT_PATH.read_text(encoding="utf-8"))
    validate_output(payload)
    print("check-route-schema: pass")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
