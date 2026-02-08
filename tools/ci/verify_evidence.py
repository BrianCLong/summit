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

    items = idx.get("items", [])
    if isinstance(items, dict):
        iterator = items.items()
    elif isinstance(items, list):
        iterator = ((item.get("evidence_id"), item) for item in items)
    else:
        fail("evidence/index.json 'items' must be a list or dict")

    for evd_id, meta in iterator:
        if not evd_id:
            continue

        if isinstance(meta, dict) and "files" in meta:
             files_entry = meta["files"]
             if isinstance(files_entry, dict):
                 files = list(files_entry.values())
             elif isinstance(files_entry, list):
                 files = files_entry
             else:
                 continue
             base = ROOT
        elif isinstance(meta, dict) and "path" in meta:
            base = ROOT / meta["path"]
            files = meta.get("files", [])
        else:
            continue

        for fn in files:
            fp = base / fn
            if not fp.exists():
                fail(f"{evd_id} missing file: {fp}")

            # Skip ID check for templates
            if "templates" in str(fp):
                continue

            if fn.endswith("report.json"):
                report = load(fp)
                if "evidence_id" in report and report["evidence_id"] != evd_id:
                    fail(f"{evd_id} report.json evidence_id mismatch: {report['evidence_id']}")
            if fn.endswith("metrics.json"):
                metrics = load(fp)
                if "evidence_id" in metrics and metrics["evidence_id"] != evd_id:
                    fail(f"{evd_id} metrics.json evidence_id mismatch: {metrics['evidence_id']}")
            if fn.endswith("stamp.json"):
                stamp = load(fp)
                if "evidence_id" in stamp and stamp["evidence_id"] != evd_id:
                    fail(f"{evd_id} stamp.json evidence_id mismatch: {stamp['evidence_id']}")
                if not any(key in stamp for key in ("generated_at_utc", "generated_at", "created_at")):
                    pass

    print("[verify_evidence] OK")

if __name__ == "__main__":
    main()
