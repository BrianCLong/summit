"""
CI Gate: verifies DEPENDENCY_DELTA.md exists and is updated when dependencies change.
"""
import os
import subprocess
import sys
from pathlib import Path

DEP_FILES = {"package.json", "package-lock.json", "requirements.txt", "pyproject.toml", "pnpm-lock.yaml"}

def get_changed_files():
    # Try to detect changed files using git.
    # We try typical CI env vars or git commands.
    changed = set()
    try:
        # Check against origin/main
        cmd = ["git", "diff", "--name-only", "origin/main...HEAD"]
        res = subprocess.run(cmd, capture_output=True, text=True)
        if res.returncode == 0:
             changed.update(res.stdout.splitlines())
        else:
             # Try HEAD^
             cmd = ["git", "diff", "--name-only", "HEAD^"]
             res = subprocess.run(cmd, capture_output=True, text=True)
             if res.returncode == 0:
                 changed.update(res.stdout.splitlines())
    except FileNotFoundError:
        pass # git not found
    except Exception:
        pass
    return changed

def main():
    if not Path("DEPENDENCY_DELTA.md").exists():
        print("DEPENDENCY_DELTA.md missing")
        return 1

    changed = get_changed_files()
    # Filter for dep files
    dep_changed = [f for f in changed if Path(f).name in DEP_FILES]
    delta_changed = "DEPENDENCY_DELTA.md" in changed

    if dep_changed:
        if not delta_changed:
            print(f"Dependency files changed {dep_changed} but DEPENDENCY_DELTA.md not updated.")
            return 1
        else:
             print("Dependencies changed and DEPENDENCY_DELTA.md updated.")

    return 0

if __name__ == "__main__":
    sys.exit(main())
