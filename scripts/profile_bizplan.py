#!/usr/bin/env python3
"""Latency and memory profiler for business plan readiness pipeline."""

from __future__ import annotations

import json
import subprocess
import time
import tracemalloc
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def main() -> int:
    out_dir = ROOT / "artifacts" / "bizplan-profile"
    out_dir.mkdir(parents=True, exist_ok=True)

    tracemalloc.start()
    start = time.perf_counter()
    subprocess.run(
        [
            "python3",
            str(ROOT / "pipelines" / "bizplan_readiness.py"),
            "--input",
            str(ROOT / "pipelines" / "fixtures" / "sample_startup.json"),
            "--out-dir",
            str(out_dir),
        ],
        check=True,
    )
    elapsed_ms = (time.perf_counter() - start) * 1000
    _, peak_bytes = tracemalloc.get_traced_memory()
    tracemalloc.stop()

    summary = {
        "latency_ms": round(elapsed_ms, 3),
        "peak_memory_mb": round(peak_bytes / (1024 * 1024), 3),
        "targets": {
            "latency_ms": 150,
            "memory_mb": 50
        }
    }
    (out_dir / "profile.json").write_text(json.dumps(summary, indent=2, sort_keys=True) + "\n", encoding="utf-8")
    print(json.dumps(summary, indent=2, sort_keys=True))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
