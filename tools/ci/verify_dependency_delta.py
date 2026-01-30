#!/usr/bin/env python3
from __future__ import annotations

import os
import subprocess
import sys

LOCKFILES = {
    "package-lock.json",
    "poetry.lock",
    "pnpm-lock.yaml",
    "requirements.txt",
    "yarn.lock",
}
DELTA_DOC = "docs/deps/dependency_delta.md"


def get_changed_files() -> set[str]:
    base = os.environ.get("GITHUB_BASE_REF")
    if base:
        cmd = ["git", "diff", "--name-only", f"origin/{base}...HEAD"]
    else:
        cmd = ["git", "diff", "--name-only", "HEAD^", "HEAD"]

    res = subprocess.run(cmd, capture_output=True, text=True, check=False)
    if res.returncode != 0:
        res = subprocess.run(
            ["git", "diff", "--name-only", "--cached"],
            capture_output=True,
            text=True,
            check=False,
        )

    if res.returncode != 0:
        print("WARN: Git diff unavailable; dependency delta gate skipped.")
        return set()

    return set(res.stdout.splitlines())


def main() -> int:
    changed = get_changed_files()
    if not changed:
        print("INFO: No changed files detected or git check skipped.")
        return 0

    lock_changed = [
        path
        for path in changed
        if path in LOCKFILES or path.endswith(".lock") or path.endswith("requirements.txt")
    ]
    doc_changed = DELTA_DOC in changed

    if lock_changed and not doc_changed:
        print(f"FAIL: Dependency changes without {DELTA_DOC}.")
        print(f"Changed lockfiles: {lock_changed}")
        return 1

    if lock_changed:
        print(f"OK: Dependency changes captured in {DELTA_DOC}.")
    else:
        print("OK: No dependency changes.")

    return 0


if __name__ == "__main__":
    sys.exit(main())
