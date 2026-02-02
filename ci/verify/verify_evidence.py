#!/usr/bin/env python3
import json
import os
import sys

REQUIRED_KEYS = ["version", "items"]

def die(msg: str) -> None:
  print(f"[verify_evidence] FAIL: {msg}")
  sys.exit(1)

def main() -> None:
  path = "evidence/index.json"
  if not os.path.exists(path):
    die("missing evidence/index.json")
  data = json.load(open(path, "r", encoding="utf-8"))
  for k in REQUIRED_KEYS:
    if k not in data:
      die(f"missing key: {k}")
  if not isinstance(data["items"], list) or len(data["items"]) == 0:
    die("items must be a non-empty list")
  for item in data["items"]:
    evid = item.get("evidence_id")
    paths = item.get("paths", {})
    if not evid or not isinstance(paths, dict):
      die("each item must include evidence_id and paths")
    for label in ["report", "metrics", "stamp"]:
      p = paths.get(label)
      if not p:
        die(f"{evid}: missing {label} path")
      if not os.path.exists(p):
        die(f"{evid}: missing file {p}")
  print("[verify_evidence] PASS")

if __name__ == "__main__":
  main()
