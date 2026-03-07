#!/usr/bin/env python3
"""Profile deterministic route optimization execution."""

from __future__ import annotations

import sys
from pathlib import Path

ROOT = Path(__file__).resolve()
while ROOT != ROOT.parent and not (ROOT / ".git").exists():
    ROOT = ROOT.parent
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

import json
import time
import tracemalloc

from agents.route_opt.planner import run

FIXTURE = Path("agents/route_opt/tests/fixtures/input.json")
OUTPUT = Path("artifacts/route_plan/perf.json")
BASELINE_SECONDS = 10.0
BASELINE_RAM_MB = 2048.0


def main() -> int:
    payload = json.loads(FIXTURE.read_text(encoding="utf-8"))

    tracemalloc.start()
    start = time.perf_counter()
    run(payload)
    elapsed = time.perf_counter() - start
    _, peak_bytes = tracemalloc.get_traced_memory()
    tracemalloc.stop()

    peak_mb = peak_bytes / (1024 * 1024)
    result = {
        "elapsed_seconds": round(elapsed, 6),
        "peak_memory_mb": round(peak_mb, 4),
        "baseline_seconds": BASELINE_SECONDS,
        "baseline_memory_mb": BASELINE_RAM_MB,
        "status": "pass" if elapsed <= BASELINE_SECONDS and peak_mb <= BASELINE_RAM_MB else "fail",
    }

    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    OUTPUT.write_text(json.dumps(result, indent=2, sort_keys=True) + "\n", encoding="utf-8")
    print(json.dumps(result, sort_keys=True))

    if result["status"] != "pass":
        raise RuntimeError("Route optimization performance budget exceeded")

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
