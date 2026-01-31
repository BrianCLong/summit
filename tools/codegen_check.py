#!/usr/bin/env python3
from __future__ import annotations

import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def run(cmd: list[str]) -> int:
    print("+", " ".join(cmd))
    return subprocess.call(cmd, cwd=ROOT)


def main() -> int:
    """
    Codegen check:
    1. Runs all generators (via codegen.generators.all).
    2. Fails if 'generated/' has uncommitted changes.
    """
    rc = 0
    env = subprocess.os.environ.copy()
    env["PYTHONPATH"] = str(ROOT)

    print("Running all generators...")
    rc |= subprocess.call(
        [sys.executable, "-m", "codegen.generators.all"],
        cwd=ROOT,
        env=env
    )

    if rc != 0:
        print("ERROR: Generator execution failed", file=sys.stderr)
        return rc

    print("Checking for drift in generated/ directory...")
    rc |= run(["git", "diff", "--exit-code", "generated/"])

    if rc != 0:
        print("ERROR: Generated artifacts are out of date. Run 'python3 -m codegen.generators.all' and commit the changes.", file=sys.stderr)
    else:
        print("SUCCESS: Generated artifacts are up to date.")

    return rc


if __name__ == "__main__":
    raise SystemExit(main())
