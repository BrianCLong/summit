# ci/check_dependency_delta.py
from __future__ import annotations

import sys
from pathlib import Path


def main() -> int:
    root = Path(__file__).resolve().parents[1]
    marker = root / "ci" / "dependency_delta.md"
    if not marker.exists():
        print("missing ci/dependency_delta.md", file=sys.stderr)
        return 2
    # Placeholder: integrate with your actual lockfiles later.
    # For now, enforce that the marker file is touched in every PR that modifies dependency files.
    # In this script, we just check existence as a baseline.
    print("dependency delta check: PLACEHOLDER (wire to lockfiles)")
    return 0

if __name__ == "__main__":
    raise SystemExit(main())
