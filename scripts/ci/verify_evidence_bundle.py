#!/usr/bin/env python3
import json
import os
from pathlib import Path

def main() -> int:
    if os.environ.get("SUMMIT_EVIDENCE_ENFORCE", "1") == "0":
        print("[evidence] enforcement disabled via SUMMIT_EVIDENCE_ENFORCE=0")
        return 0

    required = [
        Path("evidence/index.json"),
        Path("evidence/report.json"),
        Path("evidence/metrics.json"),
        Path("evidence/stamp.json"),
    ]

    missing = [str(path) for path in required if not path.exists()]
    if missing:
        print(f"[evidence] missing files: {missing}")
        return 2

    for path in required:
        try:
            json.loads(path.read_text(encoding="utf-8"))
        except Exception as exc:  # noqa: BLE001 - surface exact parse error
            print(f"[evidence] invalid json: {path}: {exc}")
            return 3

    print("[evidence] bundle validated")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
