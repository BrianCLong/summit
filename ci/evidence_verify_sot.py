#!/usr/bin/env python3
"""
Evidence verifier (deny-by-default) for Society of Thought (SoT).
Rules:
 - evidence/index.json must exist and list evidence IDs
 - each evidence ID must have report.json, metrics.json, stamp.json
 - timestamps ONLY allowed in stamp.json
"""
from __future__ import annotations

import json
import pathlib
import re
import sys

ROOT = pathlib.Path(__file__).resolve().parents[1]
EVIDENCE = ROOT / "evidence"
INDEX = EVIDENCE / "index.json"

# ISO-8601 like timestamp pattern
ISO_TS_RE = re.compile(r"\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}")

def _load(p: pathlib.Path) -> dict:
  try:
    return json.loads(p.read_text(encoding="utf-8"))
  except Exception as e:
    print(f"FAIL: could not load {p}: {e}", file=sys.stderr)
    sys.exit(2)

def _scan_for_timestamp(obj) -> bool:
  if isinstance(obj, dict):
    return any(_scan_for_timestamp(v) for v in obj.values())
  if isinstance(obj, list):
    return any(_scan_for_timestamp(v) for v in obj)
  if isinstance(obj, str):
    return bool(ISO_TS_RE.search(obj))
  return False

def main() -> int:
  if not INDEX.exists():
    print("FAIL: missing evidence/index.json", file=sys.stderr)
    return 2

  idx = _load(INDEX)
  items = idx.get("items", [])
  if not items:
    print("FAIL: evidence/index.json has no items", file=sys.stderr)
    return 2

  for it in items:
    evid = it.get("evidence_id")
    files_map = it.get("files", {})

    paths = {}
    for key in ("report", "metrics", "stamp"):
      rel = files_map.get(key) or it.get(key)
      if not rel:
        print(f"FAIL: {evid} missing file mapping for {key}", file=sys.stderr)
        return 2
      path = ROOT / rel
      if not path.exists():
        print(f"FAIL: {evid} missing file: {rel}", file=sys.stderr)
        return 2
      paths[key] = path

    report = _load(paths["report"])
    metrics = _load(paths["metrics"])
    stamp = _load(paths["stamp"])

    # deny timestamps outside stamp
    if _scan_for_timestamp(report) or _scan_for_timestamp(metrics):
      print(f"FAIL: {evid} timestamps found outside stamp.json", file=sys.stderr)
      return 2

    if not _scan_for_timestamp(stamp):
      print(f"FAIL: {evid} stamp.json must contain at least one timestamp", file=sys.stderr)
      return 2

  print("OK: evidence verified")
  return 0

if __name__ == "__main__":
  sys.exit(main())
