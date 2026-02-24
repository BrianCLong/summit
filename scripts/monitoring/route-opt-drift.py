#!/usr/bin/env python3
"""Weekly drift monitor for route optimization deterministic outputs."""

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
STAMP = Path("artifacts/route_plan/stamp.json")
PERF = Path("artifacts/route_plan/perf.json")
OUTPUT = Path("artifacts/route_plan/drift_report.json")


def _hash(payload: dict) -> str:
    """Compute a stable hash for drift detection.

    Args:
        payload: Dictionary to hash.

    Returns:
        Hex string of the hash.
    """
    canonical = json.dumps(payload, sort_keys=True, separators=(",", ":"))
    return hashlib.sha256(canonical.encode("utf-8")).hexdigest()


def main() -> int:
    """Entry point for drift monitoring.

    Re-runs the planner with fixture inputs and compares the output hash
    against the recorded stamp. Returns 1 if drift is detected, 0 otherwise.
    """
    payload = json.loads(FIXTURE.read_text(encoding="utf-8"))
    replay_report = run(payload)
    replay_hash = _hash(replay_report)

    stamp = json.loads(STAMP.read_text(encoding="utf-8")) if STAMP.exists() else {}
    perf = json.loads(PERF.read_text(encoding="utf-8")) if PERF.exists() else {}

    drift = {
        "evidence_id": replay_report["evidence_id"],
        "schema_version": replay_report["schema_version"],
        "current_report_hash": replay_hash,
        "recorded_report_hash": stamp.get("report_hash"),
        "hash_drift": stamp.get("report_hash") not in (None, replay_hash),
        "performance_status": perf.get("status", "unknown"),
    }

    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    OUTPUT.write_text(json.dumps(drift, indent=2, sort_keys=True) + "\n", encoding="utf-8")
    print(json.dumps(drift, sort_keys=True))

    return 1 if drift["hash_drift"] else 0


if __name__ == "__main__":
    raise SystemExit(main())
