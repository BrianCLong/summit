#!/usr/bin/env python3
from __future__ import annotations

import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def get_git_base() -> str:
    for candidate in ["origin/main", "origin/master", "main", "master"]:
        try:
            subprocess.check_call(
                ["git", "rev-parse", "--verify", candidate],
                stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, cwd=ROOT
            )
            return candidate
        except subprocess.CalledProcessError:
            continue
    return "HEAD"


def main() -> int:
    print("Checking for dependency delta acknowledgement...")
    try:
        base = get_git_base()
        changed_files = subprocess.check_output(
            ["git", "diff", "--name-only", base],
            cwd=ROOT, text=True
        ).splitlines()
    except subprocess.CalledProcessError:
        return 0

    dep_files = {"package.json", "pnpm-lock.yaml", "requirements.in", "requirements.txt", "pyproject.toml"}
    changed_deps = [f for f in changed_files if any(dep in Path(f).name for dep in dep_files)]

    if not changed_deps:
        print("No dependency changes detected.")
        return 0

    print(f"Detected dependency changes in: {', '.join(changed_deps)}")
    delta_changed = any("DEPENDENCY_DELTA.md" in f for f in changed_files)

    if not delta_changed:
        print("ERROR: Dependency changes detected but DEPENDENCY_DELTA.md was not updated.")
        return 1

    print("SUCCESS: Dependency changes are documented.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
