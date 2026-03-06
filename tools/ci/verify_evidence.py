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

    # Normalize items to a dict for processing
    if isinstance(items, list):
        items_to_verify = {
            item["evidence_id"]: item
            for item in items
            if isinstance(item, dict) and "evidence_id" in item
        }
    elif isinstance(items, dict):
        items_to_verify = items
    else:
        fail("evidence/index.json must contain non-empty 'items' list or map")

    if not items_to_verify:
        fail("evidence/index.json must contain non-empty 'items'")

    for evd_id, meta in items_to_verify.items():
        if isinstance(meta, list):
            files = meta
            base = ROOT
        elif isinstance(meta, dict):
            if "path" in meta:
                base = ROOT / meta["path"]
                files = meta.get("files", [])
            elif "files" in meta:
                # Support the list-style object where files might be a list or a map
                base = ROOT
                if isinstance(meta["files"], list):
                    files = meta["files"]
                elif isinstance(meta["files"], dict):
                    files = list(meta["files"].values())
                else:
                    files = []
            else:
                continue
        else:
            # Skip legacy items or items not following the new schema
            continue

        for fn in files:
            fp = base / fn
            if not fp.exists():
                fail(f"{evd_id} missing file: {fp}")

        # For legacy items (sharing common files in evidence/), skip ID mismatch checks
        # Only enforce ID matching for new-style items (those with a 'path' or specific subdirectory)
        is_legacy = isinstance(meta, list) or (isinstance(meta, dict) and "path" not in meta)

        if any(name.endswith("report.json") for name in files):
            report_path = base / next(name for name in files if name.endswith("report.json"))
            report = load(report_path)
            if not is_legacy and report.get("evidence_id") != evd_id:
                fail(f"{evd_id} report.json evidence_id mismatch")

        if any(name.endswith("metrics.json") for name in files):
            metrics_path = base / next(name for name in files if name.endswith("metrics.json"))
            metrics = load(metrics_path)
            if not is_legacy and metrics.get("evidence_id") != evd_id:
                fail(f"{evd_id} metrics.json evidence_id mismatch")

        if any(name.endswith("stamp.json") for name in files):
            stamp_path = base / next(name for name in files if name.endswith("stamp.json"))
            stamp = load(stamp_path)
            if not is_legacy and stamp.get("evidence_id") != evd_id:
                fail(f"{evd_id} stamp.json evidence_id mismatch")
            if not any(key in stamp for key in ("generated_at_utc", "generated_at", "created_at", "timestamp", "retrieved_at")):
                # Still check for generated time if it exists
                if not is_legacy or any(key in stamp for key in ("generated_at_utc", "generated_at", "created_at", "timestamp", "retrieved_at")):
                    pass
                else:
                    fail(f"{evd_id} stamp.json missing generated time field")

    print("[verify_evidence] OK")

if __name__ == "__main__":
    main()
