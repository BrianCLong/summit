#!/usr/bin/env python3
import subprocess
import sys
import pathlib

LOCKFILES = ["pnpm-lock.yaml", "requirements.in", "requirements.txt", "poetry.lock", "package-lock.json"]
DELTA_DOCS = ["docs/dependency_delta.md", "deps_delta.md"]

def get_changed_files():
    changes = set()
    # Check HEAD~1..HEAD (committed changes in last commit)
    try:
        out = subprocess.check_output(["git", "diff", "--name-only", "HEAD~1..HEAD"], text=True, stderr=subprocess.DEVNULL)
        changes.update(line.strip() for line in out.splitlines() if line.strip())
    except subprocess.CalledProcessError:
        pass

    # Check staged changes (index)
    try:
        out = subprocess.check_output(["git", "diff", "--name-only", "--cached"], text=True, stderr=subprocess.DEVNULL)
        changes.update(line.strip() for line in out.splitlines() if line.strip())
    except subprocess.CalledProcessError:
        pass

    return changes

def main():
    changed = get_changed_files()

    lock_changed = any(f in changed for f in LOCKFILES)
    if lock_changed:
        print("Dependency lockfile/manifest changed.")
        doc_changed = any(f in changed for f in DELTA_DOCS)

        if not doc_changed:
             print("FAIL: Dependency changes detected but no update to dependency_delta.md found.")
             print(f"Please update one of: {DELTA_DOCS}")
             return 1
    else:
        print("No dependency changes detected.")

    return 0

if __name__ == "__main__":
    sys.exit(main())
