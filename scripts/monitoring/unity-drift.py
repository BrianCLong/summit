from __future__ import annotations

import json
import sys
from pathlib import Path


def main(argv: list[str]) -> int:
    if len(argv) != 3:
        print("usage: unity-drift.py <previous_report> <current_report>", file=sys.stderr)
        return 2
    previous = json.loads(Path(argv[1]).read_text(encoding="utf-8"))
    current = json.loads(Path(argv[2]).read_text(encoding="utf-8"))

    drift = {
        "added_dependencies": sorted(set(current.get("dependencies", {})) - set(previous.get("dependencies", {}))),
        "removed_dependencies": sorted(set(previous.get("dependencies", {})) - set(current.get("dependencies", {}))),
        "version_changed": previous.get("package", {}).get("version") != current.get("package", {}).get("version"),
    }
    print(json.dumps(drift, sort_keys=True))
    return 0


if __name__ == "__main__":
    raise SystemExit(main(sys.argv))
