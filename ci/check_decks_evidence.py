#!/usr/bin/env python3
import json
import pathlib
import sys

ROOT = pathlib.Path(__file__).resolve().parents[1]

def die(msg: str) -> None:
    print(msg, file=sys.stderr)
    raise SystemExit(2)

def main() -> int:
    idx = ROOT / "evidence/decks/index.json"
    if not idx.exists():
        die("missing evidence/decks/index.json")
    data = json.loads(idx.read_text(encoding="utf-8"))
    if data.get("item_slug") != "claude-code-decks":
        die("unexpected item_slug in evidence index")
    # Minimal presence checks (schema validation can be added later)
    for evd in data.get("evidence", []):
        for f in evd.get("files", []):
            p = ROOT / f
            if not p.exists():
                die(f"missing evidence file: {f}")
    print("ok: decks evidence present")
    return 0

if __name__ == "__main__":
    raise SystemExit(main())
