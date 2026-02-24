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
        fail("evidence/index.json must contain non-empty 'items'")

    # Normalize items to a dict if it's a list (handle both formats)
    if isinstance(items, list):
        items_dict = {}
        for item in items:
            if "evidence_id" in item:
                items_dict[item["evidence_id"]] = item
        items = items_dict
    elif not isinstance(items, dict):
        fail("evidence/index.json 'items' must be a list or dict")

    for evd_id, meta in items.items():
        if isinstance(meta, list):
            files = meta
            base = ROOT
        elif isinstance(meta, dict):
            # Check if path is provided, otherwise default to evidence/<id>/
            if "path" in meta:
                 base = ROOT / meta["path"]
            else:
                 base = ROOT / "evidence" / evd_id

            # files might be a list or a dict
            files_meta = meta.get("files", [])
            if isinstance(files_meta, dict):
                files = list(files_meta.values())
            else:
                files = files_meta
        else:
            continue

        for fn in files:
            # Handle if file path is absolute relative to root or relative to base
            fp = base / fn
            # Fallback check: maybe the file path in JSON is already relative to ROOT
            if not fp.exists():
                 fp_alt = ROOT / fn
                 if fp_alt.exists():
                     fp = fp_alt

            if not fp.exists():
                fail(f"{evd_id} missing file: {fp}")

        if any(name.endswith("report.json") for name in files):
            report_path = next(f for f in [base / n for n in files] if str(f).endswith("report.json"))
            if not report_path.exists(): report_path = next(f for f in [ROOT / n for n in files] if str(f).endswith("report.json"))

            report = load(report_path)
            if report.get("evidence_id") != evd_id:
                print(f"WARNING: {evd_id} report.json evidence_id mismatch", file=sys.stderr)

        if any(name.endswith("metrics.json") for name in files):
            metrics_path = next(f for f in [base / n for n in files] if str(f).endswith("metrics.json"))
            if not metrics_path.exists(): metrics_path = next(f for f in [ROOT / n for n in files] if str(f).endswith("metrics.json"))

            metrics = load(metrics_path)
            if metrics.get("evidence_id") != evd_id:
                print(f"WARNING: {evd_id} metrics.json evidence_id mismatch", file=sys.stderr)

        if any(name.endswith("stamp.json") for name in files):
            stamp_path = next(f for f in [base / n for n in files] if str(f).endswith("stamp.json"))
            if not stamp_path.exists(): stamp_path = next(f for f in [ROOT / n for n in files] if str(f).endswith("stamp.json"))

            stamp = load(stamp_path)
            if stamp.get("evidence_id") != evd_id:
                print(f"WARNING: {evd_id} stamp.json evidence_id mismatch", file=sys.stderr)
            if not any(key in stamp for key in ("generated_at_utc", "generated_at", "created_at")):
                fail(f"{evd_id} stamp.json missing generated time field")

    print("[verify_evidence] OK")

if __name__ == "__main__":
    main()
