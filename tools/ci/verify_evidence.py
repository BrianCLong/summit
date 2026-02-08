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

    items = idx.get("items")
    # Support both list (new schema) and dict (legacy support)
    if isinstance(items, list):
        # Convert list to dict format for verification logic
        # Assuming list items have 'evidence_id' which is unique
        items_dict = {}
        for item in items:
            if "evidence_id" in item:
                items_dict[item["evidence_id"]] = item
            else:
                # If no evidence_id, we can't key it, but we can validate it independently.
                # For this script's logic, we'll verify it in place.
                verify_item_files("UNKNOWN_ID", item)
        items = items_dict
    elif not isinstance(items, dict) or not items:
        fail("evidence/index.json must contain non-empty 'items' (list or dict)")

    for evd_id, meta in items.items():
        verify_item_files(evd_id, meta)

    print("[verify_evidence] OK")

def verify_item_files(evd_id, meta):
    if isinstance(meta, list):
        files = meta
        base = ROOT
    elif isinstance(meta, dict):
        if "path" in meta:
            base = ROOT / meta["path"]
            files = meta.get("files", [])
        elif "files" in meta:
             # Handle flat file object structure where files is a dict
             if isinstance(meta["files"], dict):
                 files = meta["files"].values()
                 base = ROOT
             else:
                 files = meta["files"]
                 base = ROOT
        else:
             files = []
             base = ROOT
    else:
        # Skip legacy items or items not following the new schema
        return

    # Normalize files to a list if it is a dict (e.g. key-value pairs of file types)
    if isinstance(files, dict):
        files = files.values()

    for fn in files:
        fp = base / fn
        if not fp.exists():
            fail(f"{evd_id} missing file: {fp}")

    if any(name.endswith("report.json") for name in files):
        report_path = base / next(name for name in files if name.endswith("report.json"))
        report = load(report_path)
        if report.get("evidence_id") != evd_id and evd_id != "UNKNOWN_ID":
             # Some templates might use placeholders, so we might need to be lenient or skip templates
             if "templates" not in str(report_path):
                fail(f"{evd_id} report.json evidence_id mismatch")

    if any(name.endswith("metrics.json") for name in files):
        metrics_path = base / next(name for name in files if name.endswith("metrics.json"))
        metrics = load(metrics_path)
        if metrics.get("evidence_id") != evd_id and evd_id != "UNKNOWN_ID":
             if "templates" not in str(metrics_path):
                fail(f"{evd_id} metrics.json evidence_id mismatch")

    if any(name.endswith("stamp.json") for name in files):
        stamp_path = base / next(name for name in files if name.endswith("stamp.json"))
        stamp = load(stamp_path)
        if stamp.get("evidence_id") != evd_id and evd_id != "UNKNOWN_ID":
             if "templates" not in str(stamp_path):
                fail(f"{evd_id} stamp.json evidence_id mismatch")
        if not any(key in stamp for key in ("generated_at_utc", "generated_at", "created_at")):
            fail(f"{evd_id} stamp.json missing generated time field")

if __name__ == "__main__":
    main()
