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

    exceptions_path = ROOT / "evidence" / "governed_exceptions.json"
    exceptions = load(exceptions_path) if exceptions_path.exists() else {}
    schema_exceptions = exceptions.get("schema", [])

    items = idx.get("items", [])
    if not isinstance(items, (dict, list)) or not items:
        fail("evidence/index.json must contain non-empty 'items'")

    if isinstance(items, list):
        # Convert list to dict for easier processing
        items_dict = {}
        for item in items:
            if isinstance(item, dict) and "evidence_id" in item:
                items_dict[item["evidence_id"]] = item
        items = items_dict

    for evd_id, meta in items.items():
        if isinstance(meta, list):
            files = meta
            base = ROOT
        elif isinstance(meta, dict):
            if "path" in meta:
                base = ROOT / meta["path"]
                files = meta.get("files", [])
            elif "files" in meta:
                # Support items from list format
                base = ROOT
                files = meta["files"]
                if isinstance(files, dict):
                    files = list(files.values())
            else:
                continue
        else:
            # Skip legacy items or items not following the new schema
            continue

        for fn in files:
            fp = base / fn
            if not fp.exists():
                fail(f"{evd_id} missing file: {fp}")

        if any(name.endswith("report.json") for name in files):
            rel_report_path = next(name for name in files if name.endswith("report.json"))
            report_path = base / rel_report_path
            report = load(report_path)
            is_exception = any(str(report_path.relative_to(ROOT)) == ex for ex in schema_exceptions)
            if report.get("evidence_id") != evd_id and not is_exception:
                fail(f"{evd_id} report.json evidence_id mismatch (got {report.get('evidence_id')}, expected {evd_id})")

        if any(name.endswith("metrics.json") for name in files):
            rel_metrics_path = next(name for name in files if name.endswith("metrics.json"))
            metrics_path = base / rel_metrics_path
            metrics = load(metrics_path)
            is_exception = any(str(metrics_path.relative_to(ROOT)) == ex for ex in schema_exceptions)
            if metrics.get("evidence_id") != evd_id and not is_exception:
                fail(f"{evd_id} metrics.json evidence_id mismatch")

        if any(name.endswith("stamp.json") for name in files):
            rel_stamp_path = next(name for name in files if name.endswith("stamp.json"))
            stamp_path = base / rel_stamp_path
            stamp = load(stamp_path)
            is_exception = any(str(stamp_path.relative_to(ROOT)) == ex for ex in schema_exceptions)
            if stamp.get("evidence_id") != evd_id and not is_exception:
                fail(f"{evd_id} stamp.json evidence_id mismatch")
            if not any(key in stamp for key in ("generated_at_utc", "generated_at", "created_at")):
                fail(f"{evd_id} stamp.json missing generated time field")

    print("[verify_evidence] OK")

if __name__ == "__main__":
    main()
