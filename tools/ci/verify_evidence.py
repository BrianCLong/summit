#!/usr/bin/env python3
import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
NARDOM_ID = re.compile(r"^EVD-NARDOM-[A-Z]+-[0-9]{3}$")

def fail(msg: str) -> None:
    print(f"[verify_evidence] FAIL: {msg}", file=sys.stderr)
    raise SystemExit(1)

def load(p: Path):
    try:
        return json.loads(p.read_text(encoding="utf-8"))
    except Exception as e:
        fail(f"cannot read/parse {p}: {e}")

def contains_time_keys(data) -> bool:
    if isinstance(data, dict):
        for key, value in data.items():
            lower_key = key.lower()
            if (
                "timestamp" in lower_key
                or lower_key == "time"
                or lower_key.endswith("_time")
                or lower_key.endswith("_timestamp")
                or lower_key.endswith("_at")
            ):
                return True
            if contains_time_keys(value):
                return True
    elif isinstance(data, list):
        for item in data:
            if contains_time_keys(item):
                return True
    return False

def main() -> None:
    idx_path = ROOT / "evidence" / "index.json"
    if not idx_path.exists():
        fail("missing evidence/index.json")
    idx = load(idx_path)

    map_entries = idx.get("map", {})
    if map_entries:
        if not isinstance(map_entries, dict):
            fail("evidence/index.json 'map' must be an object")
        for evd_id, artifacts in map_entries.items():
            if not NARDOM_ID.match(evd_id):
                fail(f"invalid narrative evidence id: {evd_id}")
            if not isinstance(artifacts, list) or not artifacts:
                fail(f"{evd_id} must map to a non-empty list of artifacts")
            for artifact in artifacts:
                if not isinstance(artifact, str):
                    fail(f"{evd_id} artifact paths must be strings")
                fp = ROOT / artifact
                if not fp.exists():
                    fail(f"{evd_id} missing file: {fp}")
                if fp.name != "stamp.json":
                    payload = load(fp)
                    if contains_time_keys(payload):
                        fail(
                            f"{evd_id} timestamps must be isolated to stamp.json: {fp}"
                        )

    items = idx.get("items", {})
    if not isinstance(items, dict) or not items:
        fail("evidence/index.json must contain non-empty 'items' map")

    for evd_id, meta in items.items():
        if "path" not in meta:
            # Skip legacy items or items not following the new schema
            continue

        base = ROOT / meta["path"]
        files = meta.get("files", [])
        for fn in files:
            fp = base / fn
            if not fp.exists():
                fail(f"{evd_id} missing file: {fp}")

        # enforce timestamp isolation: only stamp.json may contain time-like fields
        if "report.json" in files:
            report = load(base / "report.json")
            if report.get("evidence_id") != evd_id:
                fail(f"{evd_id} report.json evidence_id mismatch")

        if "metrics.json" in files:
            metrics = load(base / "metrics.json")
            if metrics.get("evidence_id") != evd_id:
                fail(f"{evd_id} metrics.json evidence_id mismatch")

        if "stamp.json" in files:
            stamp = load(base / "stamp.json")
            if stamp.get("evidence_id") != evd_id:
                fail(f"{evd_id} stamp.json evidence_id mismatch")
            if "generated_at_utc" not in stamp:
                fail(f"{evd_id} stamp.json missing generated_at_utc")

    print("[verify_evidence] OK")

if __name__ == "__main__":
    main()
