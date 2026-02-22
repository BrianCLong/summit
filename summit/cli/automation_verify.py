from __future__ import annotations

import json
import sys
from pathlib import Path

REQUIRED = ["report.json", "metrics.json", "stamp.json"]


def main(argv: list[str]) -> int:
    if len(argv) != 2:
        print("usage: automation_verify <evidence_dir>", file=sys.stderr)
        return 2
    evdir = Path(argv[1])
    missing = [name for name in REQUIRED if not (evdir / name).exists()]
    if missing:
        print(f"missing evidence files: {missing}", file=sys.stderr)
        return 1
    for name in REQUIRED:
        json.loads((evdir / name).read_text(encoding="utf-8"))
    return 0


if __name__ == "__main__":
    raise SystemExit(main(sys.argv))
