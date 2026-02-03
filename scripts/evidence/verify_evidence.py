#!/usr/bin/env python3
"""
CI verifier for Summit evidence artifacts.
TODO: wire into actual CI job name once required checks are discovered.
"""
import json
import sys
from pathlib import Path


def main() -> int:
  idx = Path("evidence/index.json")
  if not idx.exists():
    print("missing evidence/index.json")
    return 2
  try:
    data = json.loads(idx.read_text(encoding="utf-8"))
  except json.JSONDecodeError:
    print("invalid index.json: not valid json")
    return 2

  if "items" not in data:
    print("invalid index.json: missing items")
    return 2

  for it in data["items"]:
    for k in ("report","metrics","stamp"):
      if k not in it:
         print(f"missing key {k} in item {it}")
         return 2
      p = Path(it[k])
      if not p.exists():
        print(f"missing {k} file: {p}")
        return 2
  print("evidence ok")
  return 0

if __name__ == "__main__":
  raise SystemExit(main())
