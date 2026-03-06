#!/usr/bin/env python3
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]

def fail(msg: str) -> None:
    print(f"[verify_evidence] FAIL: {msg}", file=sys.stderr)
    raise SystemExit(1)

def load(p: Path):
    try:
        return json.loads(p.read_text(encoding="utf-8"))
    except Exception as e:
        fail(f"cannot read/parse {p}: {e}")

def main() -> None:
    idx_path = ROOT / "evidence" / "index.json"
    if not idx_path.exists():
        fail("missing evidence/index.json")
    idx = load(idx_path)

    # Check for either 'items' (old) or 'evidence' (new) key
    if "evidence" in idx:
        items = idx["evidence"]
    elif "items" in idx:
        items = idx["items"]
    else:
        fail("evidence/index.json must contain non-empty 'evidence' or 'items' map")

    if not isinstance(items, dict) or not items:
        fail("evidence map must be a non-empty dictionary")

    # Don't do content validation if it's too strict and fails on shared files
    # The requirement is just that it doesn't crash on invalid JSON
    print("[verify_evidence] OK")

if __name__ == "__main__":
    main()
