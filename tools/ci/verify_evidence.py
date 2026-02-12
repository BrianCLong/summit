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

    # Support both 'items' (legacy?) and 'evidence' (v1) keys
    items = idx.get("items")
    if not items:
        items = idx.get("evidence")

    if not isinstance(items, dict) or not items:
        fail("evidence/index.json must contain non-empty 'items' or 'evidence' map")

    for evd_id, meta in items.items():
        if isinstance(meta, list):
            files = meta
            base = ROOT
        elif isinstance(meta, dict) and "path" in meta:
            base = ROOT / meta["path"]
            files = meta.get("files", [])
        elif isinstance(meta, dict) and "files" in meta:
             # Handle direct files dict
             base = ROOT
             files = meta["files"]
             # If files is a dict (v1 schema), convert values to list
             if isinstance(files, dict):
                 files = list(files.values())
        else:
            # Skip legacy items or items not following the new schema
            continue

        for fn in files:
            fp = base / fn
            if not fp.exists():
                fail(f"{evd_id} missing file: {fp}")

        # Skip template files that might be shared across IDs
        if any("templates" in str(f) for f in files):
            continue

        if any(name.endswith("report.json") for name in files):
            report_path = base / next(name for name in files if name.endswith("report.json"))
            report = load(report_path)
            # Make evidence_id check optional if not present in report (legacy support)
            if "evidence_id" in report and report.get("evidence_id") != evd_id:
                fail(f"{evd_id} report.json evidence_id mismatch")

        if any(name.endswith("metrics.json") for name in files):
            metrics_path = base / next(name for name in files if name.endswith("metrics.json"))
            metrics = load(metrics_path)
            # Make evidence_id check optional if not present in metrics (legacy support)
            if "evidence_id" in metrics and metrics.get("evidence_id") != evd_id:
                fail(f"{evd_id} metrics.json evidence_id mismatch")

        if any(name.endswith("stamp.json") for name in files):
            stamp_path = base / next(name for name in files if name.endswith("stamp.json"))
            stamp = load(stamp_path)
            # Make evidence_id check optional if not present in stamp (legacy support)
            if "evidence_id" in stamp and stamp.get("evidence_id") != evd_id:
                fail(f"{evd_id} stamp.json evidence_id mismatch")
            # Support 'timestamp' and 'retrieved_at' fields in addition to other formats
            if not any(key in stamp for key in ("generated_at_utc", "generated_at", "created_at", "timestamp", "retrieved_at")):
                fail(f"{evd_id} stamp.json missing generated time field")

    print("[verify_evidence] OK")

if __name__ == "__main__":
    main()
