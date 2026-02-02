#!/usr/bin/env python3
"""
Deny-by-default gate runner.
Gates must be explicitly enabled per pipeline/module via config (future PR).
"""

from __future__ import annotations

import sys

KNOWN_GATES = [
    "gate.latedata",
    "gate.schemadrift",
    "gate.fileformat",
    "gate.costbudget",
]

def main(argv: list[str]) -> int:
    # Minimal: print known gates; fail if asked to run unknown gate.
    if len(argv) < 2:
        print("KNOWN_GATES=" + ",".join(KNOWN_GATES))
        return 0
    gate = argv[1]
    if gate not in KNOWN_GATES:
        print(f"ERROR: unknown gate: {gate}")
        return 2
    # Deny-by-default behavior (until configured): fail intentionally.
    print(f"DENY_BY_DEFAULT: {gate} is not configured")
    return 3

if __name__ == "__main__":
    raise SystemExit(main(sys.argv))
