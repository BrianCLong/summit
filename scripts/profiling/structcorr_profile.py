#!/usr/bin/env python3
from __future__ import annotations

import json
import os
import time
from pathlib import Path

from summit.structcorr.runner import run_structcorr


def main() -> None:
    os.environ["SUMMIT_STRUCTCORR"] = "1"
    sample_payloads = [
        {"kind": "json", "payload": '{"id": 1, "name": "x"}', "contract": {"required_keys": ["id"]}},
        {"kind": "sql", "payload": "SELECT 1", "contract": {}},
        {"kind": "md_table", "payload": "| h | v |\n| --- | --- |\n| a | b |"},
        {"kind": "latex", "payload": r"\\textit{ok}", "contract": {"max_chars": 500}},
    ]

    start = time.perf_counter()
    run_structcorr(sample_payloads)
    elapsed_ms = (time.perf_counter() - start) * 1000

    profile = {
        "docs": len(sample_payloads),
        "elapsed_ms": round(elapsed_ms, 3),
        "avg_ms_per_doc": round(elapsed_ms / len(sample_payloads), 3),
    }

    out_path = Path("artifacts/structcorr/profile.json")
    out_path.parent.mkdir(parents=True, exist_ok=True)
    out_path.write_text(json.dumps(profile, sort_keys=True, separators=(",", ":")) + "\n", encoding="utf-8")
    print(f"Wrote {out_path}")


if __name__ == "__main__":
    main()
