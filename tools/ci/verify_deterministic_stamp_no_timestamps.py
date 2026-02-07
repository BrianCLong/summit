import json
import re
import sys
from pathlib import Path

TIMESTAMP_PATTERN = re.compile(r"\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}")


def main() -> None:
    stamp_path = Path(sys.argv[1]) if len(sys.argv) > 1 else Path("artifacts/deterministic/stamp.json")
    if not stamp_path.exists():
        raise SystemExit(f"Deterministic stamp not found at {stamp_path}")

    content = stamp_path.read_text(encoding="utf-8")
    if TIMESTAMP_PATTERN.search(content):
        raise SystemExit("Deterministic stamp contains timestamp-like values")

    json.loads(content)
    print("PASS: Deterministic stamp contains no timestamps")


if __name__ == "__main__":
    main()
