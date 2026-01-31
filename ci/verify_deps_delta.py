from __future__ import annotations

import sys
from pathlib import Path


def main() -> int:
    root = Path(__file__).resolve().parents[1]
    deps_delta_dir = root / "deps_delta"
    if not deps_delta_dir.exists():
        print("deps_delta directory missing", file=sys.stderr)
        return 2
    item_file = deps_delta_dir / "260119895-keel.md"
    if not item_file.exists():
        print("deps delta file missing: deps_delta/260119895-keel.md", file=sys.stderr)
        return 3
    print("deps delta verification: OK")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
