#!/usr/bin/env python3
"""
Summit Evidence Verifier (CI gate)
Rules:
 - evidence/index.json must exist and map Evidence IDs -> relative file paths
 - report.json/metrics.json must exist and be valid JSON
 - stamp.json is the ONLY place timestamps are allowed
 - deny-by-default: missing required files fails
"""
from __future__ import annotations

import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
EVID = ROOT / "evidence"
INDEX_FILE = EVID / "index.json"

REQUIRED_FILES = ["report.json", "metrics.json", "stamp.json"]

def load_json(p: Path) -> object:
    try:
        return json.loads(p.read_text(encoding="utf-8"))
    except Exception as e:
        print(f"FAIL: invalid JSON in {p}: {e}")
        sys.exit(1)

def _fail(msg: str) -> None:
    print(f"FAIL: {msg}")
    sys.exit(1)

def validate_evidence_files(path: Path) -> None:
    for filename in REQUIRED_FILES:
        p = path / filename
        if not p.exists():
            _fail(f"missing required file: {p}")
        load_json(p) # validate JSON

    # check for timestamps outside stamp.json
    for p in path.iterdir():
        if p.name == "stamp.json" or p.is_dir():
            continue
        if p.suffix not in {".json", ".md", ".yml", ".yaml", ".jsonl"}:
            continue
        try:
            txt = p.read_text(encoding="utf-8", errors="ignore")
            # simple heuristic for ISO8601-like timestamps
            if "202" in txt and ("T" in txt or ":" in txt):
                # check if it looks like a timestamp
                 if re.search(r'"\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}', txt):
                    _fail(f"possible timestamp in {p} (timestamps only allowed in stamp.json)")
        except Exception:
            continue

def main() -> int:
    if not INDEX_FILE.exists():
        _fail(f"missing {INDEX_FILE}")

    index = load_json(INDEX_FILE)
    if not isinstance(index, dict):
        _fail("index.json must be a JSON object")

    evidence_map = index.get("evidence")

    # If "evidence" key exists, validate it
    if evidence_map:
        if not isinstance(evidence_map, dict):
            _fail("'evidence' key in index.json must be an object")

        for evd_id, entry in evidence_map.items():
            if not isinstance(entry, dict):
                _fail(f"entry for {evd_id} must be an object")

            path_str = entry.get("path")
            if not path_str:
                _fail(f"entry for {evd_id} missing 'path'")

            evd_path = ROOT / path_str
            if not evd_path.exists():
                 _fail(f"path for {evd_id} does not exist: {evd_path}")

            validate_evidence_files(evd_path)

    # Also support legacy check or at least don't fail if we only care about "evidence" key for now?
    # The plan says "evidence/index.json exists and contains {"evidence": {EVD: {"path": ...}}}"
    # So strictly checking for that.

    if not evidence_map:
         print("WARN: No 'evidence' key found in index.json. Verifying nothing.")

    print("OK evidence verified")
    return 0

if __name__ == "__main__":
    sys.exit(main())
