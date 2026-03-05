#!/usr/bin/env python3
"""CI gate: offline_profile_check.

Fails if an offline profile is configured while allowing outbound network access.
"""
from __future__ import annotations

import pathlib
import re
import sys

ROOT = pathlib.Path(__file__).resolve().parents[1]
OFFLINE_PROFILE = ROOT / "runtime/profiles/offline_local.yaml"


NETWORK_TRUE_PATTERN = re.compile(r"^network_allowed:\s*true\s*$", re.IGNORECASE)


def fail(message: str) -> None:
    print(f"[offline_profile_check] FAIL: {message}")
    sys.exit(1)


def main() -> None:
    if not OFFLINE_PROFILE.exists():
        fail(f"missing profile: {OFFLINE_PROFILE}")

    content = OFFLINE_PROFILE.read_text(encoding="utf-8")
    if NETWORK_TRUE_PATTERN.search(content):
        fail("offline profile cannot set network_allowed: true")

    print("[offline_profile_check] OK: offline profile denies network egress")


if __name__ == "__main__":
    main()
