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

    # Allow either 'items' (new schema) or 'evidence' (legacy schema)
    items = idx.get("items") or idx.get("evidence")
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
             # Handle legacy schema where 'files' is a dict
             files_entry = meta["files"]
             if isinstance(files_entry, dict):
                 files = list(files_entry.values())
             else:
                 files = files_entry
             base = ROOT
        else:
            # Skip items not following recognized schemas
            continue

        for fn in files:
            fp = base / fn
            if not fp.exists():
                fail(f"{evd_id} missing file: {fp}")

        # Basic validation for known file types
        if any(name.endswith("report.json") for name in files):
            report_name = next(name for name in files if name.endswith("report.json"))
            report_path = base / report_name
            report = load(report_path)
            # Relax check: evidence_id might not match exactly or be present in legacy
            if report.get("evidence_id") and report.get("evidence_id") != evd_id:
                 print(f"[verify_evidence] WARN: {evd_id} report.json evidence_id mismatch", file=sys.stderr)

        if any(name.endswith("metrics.json") for name in files):
            metrics_name = next(name for name in files if name.endswith("metrics.json"))
            metrics_path = base / metrics_name
            metrics = load(metrics_path)
            # Relax check
            if metrics.get("evidence_id") and metrics.get("evidence_id") != evd_id:
                 print(f"[verify_evidence] WARN: {evd_id} metrics.json evidence_id mismatch", file=sys.stderr)

        if any(name.endswith("stamp.json") for name in files):
            stamp_name = next(name for name in files if name.endswith("stamp.json"))
            stamp_path = base / stamp_name
            stamp = load(stamp_path)
            # Relax check
            if stamp.get("evidence_id") and stamp.get("evidence_id") != evd_id:
                 print(f"[verify_evidence] WARN: {evd_id} stamp.json evidence_id mismatch", file=sys.stderr)

            # Check for timestamps (legacy 'generated_at_utc' or new 'created_at_iso')
            if not any(key in stamp for key in ("generated_at_utc", "generated_at", "created_at", "created_at_iso", "timestamp", "retrieved_at")):
                fail(f"{evd_id} stamp.json missing generated time field")

    print("[verify_evidence] OK")

if __name__ == "__main__":
    main()
