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

    # Handle both list and dict formats
    items = []
    if isinstance(idx, list):
        items = idx
    elif isinstance(idx, dict):
        items = idx.get("items", [])
    else:
        fail("evidence/index.json must be a list or a dict with 'items' list")

    print(f"[verify_evidence] Found {len(items)} items to verify")

    for item in items:
        # Support both old and new schema
        # New schema: {"evidence_id": "...", "files": {"report": "...", ...}}
        # Old schema might be different, but let's try to adapt

        evd_id = item.get("evidence_id")
        if not evd_id:
            # Skip items without ID
            continue

        files_map = item.get("files", {})
        if not files_map:
            print(f"[verify_evidence] WARN: {evd_id} has no files map")
            continue

        for key, rel_path in files_map.items():
            fp = ROOT / rel_path
            if not fp.exists():
                fail(f"{evd_id} missing file {key}: {fp}")

    print("[verify_evidence] OK")

if __name__ == "__main__":
    main()
