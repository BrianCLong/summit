#!/usr/bin/env python3
"""Profile tooling-agent runtime/memory budgets."""

from __future__ import annotations

import argparse
import json
import os
import resource
import subprocess
import sys
import time
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
RUNNER = ROOT / "scripts" / "tooling" / "run_agent.py"


def main() -> int:
    parser = argparse.ArgumentParser(description="Profile tooling-agent budgets")
    parser.add_argument("--task", default="example")
    parser.add_argument("--output-dir", default="artifacts/tooling-agent/profile-run")
    parser.add_argument("--profile-out", default="artifacts/tooling-agent/profile.json")
    parser.add_argument("--enforce", action="store_true")
    args = parser.parse_args()

    output_dir = Path(args.output_dir)
    profile_out = Path(args.profile_out)

    before = resource.getrusage(resource.RUSAGE_CHILDREN)
    start = time.perf_counter()
    subprocess.run(
        [sys.executable, str(RUNNER), "--task", args.task, "--output-dir", str(output_dir)],
        cwd=ROOT,
        check=True,
        env={**os.environ, "TOOLING_AGENT_ENABLED": "true", "GITHUB_SHA": os.environ.get("GITHUB_SHA", "local")},
    )
    elapsed_ms = int((time.perf_counter() - start) * 1000)
    after = resource.getrusage(resource.RUSAGE_CHILDREN)

    # ru_maxrss is kilobytes on Linux, bytes on macOS; normalize to MB conservatively.
    delta_rss_raw = max(int(after.ru_maxrss - before.ru_maxrss), 0)
    memory_mb = delta_rss_raw / 1024 if sys.platform.startswith("linux") else delta_rss_raw / (1024 * 1024)

    report = {
        "task": args.task,
        "runtime_ms": elapsed_ms,
        "memory_mb": round(memory_mb, 3),
        "runtime_budget_ms": 5000,
        "memory_budget_mb": 256,
        "within_runtime_budget": elapsed_ms <= 5000,
        "within_memory_budget": memory_mb <= 256,
    }

    profile_out.parent.mkdir(parents=True, exist_ok=True)
    profile_out.write_text(json.dumps(report, indent=2, sort_keys=True) + "\n", encoding="utf-8")
    print(json.dumps(report, sort_keys=True))

    if args.enforce and (not report["within_runtime_budget"] or not report["within_memory_budget"]):
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
