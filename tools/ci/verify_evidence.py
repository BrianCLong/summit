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
    if not items:
        # Fallback to legacy 'evidence' key
        items = idx.get("evidence", {})

    if not isinstance(items, dict) or not items:
        fail("evidence/index.json must contain non-empty 'items' (or 'evidence') map")

    for evd_id, meta in items.items():
        base = ROOT # Default base
        files = []

        if isinstance(meta, list):
            files = meta
        elif isinstance(meta, dict):
            if "path" in meta:
                base = ROOT / meta["path"]
                files = meta.get("files", [])
            elif "files" in meta:
                # Handle schema where files is a dict mapping type -> path
                files_data = meta["files"]
                if isinstance(files_data, dict):
                    files = list(files_data.values())
                elif isinstance(files_data, list):
                    files = files_data
                else:
                    print(f"Warning: Unknown files format for {evd_id}, skipping")
                    continue
            else:
                # Unknown dict format
                continue
        else:
            # Skip legacy items or items not following the new schema
            continue

        for fn in files:
            fp = base / fn
            if not fp.exists():
                # Some paths might be absolute relative to ROOT or relative to base
                # Try both if needed, but current usage suggests relative to ROOT for legacy
                if not fp.exists():
                     fail(f"{evd_id} missing file: {fp}")

        if any(name.endswith("report.json") for name in files):
            report_path = base / next(name for name in files if name.endswith("report.json"))
            report = load(report_path)
            if report.get("evidence_id") != evd_id:
                fail(f"{evd_id} report.json evidence_id mismatch")

        if any(name.endswith("metrics.json") for name in files):
            metrics_path = base / next(name for name in files if name.endswith("metrics.json"))
            metrics = load(metrics_path)
            if metrics.get("evidence_id") != evd_id:
                fail(f"{evd_id} metrics.json evidence_id mismatch")

        if any(name.endswith("stamp.json") for name in files):
            stamp_path = base / next(name for name in files if name.endswith("stamp.json"))
            stamp = load(stamp_path)
            if stamp.get("evidence_id") != evd_id:
                fail(f"{evd_id} stamp.json evidence_id mismatch")
            if not any(key in stamp for key in ("generated_at_utc", "generated_at", "created_at")):
                fail(f"{evd_id} stamp.json missing generated time field")

    print("[verify_evidence] OK")

if __name__ == "__main__":
    main()
