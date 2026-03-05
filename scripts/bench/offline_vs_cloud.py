#!/usr/bin/env python3
"""Benchmark harness placeholder for offline-vs-cloud comparisons."""
from __future__ import annotations

import argparse
import json
import pathlib
import time


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--mode", choices=["offline", "cloud"], default="offline")
    parser.add_argument("--out", default="metrics.json")
    args = parser.parse_args()

    started = time.perf_counter()
    time.sleep(0.01)
    elapsed_ms = (time.perf_counter() - started) * 1000

    metrics = {
        "mode": args.mode,
        "latency_ms": round(elapsed_ms, 2),
        "memory_mb": 0,
        "cost_per_run_usd": 0 if args.mode == "offline" else None,
    }

    out_path = pathlib.Path(args.out)
    out_path.write_text(json.dumps(metrics, indent=2) + "\n", encoding="utf-8")
    print(f"[offline_vs_cloud] wrote {out_path}")


if __name__ == "__main__":
    main()
