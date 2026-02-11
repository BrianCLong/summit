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

    # Support both 'items' and 'evidence' keys
    items = idx.get("items")
    if not items:
        items = idx.get("evidence")

    if not isinstance(items, dict) or not items:
        fail("evidence/index.json must contain non-empty 'items' or 'evidence' map")

    # List of shared/legacy/template artifacts to skip strict ID checks
    SKIP_ID_CHECK_FILES = {
        "evidence/report.json",
        "evidence/metrics.json",
        "evidence/stamp.json",
        "summit/evidence/templates/report.json",
        "summit/evidence/templates/metrics.json",
        "summit/evidence/templates/stamp.json"
    }

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
                fail(f"{evd_id} missing file: {fp}")

        if any(name.endswith("report.json") for name in files):
            report_path = base / next(name for name in files if name.endswith("report.json"))
            try:
                rel_path = str(report_path.relative_to(ROOT))
            except ValueError:
                rel_path = str(report_path) # Fallback if outside root (unlikely)

            if rel_path not in SKIP_ID_CHECK_FILES:
                report = load(report_path)
                if report.get("evidence_id") != evd_id:
                    fail(f"{evd_id} report.json evidence_id mismatch")

        if any(name.endswith("metrics.json") for name in files):
            metrics_path = base / next(name for name in files if name.endswith("metrics.json"))
            try:
                rel_path = str(metrics_path.relative_to(ROOT))
            except ValueError:
                rel_path = str(metrics_path)

            if rel_path not in SKIP_ID_CHECK_FILES:
                metrics = load(metrics_path)
                if metrics.get("evidence_id") != evd_id:
                    fail(f"{evd_id} metrics.json evidence_id mismatch")

        if any(name.endswith("stamp.json") for name in files):
            stamp_path = base / next(name for name in files if name.endswith("stamp.json"))
            try:
                rel_path = str(stamp_path.relative_to(ROOT))
            except ValueError:
                rel_path = str(stamp_path)

            if rel_path not in SKIP_ID_CHECK_FILES:
                stamp = load(stamp_path)
                if stamp.get("evidence_id") != evd_id:
                    fail(f"{evd_id} stamp.json evidence_id mismatch")

            # Timestamp check: verify existence of timestamp field
            stamp = load(stamp_path)
            if not any(key in stamp for key in ("generated_at_utc", "generated_at", "created_at", "timestamp", "retrieved_at")):
                fail(f"{evd_id} stamp.json missing generated time field")

    print("[verify_evidence] OK")

if __name__ == "__main__":
    main()
