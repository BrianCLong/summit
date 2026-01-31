#!/usr/bin/env python3
import json, sys, pathlib

ROOT = pathlib.Path(__file__).resolve().parents[2]

def load(p: pathlib.Path):
  return json.loads(p.read_text(encoding="utf-8"))

def main() -> int:
  idx = ROOT / "evidence" / "index.json"
  if not idx.exists():
    print("missing evidence/index.json")
    return 1
  index = load(idx)
  itemslug = index.get("itemslug")
  if not itemslug:
    print("index.json missing itemslug")
    return 1
  for ev in index.get("evidence", []):
    for rel in ev.get("files", []):
      fp = ROOT / rel
      if not fp.exists():
        print(f"missing evidence file: {rel}")
        return 1
  print("evidence ok")
  return 0

if __name__ == "__main__":
  raise SystemExit(main())
