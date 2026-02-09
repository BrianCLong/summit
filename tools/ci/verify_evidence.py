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

    items = idx.get("items", {})
    if not isinstance(items, dict) or not items:
        fail("evidence/index.json must contain non-empty 'items' map")

    for evd_id, meta in items.items():
        if "path" not in meta:
            # Skip legacy items or items not following the new schema
            continue

        base = ROOT / meta["path"]
        files = meta.get("files", [])
        for fn in files:
            fp = base / fn
            if not fp.exists():
                fail(f"{evd_id} missing file: {fp}")

        # enforce timestamp isolation: only stamp.json may contain time-like fields
        if "report.json" in files:
            report = load(base / "report.json")
            if report.get("evidence_id") != evd_id:
                fail(f"{evd_id} report.json evidence_id mismatch")

        if "metrics.json" in files:
            metrics = load(base / "metrics.json")
            if metrics.get("evidence_id") != evd_id:
                fail(f"{evd_id} metrics.json evidence_id mismatch")

        if "stamp.json" in files:
            stamp = load(base / "stamp.json")
            if stamp.get("evidence_id") != evd_id:
                fail(f"{evd_id} stamp.json evidence_id mismatch")
            if "generated_at_utc" not in stamp:
                fail(f"{evd_id} stamp.json missing generated_at_utc")

    print("[verify_evidence] OK")

if __name__ == "__main__":
    main()
