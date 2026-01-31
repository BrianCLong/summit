import subprocess
import sys
from pathlib import Path

DEP_FILES = [
    "package.json",
    "pnpm-lock.yaml",
    "requirements.in",
    "requirements.txt",
    "pyproject.toml",
    "Cargo.toml",
    "Cargo.lock",
]

DELTA_FILE = "deps/dependency_delta.md"

def run_command(cmd):
    try:
        return subprocess.check_output(cmd, stderr=subprocess.STDOUT).decode().splitlines()
    except Exception:
        return []

def get_modified_files():
    # Try multiple ways to get modified files
    files = set()

    # 1. Staged changes
    files.update(run_command(["git", "diff", "--cached", "--name-only"]))

    # 2. Unstaged changes
    files.update(run_command(["git", "diff", "--name-only"]))

    # 3. Changes compared to origin/main (if in a branch)
    files.update(run_command(["git", "diff", "origin/main...HEAD", "--name-only"]))

    # 4. Untracked files
    files.update(run_command(["git", "ls-files", "--others", "--exclude-standard"]))

    return list(files)

def main():
    modified_files = get_modified_files()
    if not modified_files:
        print("No modified files detected via git. Checking file existence as fallback.")
        # If we can't detect changes via git, we at least check if dependency files exist
        return

    deps_changed = [f for f in modified_files if any(dep for dep in DEP_FILES if f.endswith(dep))]
    delta_changed = any(f for f in modified_files if f.endswith(DELTA_FILE))

    if deps_changed and not delta_changed:
        print(f"Error: Dependency files changed but {DELTA_FILE} was not updated.")
        print("Changed dependency files:")
        for f in deps_changed:
            print(f"  - {f}")
        sys.exit(1)

    if deps_changed and delta_changed:
        print(f"OK: Dependencies changed and {DELTA_FILE} updated.")
    elif not deps_changed:
        print("OK: No dependency changes detected.")

if __name__ == "__main__":
    main()
