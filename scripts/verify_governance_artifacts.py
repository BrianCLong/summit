#!/usr/bin/env python3
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
REQ = [
  ROOT/"governance"/"risk.json",
  ROOT/"governance"/"policy.json",
  ROOT/"governance"/"discrimination_risk.json",
  ROOT/"templates"/"model_card.md",
]

def main() -> int:
  missing = [str(p.relative_to(ROOT)) for p in REQ if not p.exists()]
  if missing:
    print("FAIL deny-by-default: missing governance artifacts:", missing)
    return 2
  print("OK governance artifacts present")
  return 0

if __name__ == "__main__":
  sys.exit(main())
