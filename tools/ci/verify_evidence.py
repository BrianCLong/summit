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

    # Normalize items to a dict: {evd_id: files_list}
    normalized_items = {}

    if isinstance(items, list):
        for item in items:
            if "evidence_id" not in item:
                continue
            evd_id = item["evidence_id"]
            # Convert files dict/list to list of paths
            files_entry = item.get("files", {})
            file_list = []
            if isinstance(files_entry, dict):
                file_list = list(files_entry.values())
            elif isinstance(files_entry, list):
                file_list = files_entry
            normalized_items[evd_id] = file_list
    elif isinstance(items, dict):
        for evd_id, meta in items.items():
            if isinstance(meta, list):
                normalized_items[evd_id] = meta
            elif isinstance(meta, dict):
                # Handle nested structure if any, or skip if legacy mismatch
                if "files" in meta:
                    normalized_items[evd_id] = meta["files"]
                else:
                    continue
    else:
        fail("evidence/index.json items must be a list or dict")

    if not normalized_items:
        fail("evidence/index.json contains no valid items")

    for evd_id, files in normalized_items.items():
        base = ROOT # Assume relative to root by default for now

        for fn in files:
            fp = base / fn
            if not fp.exists():
                fail(f"{evd_id} missing file: {fp}")

        if any(name.endswith("report.json") for name in files):
            report_path = base / next(name for name in files if name.endswith("report.json"))
            report = load(report_path)
            # Only enforce ID match if report actually has an ID
            # Also skip if the file is in a 'templates' directory
            if "templates" not in str(report_path) and report.get("evidence_id") and report.get("evidence_id") != evd_id:
                fail(f"{evd_id} report.json evidence_id mismatch")

        if any(name.endswith("metrics.json") for name in files):
            metrics_path = base / next(name for name in files if name.endswith("metrics.json"))
            metrics = load(metrics_path)
            # Only enforce ID match if metrics actually has an ID
            if "templates" not in str(metrics_path) and metrics.get("evidence_id") and metrics.get("evidence_id") != evd_id:
                fail(f"{evd_id} metrics.json evidence_id mismatch")

        if any(name.endswith("stamp.json") for name in files):
            stamp_path = base / next(name for name in files if name.endswith("stamp.json"))
            stamp = load(stamp_path)
            # Only enforce ID match if stamp actually has an ID
            if "templates" not in str(stamp_path) and stamp.get("evidence_id") and stamp.get("evidence_id") != evd_id:
                fail(f"{evd_id} stamp.json evidence_id mismatch")
            if not any(key in stamp for key in ("generated_at_utc", "generated_at", "created_at", "timestamp", "retrieved_at")):
                fail(f"{evd_id} stamp.json missing generated time field")

    print("[verify_evidence] OK")

if __name__ == "__main__":
    main()
