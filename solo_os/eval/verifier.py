import json
import sys
from pathlib import Path


def main() -> int:
    root = Path("solo_os")
    idx = root / "evidence" / "index.json"
    if not idx.exists():
        print("missing solo_os/evidence/index.json")
        return 1

    try:
        data = json.loads(idx.read_text(encoding="utf-8"))
    except json.JSONDecodeError:
        print("invalid JSON in solo_os/evidence/index.json")
        return 1

    if "item_slug" not in data or "evidence" not in data:
        print("invalid evidence index shape")
        return 1

    if data["item_slug"] != "ENTRE-502318":
        print(f"expected item_slug ENTRE-502318, got {data['item_slug']}")
        return 1

    print("Solo OS verification passed")
    return 0

if __name__ == "__main__":
    raise SystemExit(main())
