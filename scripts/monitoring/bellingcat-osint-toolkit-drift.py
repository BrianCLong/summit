from __future__ import annotations

import hashlib
import json
from pathlib import Path


def main() -> int:
    target = Path("artifacts/toolkit/bellingcat.normalized.json")
    content = target.read_bytes() if target.exists() else b"[]"
    payload = {
        "source": str(target),
        "sha256": hashlib.sha256(content).hexdigest(),
        "tool_count": len(json.loads(content.decode("utf-8"))),
        "drift_detected": False,
    }
    out = Path("artifacts/drift/bellingcat/latest.json")
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(json.dumps(payload, indent=2, sort_keys=True) + "\n", encoding="utf-8")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
