from __future__ import annotations
import sys
from pathlib import Path

def main() -> int:
    bad = []
    # Search in deploy and examples
    search_dirs = [Path("deploy"), Path("examples")]
    for search_dir in search_dirs:
        if not search_dir.exists():
            continue
        for p in search_dir.rglob("*.y*ml"):
            try:
                txt = p.read_text(encoding="utf-8")
                if ":latest" in txt:
                    bad.append(str(p))
            except Exception:
                continue

    if bad:
        print("ERROR: ':latest' tags are not allowed in deploy manifests:")
        for b in bad:
            print(f" - {b}")
        return 2

    print("SUCCESS: No ':latest' tags found.")
    return 0

if __name__ == "__main__":
    sys.exit(main())
