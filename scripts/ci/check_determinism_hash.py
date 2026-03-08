#!/usr/bin/env python3
"""Replay fixture and assert deterministic report hash stability."""

from __future__ import annotations

import sys
from pathlib import Path

ROOT = Path(__file__).resolve()
while ROOT != ROOT.parent and not (ROOT / ".git").exists():
    ROOT = ROOT.parent
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

import hashlib
import json

from agents.route_opt.planner import run

FIXTURE = Path("agents/route_opt/tests/fixtures/input.json")


def _hash(payload: dict) -> str:
    canonical = json.dumps(payload, sort_keys=True, separators=(",", ":"))
    return hashlib.sha256(canonical.encode("utf-8")).hexdigest()


def main() -> int:
    data = json.loads(FIXTURE.read_text(encoding="utf-8"))
    first = run(data)
    second = run(data)

    if _hash(first) != _hash(second):
        raise RuntimeError("Determinism hash mismatch")

    print("check-determinism-hash: pass")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
