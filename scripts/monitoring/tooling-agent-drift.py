#!/usr/bin/env python3
"""Weekly drift check for tooling-agent deterministic artifacts."""

from __future__ import annotations

import argparse
import hashlib
import json
import os
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
RUNNER = ROOT / "scripts" / "tooling" / "run_agent.py"
FILES = ("report.json", "metrics.json", "stamp.json")


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def run(output_dir: Path, task: str) -> None:
    subprocess.run(
        [sys.executable, str(RUNNER), "--task", task, "--output-dir", str(output_dir)],
        cwd=ROOT,
        check=True,
        env={**os.environ, "TOOLING_AGENT_ENABLED": "true", "GITHUB_SHA": os.environ.get("GITHUB_SHA", "local")},
    )


def main() -> int:
    parser = argparse.ArgumentParser(description="Tooling-agent drift detector")
    parser.add_argument("--task", default="example")
    parser.add_argument("--out", default="artifacts/drift_report.json")
    args = parser.parse_args()

    tmp = ROOT / "artifacts" / "tooling-agent" / "drift"
    run1 = tmp / "run1"
    run2 = tmp / "run2"
    run1.mkdir(parents=True, exist_ok=True)
    run2.mkdir(parents=True, exist_ok=True)

    run(run1, args.task)
    run(run2, args.task)

    hashes1 = {name: sha256(run1 / name) for name in FILES}
    hashes2 = {name: sha256(run2 / name) for name in FILES}

    drift = {name: hashes1[name] != hashes2[name] for name in FILES}
    drift_detected = any(drift.values())

    report = {
        "task": args.task,
        "drift_detected": drift_detected,
        "files": {name: {"run1": hashes1[name], "run2": hashes2[name], "drift": drift[name]} for name in FILES},
    }

    out = ROOT / args.out
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(json.dumps(report, indent=2, sort_keys=True) + "\n", encoding="utf-8")
    print(json.dumps(report, sort_keys=True))
    return 1 if drift_detected else 0


if __name__ == "__main__":
    raise SystemExit(main())
