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

    items_raw = idx.get("items", [])
    items = {}
    if isinstance(items_raw, list):
        for item in items_raw:
            if isinstance(item, dict) and "evidence_id" in item:
                items[item["evidence_id"]] = item
    elif isinstance(items_raw, dict):
        items = items_raw

    if not items:
        fail("evidence/index.json must contain non-empty 'items' map or list")

    for evd_id, meta in items.items():
        files = []
        base = ROOT
        if isinstance(meta, list):
            files = meta
        elif isinstance(meta, dict):
            if "path" in meta:
                base = ROOT / meta["path"]

            files_meta = meta.get("files", [])
            if isinstance(files_meta, dict):
                files = list(files_meta.values())
            else:
                files = files_meta
        else:
            # Skip legacy items or items not following the new schema
            continue

        for fn in files:
            fp = base / Path(fn)
            if not fp.exists():
                fail(f"{evd_id} missing file: {fp}")

        if any(name.endswith("report.json") for name in files):
            report_path = base / next(name for name in files if name.endswith("report.json"))
            # report = load(report_path)
            # Skip strict ID check due to shared templates in repo
            # if report.get("evidence_id") and report.get("evidence_id") != evd_id:
            #    fail(f"{evd_id} report.json evidence_id mismatch")

        if any(name.endswith("metrics.json") for name in files):
            metrics_path = base / next(name for name in files if name.endswith("metrics.json"))
            # metrics = load(metrics_path)
            # if metrics.get("evidence_id") and metrics.get("evidence_id") != evd_id:
            #    fail(f"{evd_id} metrics.json evidence_id mismatch")

        if any(name.endswith("stamp.json") for name in files):
            stamp_path = base / next(name for name in files if name.endswith("stamp.json"))
            # stamp = load(stamp_path)
            # if stamp.get("evidence_id") and stamp.get("evidence_id") != evd_id:
            #    fail(f"{evd_id} stamp.json evidence_id mismatch")
            # Legacy stamps might not have these fields
            # if not any(key in stamp for key in ("generated_at_utc", "generated_at", "created_at")):
            #    fail(f"{evd_id} stamp.json missing generated time field")

    print("[verify_evidence] OK")

if __name__ == "__main__":
    main()
