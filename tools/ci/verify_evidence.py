# tools/ci/verify_evidence.py
from __future__ import annotations
import json, os, sys
from typing import Any, Dict, List

REQUIRED_TOP = {"version": int, "items": list}

def die(msg: str) -> None:
    print(f"[verify_evidence] FAIL: {msg}", file=sys.stderr)
    sys.exit(1)

def load_json(path: str) -> Any:
    try:
        with open(path, "r", encoding="utf-8") as f:
            return json.load(f)
    except Exception as e:
        die(f"cannot load {path}: {e}")

def assert_type(obj: Any, t: type, ctx: str) -> None:
    if not isinstance(obj, t):
        die(f"type error at {ctx}: expected {t.__name__}, got {type(obj).__name__}")

def main() -> None:
    root = os.getcwd()
    index_path = os.path.join(root, "evidence", "index.json")
    if not os.path.exists(index_path):
        die(f"missing {index_path}")
    idx = load_json(index_path)

    for k, t in REQUIRED_TOP.items():
        if k not in idx:
            die(f"missing key '{k}' in evidence/index.json")
        assert_type(idx[k], t, f"evidence/index.json:{k}")

    for item in idx["items"]:
        if "evidence_id" not in item or "files" not in item:
            die("each item must include evidence_id and files")
        assert_type(item["evidence_id"], str, "item.evidence_id")
        assert_type(item["files"], dict, f"{item['evidence_id']}.files")

        for req in ("report", "metrics", "stamp"):
            if req not in item["files"]:
                die(f"{item['evidence_id']}: missing files.{req}")
            rel = item["files"][req]
            assert_type(rel, str, f"{item['evidence_id']}.files.{req}")
            abspath = os.path.join(root, rel)
            if not os.path.isfile(abspath):
                die(f"{item['evidence_id']}: missing file on disk: {rel}")

        # Enforce timestamp-only rule: stamp.json may include *_at fields; others must not.
        report = load_json(os.path.join(root, item["files"]["report"]))
        metrics = load_json(os.path.join(root, item["files"]["metrics"]))
        stamp = load_json(os.path.join(root, item["files"]["stamp"]))

        def contains_timestamp_keys(o: Any) -> bool:
            if isinstance(o, dict):
                for kk, vv in o.items():
                    if kk.endswith("_at") or kk in ("timestamp", "retrieved_at"):
                        return True
                    if contains_timestamp_keys(vv):
                        return True
            if isinstance(o, list):
                return any(contains_timestamp_keys(v) for v in o)
            return False

        if contains_timestamp_keys(report) or contains_timestamp_keys(metrics):
            die(f"{item['evidence_id']}: timestamps must be isolated to stamp.json")
        # stamp.json must contain at least one timestamp-like key
        if not contains_timestamp_keys(stamp):
            die(f"{item['evidence_id']}: stamp.json must contain a timestamp-like field")

    print("[verify_evidence] OK")

if __name__ == "__main__":
    main()
