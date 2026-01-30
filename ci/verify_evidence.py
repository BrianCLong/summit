#!/usr/bin/env python3
from __future__ import annotations
import json, sys, pathlib
from jsonschema import Draft202012Validator

ROOT = pathlib.Path(__file__).resolve().parents[1]
SCHEMAS = ROOT / "schemas" / "evidence"
EVIDENCE = ROOT / "evidence"

def _load(p: pathlib.Path):
    return json.loads(p.read_text(encoding="utf-8"))

def main() -> int:
    index_p = EVIDENCE / "index.json"
    if not index_p.exists():
        print("missing evidence/index.json")
        return 2

    index = _load(index_p)
    Draft202012Validator(_load(SCHEMAS / "index.schema.json")).validate(index)

    # index["evidence"] is validated by schema to be a dict
    for evd_id, rel in index["evidence"].items():
        base = EVIDENCE / rel
        report = _load(base / "report.json")
        metrics = _load(base / "metrics.json")
        stamp = _load(base / "stamp.json")

        Draft202012Validator(_load(SCHEMAS / "report.schema.json")).validate(report)
        Draft202012Validator(_load(SCHEMAS / "metrics.schema.json")).validate(metrics)
        Draft202012Validator(_load(SCHEMAS / "stamp.schema.json")).validate(stamp)

        # Hard rule: timestamps only allowed in stamp.json
        def find_timestamps(obj, path=""):
            if isinstance(obj, dict):
                for k, v in obj.items():
                    if "time" in k.lower() or "timestamp" in k.lower():
                        raise AssertionError(f"timestamp-like field in {path}/{k} for {evd_id}")
                    find_timestamps(v, f"{path}/{k}")
            elif isinstance(obj, list):
                for i, v in enumerate(obj):
                    find_timestamps(v, f"{path}[{i}]")

        find_timestamps(report, "report.json")
        find_timestamps(metrics, "metrics.json")

    print("evidence verification: OK")
    return 0

if __name__ == "__main__":
    sys.exit(main())
