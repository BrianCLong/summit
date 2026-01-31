#!/usr/bin/env python3
import os
import subprocess
import sys

# Lockfiles to watch for changes
LOCKFILES = {
    "package-lock.json",
    "pnpm-lock.yaml",
    "yarn.lock",
    "poetry.lock",
    "Pipfile.lock",
    "requirements.txt",
    "Cargo.lock",
    "go.sum",
    "uv.lock",
    "bun.lockb"
}

DELTA_DOC = "deps/dependency_delta.md"

def get_changed_files():
    """Returns a set of changed files in the current PR or HEAD vs HEAD^."""
    try:
        # Check if we are in a git repo
        subprocess.check_call(["git", "rev-parse", "--is-inside-work-tree"], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)

        # Strategy 1: Check against origin/main (common in CI for PRs)
        try:
            cmd = ["git", "diff", "--name-only", "origin/main...HEAD"]
            output = subprocess.check_output(cmd, stderr=subprocess.DEVNULL).decode("utf-8")
            return set(output.splitlines())
        except subprocess.CalledProcessError:
            pass

        # Strategy 2: Check HEAD^ vs HEAD (for commits)
        cmd = ["git", "diff", "--name-only", "HEAD^", "HEAD"]
        output = subprocess.check_output(cmd, stderr=subprocess.DEVNULL).decode("utf-8")
        return set(output.splitlines())
    except Exception as e:
        print(f"[DEP_CHECK] Error getting changed files: {e}")
        return None

def is_lockfile(filepath):
    """Checks if the file is a lockfile based on name."""
    return any(filepath.endswith(lock) for lock in LOCKFILES)

def main():
    changed = get_changed_files()
    if changed is None:
        print("[DEP_CHECK] CRITICAL: Could not determine changed files. Failing closed.")
        return 1

    if not changed:
        print("[DEP_CHECK] No changed files detected.")
        return 0

    # Check for any changed lockfiles (recursive/nested)
    lockfiles_changed = {f for f in changed if is_lockfile(f)}

    if lockfiles_changed:
        print(f"[DEP_CHECK] Lockfiles changed: {lockfiles_changed}")
        if DELTA_DOC not in changed:
            print(f"[DEP_CHECK] ERROR: Lockfiles changed but {DELTA_DOC} was not updated.")
            print(f"[DEP_CHECK] Please update {DELTA_DOC} with the dependency changes.")
            return 1
        else:
            print(f"[DEP_CHECK] OK: {DELTA_DOC} updated along with lockfiles.")
    else:
        print("[DEP_CHECK] No lockfiles changed.")

    return 0

if __name__ == "__main__":
    raise SystemExit(main())
