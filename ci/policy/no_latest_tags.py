from __future__ import annotations
import sys
from pathlib import Path

def main() -> int:
    bad = []
    # Check both .yml and .yaml files in deploy directory
    for p in Path("deploy").rglob("*.y*ml"):
        try:
            txt = p.read_text(encoding="utf-8")
            if ":latest" in txt:
                bad.append(str(p))
        except Exception as e:
            print(f"Warning: Could not read {p}: {e}")

    if bad:
        print("ERROR: ':latest' tags are not allowed in deploy manifests:")
        for b in bad:
            print(f" - {b}")
        return 2

    print("Check passed: No ':latest' tags found in deploy manifests.")
    return 0

if __name__ == "__main__":
    raise SystemExit(main())
