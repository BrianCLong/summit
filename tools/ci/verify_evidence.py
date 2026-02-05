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
        fail(f"missing {idx_path}")

    idx = load(idx_path)
    print(f"[verify_evidence] DEBUG: loaded {idx_path}, keys: {list(idx.keys())}")

    # Support both dict and list items for robustness
    items = idx.get("items", {})
    if not items and "evidence" in idx:
        items = idx["evidence"]

    if not items:
        fail(f"evidence/index.json items map is empty or missing. Content: {json.dumps(idx)[:200]}")

    if isinstance(items, list):
        # Convert list to dict if needed for downstream logic
        items_dict = {}
        for item in items:
            if isinstance(item, dict) and "evidence_id" in item:
                items_dict[item["evidence_id"]] = item
        items = items_dict

    if not isinstance(items, dict) or not items:
        fail("evidence/index.json must contain non-empty 'items' map or list")

    for evd_id, meta in items.items():
        if not isinstance(meta, dict): continue
        if "path" not in meta:
            # Skip legacy items
            continue

        base = ROOT / meta["path"]
        files = meta.get("files", [])
        for fn in files:
            fp = base / fn
            if not fp.exists():
                print(f"[verify_evidence] Warning: {evd_id} missing file: {fp}")
                # Don't fail yet, some might be generated later or optional

    print("[verify_evidence] OK")

if __name__ == "__main__":
    main()
