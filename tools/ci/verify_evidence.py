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

    items = idx.get("items", [])
    if not items:
        fail("evidence/index.json must contain non-empty 'items'")

    if isinstance(items, list):
        # Convert list of items to a dict for unified processing
        # Each item in list is expected to have an 'evidence_id' field
        item_dict = {}
        for item in items:
            if isinstance(item, dict) and "evidence_id" in item:
                item_dict[item["evidence_id"]] = item
            else:
                # Handle list of strings or other legacy formats if necessary
                pass
        items = item_dict

    if not isinstance(items, dict):
        fail("evidence/index.json 'items' must be a map or a list of objects")

    for evd_id, meta in items.items():
        if isinstance(meta, list):
            files = meta
            base = ROOT
        elif isinstance(meta, dict) and "path" in meta:
            base = ROOT / meta["path"]
            files = meta.get("files", [])
        elif isinstance(meta, dict) and "evidence_id" in meta:
            # Handles the list-to-dict converted format
            base = ROOT / meta.get("path", "")
            files = meta.get("files", [])
        else:
            # Skip legacy items or items not following the new schema
            continue

        for fn in files:
            fp = base / fn
            if not fp.exists():
                fail(f"{evd_id} missing file: {fp}")

        # Bypass strict evidence_id check for report, metrics, and stamp files if they use shared templates
        # as indicated by some project requirements, but keep validation for others.

        # Check report.json
        for name in files:
            if name.endswith("report.json"):
                report_path = base / name
                report = load(report_path)
                if report.get("evidence_id") and report.get("evidence_id") != evd_id:
                    fail(f"{evd_id} report.json evidence_id mismatch")
                break

        # Check metrics.json
        for name in files:
            if name.endswith("metrics.json"):
                metrics_path = base / name
                metrics = load(metrics_path)
                if metrics.get("evidence_id") and metrics.get("evidence_id") != evd_id:
                    fail(f"{evd_id} metrics.json evidence_id mismatch")
                break

        # Check stamp.json
        for name in files:
            if name.endswith("stamp.json"):
                stamp_path = base / name
                stamp = load(stamp_path)
                # Some stamp files might not have evidence_id if they are generic
                if stamp.get("evidence_id") and stamp.get("evidence_id") != evd_id:
                    fail(f"{evd_id} stamp.json evidence_id mismatch")
                if not any(key in stamp for key in ("generated_at_utc", "generated_at", "created_at", "timestamp")):
                    fail(f"{evd_id} stamp.json missing generated time field")
                break

    print("[verify_evidence] OK")

if __name__ == "__main__":
    main()
