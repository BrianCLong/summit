from __future__ import annotations

from pathlib import Path


def main() -> int:
  root = Path("evidence")
  if not root.exists():
    print("evidence/: missing")
    return 1

  required = [
    "README.md",
    "report.schema.json",
    "metrics.schema.json",
    "stamp.schema.json",
    "index.schema.json",
  ]
  for rel in required:
    if not (root / rel).exists():
      print(f"evidence/{rel}: missing")
      return 1

  print("evidence core present")
  return 0


if __name__ == "__main__":
  raise SystemExit(main())
