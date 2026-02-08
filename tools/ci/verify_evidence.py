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

    raw_items = idx.get("items", {})
    items = {}

    if isinstance(raw_items, list):
        for item in raw_items:
            if isinstance(item, dict) and "evidence_id" in item:
                items[item["evidence_id"]] = item
    elif isinstance(raw_items, dict):
        items = raw_items
    else:
        fail("evidence/index.json 'items' must be a list or dict")

    if not items:
        fail("evidence/index.json must contain non-empty 'items'")

    for evd_id, meta in items.items():
        base = ROOT
        files = []

        if isinstance(meta, list):
            files = meta
        elif isinstance(meta, dict):
            if "path" in meta:
                base = ROOT / meta["path"]

            raw_files = meta.get("files", [])
            if isinstance(raw_files, list):
                files = raw_files
            elif isinstance(raw_files, dict):
                files = list(raw_files.values())

        if not files:
            continue

        for fn in files:
            fp = base / fn
            if not fp.exists():
                fail(f"{evd_id} missing file: {fp}")

        # Skip ID validation for templates
        is_template = any("templates" in str(base / fn) for fn in files)

        if any(name.endswith("report.json") for name in files):
            report_path = base / next(name for name in files if name.endswith("report.json"))
            report = load(report_path)
            if not is_template and "evidence_id" in report and report["evidence_id"] != evd_id:
                fail(f"{evd_id} report.json evidence_id mismatch (found {report['evidence_id']})")

        if any(name.endswith("metrics.json") for name in files):
            metrics_path = base / next(name for name in files if name.endswith("metrics.json"))
            metrics = load(metrics_path)
            if not is_template and "evidence_id" in metrics and metrics["evidence_id"] != evd_id:
                fail(f"{evd_id} metrics.json evidence_id mismatch (found {metrics['evidence_id']})")

        if any(name.endswith("stamp.json") for name in files):
            stamp_path = base / next(name for name in files if name.endswith("stamp.json"))
            stamp = load(stamp_path)
            if not is_template and "evidence_id" in stamp and stamp["evidence_id"] != evd_id:
                fail(f"{evd_id} stamp.json evidence_id mismatch (found {stamp['evidence_id']})")

            # Check for timestamp presence
            valid_keys = ("generated_at_utc", "generated_at", "created_at", "timestamp", "retrieved_at")
            if not any(key in stamp for key in valid_keys):
                fail(f"{evd_id} stamp.json missing generated time field")

    print("[verify_evidence] OK")

if __name__ == "__main__":
    main()
