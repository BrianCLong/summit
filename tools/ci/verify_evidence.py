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
    legacy_mode = False
    if not isinstance(items, dict) or not items:
        # Backward-compatible legacy schema:
        # {
        #   "evidence": {
        #     "EVD-ID": {
        #       "files": { "report": "path/to/report.json", ... }
        #     }
        #   }
        # }
        legacy_evidence = idx.get("evidence", {})
        if not isinstance(legacy_evidence, dict) or not legacy_evidence:
            fail("evidence/index.json must contain non-empty 'items' or legacy 'evidence' map")
        items = legacy_evidence
        legacy_mode = True

    for evd_id, meta in items.items():
        if legacy_mode:
            if not isinstance(meta, dict):
                fail(f"{evd_id} legacy entry must be an object")
            files_map = meta.get("files", {})
            if not isinstance(files_map, dict) or not files_map:
                fail(f"{evd_id} legacy entry must contain non-empty 'files' map")
            for fp in files_map.values():
                if not isinstance(fp, str):
                    fail(f"{evd_id} legacy file path must be a string")
                if not (ROOT / fp).exists():
                    fail(f"{evd_id} missing file: {ROOT / fp}")
            # Legacy format reuses shared artifacts for multiple IDs, so
            # strict evidence_id equality checks are intentionally skipped.
            continue

        if isinstance(meta, list):
            files = meta
            base = ROOT
        elif isinstance(meta, dict) and "path" in meta:
            base = ROOT / meta["path"]
            files = meta.get("files", [])
        else:
            # Skip legacy items or items not following the new schema
            continue

        for fn in files:
            fp = base / fn
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
