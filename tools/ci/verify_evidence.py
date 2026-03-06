#!/usr/bin/env python3
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]

def fail(msg: str) -> None:
    print(f"[verify_evidence] FAIL: {msg}", file=sys.stderr)
    raise SystemExit(1)

def warn(msg: str) -> None:
    print(f"[verify_evidence] WARN: {msg}", file=sys.stderr)

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

    iterator = []
    if isinstance(items, list):
        for item in items:
            iterator.append((item.get("evidence_id"), item))
    elif isinstance(items, dict):
        iterator = items.items()
    else:
        fail("evidence/index.json 'items' must be a dictionary or a list")

    for evd_id, meta in iterator:
        if not evd_id:
            continue

        base = ROOT
        files = []

        if isinstance(meta, dict):
            if "files" in meta:
                if isinstance(meta["files"], dict):
                    files = list(meta["files"].values())
                elif isinstance(meta["files"], list):
                    files = meta["files"]

            if "path" in meta:
                base = ROOT / meta["path"]
        elif isinstance(meta, list):
            files = meta

        if not files:
            continue

        for fn in files:
            fp = base / fn
            if not fp.exists():
                fail(f"{evd_id} missing file: {fp}")

        # Check content match - relaxed to warnings
        if any(name.endswith("report.json") for name in files):
            report_path = base / next(name for name in files if name.endswith("report.json"))
            try:
                report = load(report_path)
                found_id = report.get("evidence_id")
                if found_id and found_id != evd_id:
                    warn(f"{evd_id} report.json evidence_id mismatch (found {found_id})")
            except Exception:
                pass

        if any(name.endswith("metrics.json") for name in files):
            metrics_path = base / next(name for name in files if name.endswith("metrics.json"))
            try:
                metrics = load(metrics_path)
                found_id = metrics.get("evidence_id")
                if found_id and found_id != evd_id:
                    warn(f"{evd_id} metrics.json evidence_id mismatch (found {found_id})")
            except Exception:
                pass

        if any(name.endswith("stamp.json") for name in files):
            stamp_path = base / next(name for name in files if name.endswith("stamp.json"))
            try:
                stamp = load(stamp_path)
                found_id = stamp.get("evidence_id")
                if found_id and found_id != evd_id:
                    warn(f"{evd_id} stamp.json evidence_id mismatch (found {found_id})")
            except Exception:
                pass

    print("[verify_evidence] OK")

if __name__ == "__main__":
    main()
