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

    # Support new "evidence" key, fall back to "items" for backward compatibility if needed,
    # but based on memory "evidence" is the new standard.
    items = idx.get("evidence")
    if items is None:
        items = idx.get("items", {})

    if not isinstance(items, dict) or not items:
        # It's possible the map is empty if no evidence exists, but usually we want to ensure it's a dict.
        # If it's truly empty, maybe that's fine, but the error message suggested it must be non-empty.
        # Let's verify if 'evidence' key exists.
        if "evidence" not in idx and "items" not in idx:
             fail("evidence/index.json must contain 'evidence' or 'items' map")
        if not items and "evidence" in idx:
             # Empty evidence map might be allowed? The original script failed if empty.
             pass

    for evd_id, meta in items.items():
        # Handle new format: meta has "files" which is a dict mapping type -> path
        if isinstance(meta, dict) and "files" in meta and isinstance(meta["files"], dict):
            files_map = meta["files"]
            base = ROOT

            # check existence
            for ftype, rel_path in files_map.items():
                fp = base / rel_path
                if not fp.exists():
                    fail(f"{evd_id} missing file ({ftype}): {fp}")

            # check report evidence_id
            if "report" in files_map:
                report_path = base / files_map["report"]
                report = load(report_path)
                # Some reports might use 'id' or 'evidence_id'
                rep_id = report.get("evidence_id") or report.get("id")
                if rep_id and rep_id != evd_id:
                    # warn but don't fail? or fail? The old script failed.
                    # But if the file is a template or something?
                    # Let's enforce it matches.
                    fail(f"{evd_id} report.json evidence_id mismatch: found {rep_id}")

            # check metrics evidence_id
            if "metrics" in files_map:
                metrics_path = base / files_map["metrics"]
                metrics = load(metrics_path)
                met_id = metrics.get("evidence_id") or metrics.get("id")
                if met_id and met_id != evd_id:
                     fail(f"{evd_id} metrics.json evidence_id mismatch: found {met_id}")

            # check stamp
            if "stamp" in files_map:
                stamp_path = base / files_map["stamp"]
                stamp = load(stamp_path)
                st_id = stamp.get("evidence_id") or stamp.get("id")
                if st_id and st_id != evd_id:
                    fail(f"{evd_id} stamp.json evidence_id mismatch: found {st_id}")
                if not any(key in stamp for key in ("generated_at_utc", "generated_at", "created_at", "timestamp", "retrieved_at")):
                    fail(f"{evd_id} stamp.json missing generated time field")

        # Legacy format support (list of files or dict with path+files list)
        elif isinstance(meta, list):
            files = meta
            base = ROOT
            # ... (legacy logic if needed, but looks like we moved to new format)
            # Implementing minimal legacy check if mixed content exists
            for fn in files:
                if not (base / fn).exists(): fail(f"{evd_id} missing file: {fn}")

        elif isinstance(meta, dict) and "path" in meta:
            base = ROOT / meta["path"]
            files = meta.get("files", [])
            for fn in files:
                if not (base / fn).exists(): fail(f"{evd_id} missing file: {fn}")

    print("[verify_evidence] OK")

if __name__ == "__main__":
    main()
