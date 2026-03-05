from __future__ import annotations

import json
import os
from datetime import UTC, datetime, timezone
from pathlib import Path

EVIDENCE_ID = "EVD-QWEN3ASR06B-EVAL-001"


def write_json(path: Path, payload: dict) -> None:
    path.write_text(json.dumps(payload, indent=2, sort_keys=True), encoding="utf-8")


def main() -> int:
    if os.getenv("EVAL_ASR_RUNNER", "0") != "1":
        print("eval runner disabled by default (set EVAL_ASR_RUNNER=1)")
        return 2

    outdir = Path(os.getenv("EVIDENCE_OUTDIR", "evidence/runs/qwen3-asr-0.6b"))
    outdir.mkdir(parents=True, exist_ok=True)

    report = {
        "evidence_id": EVIDENCE_ID,
        "item": {
            "hf_model": "Qwen/Qwen3-ASR-0.6B",
            "license": "Apache-2.0",
            "paper": "arXiv:2601.21337",
        },
        "summary": {"status": "scaffold_only"},
        "artifacts": ["report.json", "metrics.json", "stamp.json", "index.json"],
    }
    metrics = {
        "evidence_id": EVIDENCE_ID,
        "metrics": {"note": "Deferred pending fixture-backed evals"},
    }
    stamp = {
        "evidence_id": EVIDENCE_ID,
        "created_at": datetime.now(UTC).isoformat(),
    }
    index = {
        "version": "1.0",
        "items": [
            {
                "evidence_id": EVIDENCE_ID,
                "files": ["report.json", "metrics.json", "stamp.json"]
            }
        ],
    }

    write_json(outdir / "report.json", report)
    write_json(outdir / "metrics.json", metrics)
    write_json(outdir / "stamp.json", stamp)
    write_json(outdir / "index.json", index)
    print(f"Wrote evidence to {outdir}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
