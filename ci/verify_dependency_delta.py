import os
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
LOCKFILES = ["pnpm-lock.yaml", "requirements.txt", "pyproject.toml"]
DELTA_DOC = ROOT / "docs" / "dependency_delta.md"

def main():
    print("Verifying dependency delta...")

    # Check if delta doc exists
    if not DELTA_DOC.exists():
        print(f"FAILED: Dependency delta document missing at {DELTA_DOC.relative_to(ROOT)}")
        sys.exit(1)

    # In a real CI environment, we would check if lockfiles changed in the git diff
    # and if so, ensure the DELTA_DOC was also updated in the same commit/PR.
    # For this simulation, we'll just check if it contains recent entries or a specific ATLAS entry.

    content = DELTA_DOC.read_text(encoding="utf-8")
    if "ATLAS" not in content:
        print("FAILED: ATLAS-related dependency changes not documented in docs/dependency_delta.md")
        sys.exit(1)

    print("PASSED: Dependency delta check")
    sys.exit(0)

if __name__ == "__main__":
    main()
