# evidence/tools/verify_evidence.py
from __future__ import annotations

import json
import sys
from pathlib import Path


def main() -> int:
    root = Path(__file__).resolve().parents[2]
    idx_path = root / "evidence" / "index.json"
    if not idx_path.exists():
        print("missing evidence/index.json", file=sys.stderr)
        return 2

    idx = json.loads(idx_path.read_text(encoding="utf-8"))
    items = idx.get("items", {})
    if not items:
        print("evidence/index.json has no items", file=sys.stderr)
        return 3

    # Minimal completeness checks; schema validation can be added later with jsonschema (opt-in dep)
    # Handles both dict (new) and list (legacy/migrated) formats if needed,
    # but strictly this tool expects dict as per Master Plan.
    if isinstance(items, list):
         print("evidence/index.json items is a list, expected dict (please migrate)", file=sys.stderr)
         return 5

    for evd, paths in items.items():
        for k in ("report", "metrics", "stamp"):
            rel_path = paths.get(k, "")
            if not rel_path:
                 print(f"{evd}: missing path for {k}", file=sys.stderr)
                 return 4
            p = root / rel_path
            if not p.exists():
                print(f"{evd}: missing {k} at {p}", file=sys.stderr)
                return 4

    print("evidence verification: OK")
    return 0

if __name__ == "__main__":
    raise SystemExit(main())
