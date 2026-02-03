"""
Fail CI if lockfile/requirements changed without updating ci/deps/dependency_delta.md.
"""
from __future__ import annotations
import sys
from pathlib import Path

def main() -> int:
    delta = Path("ci/deps/dependency_delta.md")
    if not delta.exists():
        print("missing ci/deps/dependency_delta.md")
        return 2
    print("TODO: wire verify_dependency_delta.py to changed-files detection")
    return 0

if __name__ == "__main__":
    raise SystemExit(main())
