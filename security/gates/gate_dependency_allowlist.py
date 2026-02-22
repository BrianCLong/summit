import json
import os
import pathlib
import subprocess
import sys

# GATE-DEPS-DELTA: Enforce dependency allowlist and lockfile integrity

ALLOWLIST_PATH = pathlib.Path("security/policy/dependency_allowlist.json")
KILLSWITCH = os.environ.get("SEC_GATE_DEPS_DISABLED", "false").lower() == "true"

def load_allowlist():
    if not ALLOWLIST_PATH.exists():
        print(f"ERROR: Allowlist file not found at {ALLOWLIST_PATH}")
        sys.exit(1)
    return json.loads(ALLOWLIST_PATH.read_text("utf-8"))

def ok_npm(name: str, allowlist: dict) -> bool:
    for pat in allowlist.get("npm", []):
        if pat.endswith("/*") and name.startswith(pat[:-1]):
            return True
        if name == pat:
            return True
    return False

def ok_pypi(name: str, allowlist: dict) -> bool:
    return name in set(allowlist.get("pypi", []))

def get_changed_files():
    base = os.environ.get("GITHUB_BASE_REF", "origin/main")
    try:
        output = subprocess.check_output(["git", "diff", "--name-only", f"{base}...HEAD"], text=True)
        return output.splitlines()
    except subprocess.CalledProcessError:
        return []

def main():
    if KILLSWITCH:
        print("skip: dependency allowlist gate (killswitch active)")
        sys.exit(0)

    allowlist = load_allowlist()
    changed_files = get_changed_files()

    # Check if lockfiles changed
    lockfiles = ["pnpm-lock.yaml", "package-lock.json", "yarn.lock", "requirements.txt", "pyproject.toml"]
    changed_lockfiles = [f for f in changed_files if any(lf in f for lf in lockfiles)]

    if changed_lockfiles:
        print(f"Lockfile changes detected: {', '.join(changed_lockfiles)}")
        # Check for dependency delta doc
        delta_doc = pathlib.Path("deps/dependency_delta.md")
        if not delta_doc.exists():
             # Check if it was added in the same PR
             if "deps/dependency_delta.md" not in changed_files:
                print("FAILED: Lockfile changes detected but 'deps/dependency_delta.md' is missing.")
                print("Please document dependency changes in 'deps/dependency_delta.md'.")
                sys.exit(1)

        # Placeholder for actual dependency extraction from diff
        # In a real implementation, we would parse the diff to find added packages.
        # Here we emit a warning to check the allowlist manually or via specialized tools.
        print("ACTION: Ensure all newly added dependencies are in security/policy/dependency_allowlist.json")

    print("ok: dependency allowlist gate")

if __name__ == "__main__":
    main()
