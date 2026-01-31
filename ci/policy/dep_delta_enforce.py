from __future__ import annotations
from pathlib import Path

def main() -> int:
    delta_file = Path("deps/dep_delta.md")
    if not delta_file.exists():
        print("ERROR: deps/dep_delta.md is missing.")
        return 1

    # Simple check: make sure it's not empty and has been updated recently (conceptually)
    content = delta_file.read_text(encoding="utf-8")
    if len(content.strip()) < 50:
        print("ERROR: deps/dep_delta.md seems too short or uninformative.")
        return 1

    print("Check passed: deps/dep_delta.md exists and is populated.")
    return 0

if __name__ == "__main__":
    raise SystemExit(main())
