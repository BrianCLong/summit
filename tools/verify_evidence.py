#!/usr/bin/env python3
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]

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

    items_data = idx.get("items", {})
    if isinstance(items_data, list):
        items = {item["evidence_id"]: item for item in items_data if "evidence_id" in item}
    elif isinstance(items_data, dict):
        items = items_data
    else:
        fail("evidence/index.json 'items' must be a map or a list")

    if not items:
        fail("evidence/index.json must contain non-empty 'items'")

    for evd_id, meta in items.items():
        if isinstance(meta, list):
            files = meta
            base = ROOT
        elif isinstance(meta, dict) and "path" in meta:
            base = ROOT / meta["path"]
            files = meta.get("files", [])
        elif isinstance(meta, dict) and "files" in meta:
            base = ROOT
            files = meta["files"]
            if isinstance(files, dict):
                files = list(files.values())
        else:
            continue

        for fn in files:
            fp = base / fn
            if not fp.exists():
                if not evd_id.startswith("EVD-ATG-"):
                    print(f"Warning: {evd_id} missing file: {fp}")
                    continue
                fail(f"{evd_id} missing file: {fp}")

        if any(str(name).endswith("report.json") for name in files):
            report_name = next(str(name) for name in files if str(name).endswith("report.json"))
            report_path = base / report_name
            if report_path.exists():
                report = load(report_path)
                if evd_id.startswith("EVD-ATG-") and report.get("evidence_id") != evd_id:
                    fail(f"{evd_id} report.json evidence_id mismatch")

        if any(str(name).endswith("metrics.json") for name in files):
            metrics_name = next(str(name) for name in files if str(name).endswith("metrics.json"))
            metrics_path = base / metrics_name
            if metrics_path.exists():
                metrics = load(metrics_path)
                if evd_id.startswith("EVD-ATG-") and metrics.get("evidence_id") != evd_id:
                    fail(f"{evd_id} metrics.json evidence_id mismatch")

        if any(str(name).endswith("stamp.json") for name in files):
            stamp_name = next(str(name) for name in files if str(name).endswith("stamp.json"))
            stamp_path = base / stamp_name
            if stamp_path.exists():
                stamp = load(stamp_path)
                if evd_id.startswith("EVD-ATG-") and stamp.get("evidence_id") != evd_id:
                    fail(f"{evd_id} stamp.json evidence_id mismatch")
                if evd_id.startswith("EVD-ATG-") and not any(key in stamp for key in ("generated_at_utc", "generated_at", "created_at", "timestamp")):
                    fail(f"{evd_id} stamp.json missing generated time field")

    print("[verify_evidence] OK")

if __name__ == "__main__":
    main()
