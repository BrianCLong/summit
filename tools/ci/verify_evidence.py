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
    # Supports dictionary (legacy/strict) and list (array)
    if isinstance(items, dict):
        if not items:
            fail("evidence/index.json must contain non-empty 'items' map")
        iterator = items.items()
    elif isinstance(items, list):
        if not items:
            fail("evidence/index.json must contain non-empty 'items' list")
        iterator = ((i.get("evidence_id"), i) for i in items)
    else:
        fail("evidence/index.json 'items' must be a list or map")

    for evd_id, meta in iterator:
        if not evd_id:
            continue

        if isinstance(meta, list):
            # Legacy: value is list of files
            files = meta
            base = ROOT
        elif isinstance(meta, dict):
            # Object: can specify path, files, artifacts
            if "path" in meta:
                base = ROOT / meta["path"]
            else:
                base = ROOT

            # Support both 'files' (dict or list) and 'artifacts' (list)
            files_meta = meta.get("files", [])
            if isinstance(files_meta, dict):
                files = list(files_meta.values())
            else:
                files = files_meta

            # Add artifacts if present
            artifacts = meta.get("artifacts", [])
            files.extend(artifacts)
        else:
            continue

        for fn in files:
            fp = base / fn
            if not fp.exists():
                fail(f"{evd_id} missing file: {fp}")

        if any(name.endswith("report.json") for name in files):
            report_path = base / next(name for name in files if name.endswith("report.json"))
            report = load(report_path)
            # Only check if evidence_id is present in the file
            eid = report.get("evidence_id")
            if eid and eid != evd_id:
                fail(f"{evd_id} report.json evidence_id mismatch (found {eid})")

        if any(name.endswith("metrics.json") for name in files):
            metrics_path = base / next(name for name in files if name.endswith("metrics.json"))
            metrics = load(metrics_path)
            eid = metrics.get("evidence_id")
            if eid and eid != evd_id:
                fail(f"{evd_id} metrics.json evidence_id mismatch (found {eid})")

        if any(name.endswith("stamp.json") for name in files):
            stamp_path = base / next(name for name in files if name.endswith("stamp.json"))
            stamp = load(stamp_path)
            eid = stamp.get("evidence_id")
            if eid and eid != evd_id:
                fail(f"{evd_id} stamp.json evidence_id mismatch (found {eid})")

            # Check for timestamp
            if not any(key in stamp for key in ("generated_at_utc", "generated_at", "created_at", "timestamp", "retrieved_at")):
                fail(f"{evd_id} stamp.json missing generated time field")

    print("[verify_evidence] OK")

if __name__ == "__main__":
    main()
