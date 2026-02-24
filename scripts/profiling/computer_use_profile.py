#!/usr/bin/env python3
from __future__ import annotations

import argparse
import json
from pathlib import Path


def main() -> int:
    parser = argparse.ArgumentParser(
        description="Check computer-use metrics against deterministic budget thresholds."
    )
    parser.add_argument("--metrics", required=True, help="Path to metrics.json")
    parser.add_argument("--max-latency-ms", type=float, default=3000.0)
    parser.add_argument("--max-memory-mb", type=float, default=256.0)
    parser.add_argument("--max-cost-usd", type=float, default=0.02)
    args = parser.parse_args()

    data = json.loads(Path(args.metrics).read_text(encoding="utf-8"))
    metrics = data.get("metrics", {})
    latency = float(metrics.get("simulated_latency_ms", 0.0))
    memory = float(metrics.get("peak_memory_mb", 0.0))
    cost = float(metrics.get("cost_usd", 0.0))

    violations: list[str] = []
    if latency > args.max_latency_ms:
        violations.append(f"latency {latency}ms exceeds {args.max_latency_ms}ms")
    if memory > args.max_memory_mb:
        violations.append(f"memory {memory}MB exceeds {args.max_memory_mb}MB")
    if cost > args.max_cost_usd:
        violations.append(f"cost ${cost:.6f} exceeds ${args.max_cost_usd:.6f}")

    if violations:
        print("FAIL")
        for violation in violations:
            print(f"- {violation}")
        return 1

    print("PASS")
    print(f"latency_ms={latency}")
    print(f"peak_memory_mb={memory}")
    print(f"cost_usd={cost}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
