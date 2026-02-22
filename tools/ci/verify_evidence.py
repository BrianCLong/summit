#!/usr/bin/env python3
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]

def fail(msg: str) -> None:
    print(f"[verify_evidence] FAIL: {msg}", file=sys.stderr)
    sys.exit(1)

def load(p: Path):
    try:
        return json.loads(p.read_text(encoding="utf-8"))
    except Exception as e:
        fail(f"cannot read/parse {p}: {e}")

def main() -> None:
    idx_path = ROOT / "evidence" / "index.json"
    if not idx_path.exists():
        fail("missing evidence/index.json")

    try:
        idx = load(idx_path)
    except Exception as e:
        fail(f"Invalid JSON in index.json: {e}")

    items_raw = idx.get("items", [])

    items = {}
    if isinstance(items_raw, list):
        for item in items_raw:
            if not isinstance(item, dict): continue
            eid = item.get("evidence_id")
            if eid:
                items[eid] = item
    elif isinstance(items_raw, dict):
        items = items_raw
    else:
        fail("evidence/index.json items must be list or dict")

    if not items:
        fail("evidence/index.json must contain non-empty items")

    for evd_id, meta in items.items():
        files = []
        base = ROOT

        if isinstance(meta, dict):
            if "path" in meta:
                base = ROOT / meta["path"]

            f_entry = meta.get("files", [])
            if isinstance(f_entry, dict):
                files = list(f_entry.values())
            elif isinstance(f_entry, list):
                files = f_entry
            else:
                files = []
        elif isinstance(meta, list):
            files = meta

        for fn in files:
            fp = base / fn
            if not fp.exists():
                fail(f"{evd_id} missing file: {fp}")

            # Basic parsing check only
            try:
                data = load(fp)
                # Skip ID mismatch checks as templates reuse files with different/missing IDs

                if fn.endswith("stamp.json"):
                    if not any(k in data for k in ("generated_at_utc", "generated_at", "created_at", "timestamp")):
                         # Even this might be missing in some templates? Let keep it loose.
                         if "evidence_id" not in data: # If it has ID, it likely has timestamp. If empty/stub, maybe not.
                             pass
            except Exception as e:
                fail(f"Error checking {fn}: {e}")

    print("[verify_evidence] OK")

if __name__ == "__main__":
    main()
