#!/usr/bin/env python3
import os
import subprocess
import sys

LOCKFILES = {"package-lock.json", "poetry.lock", "requirements.txt", "pnpm-lock.yaml", "yarn.lock"}
DELTA_DOC = "docs/deps/dependency_delta.md"

def get_changed_files():
    try:
        # Determine base for diff
        # In GitHub Actions, GITHUB_BASE_REF might be set for PRs
        base = os.environ.get("GITHUB_BASE_REF")
        if base:
            # Need to fetch? Assuming CI env has checkout
            cmd = ["git", "diff", "--name-only", f"origin/{base}...HEAD"]
        else:
            # Default to checking against previous commit
            cmd = ["git", "diff", "--name-only", "HEAD^", "HEAD"]

        res = subprocess.run(cmd, capture_output=True, text=True)
        if res.returncode != 0:
             # Try stricter local diff if HEAD^ fails (e.g. initial commit)
             cmd = ["git", "diff", "--name-only", "--cached"]
             res = subprocess.run(cmd, capture_output=True, text=True)

        if res.returncode == 0:
            return set(res.stdout.splitlines())
        return set()
    except Exception as e:
        print(f"WARN: Git error: {e}")
        return set()

def main():
    changed = get_changed_files()
    if not changed:
        print("INFO: No changed files detected or git check skipped.")
        return 0

    lock_changed = [f for f in changed if f in LOCKFILES or f.endswith(".lock") or f.endswith("requirements.txt")]
    doc_changed = DELTA_DOC in changed

    if lock_changed and not doc_changed:
        print(f"FAIL: Dependency lockfiles changed but {DELTA_DOC} was not updated.")
        print(f"Changed lockfiles: {lock_changed}")
        print(f"Please update {DELTA_DOC} with rationale for changes.")
        return 1

    if lock_changed:
        print(f"OK: Lockfiles changed and {DELTA_DOC} updated.")
    else:
        print("OK: No dependency changes.")
    return 0

if __name__ == "__main__":
    sys.exit(main())
