from __future__ import annotations
import sys
from pathlib import Path

def main() -> int:
    # Check both potential files to be safe
    delta_files = [Path("deps/dependency_delta.md"), Path("deps/dep_delta.md")]
    found = False
    for delta_file in delta_files:
        if delta_file.exists():
            content = delta_file.read_text(encoding="utf-8").strip()
            if len(content) > 50: # Expect some real content
                found = True
                break

    if not found:
        print("ERROR: Dependency delta documentation is missing or too short.")
        print("Please update deps/dependency_delta.md or deps/dep_delta.md.")
        return 1

    print("SUCCESS: Dependency delta documentation verified.")
    return 0

if __name__ == "__main__":
    sys.exit(main())
