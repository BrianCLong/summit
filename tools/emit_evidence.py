#!/usr/bin/env python3
from __future__ import annotations

import argparse
import json
from datetime import UTC, datetime, timezone
from pathlib import Path


def write_json(path: Path, payload: dict) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Emit minimal evidence artifacts (report, metrics, stamp)."
    )
    parser.add_argument("--evidence-id", required=True)
    parser.add_argument("--out", default="evidence/out")
    parser.add_argument("--summary", default="Evidence placeholder.")
    parser.add_argument("--item", default="Kimi K2.5 scaffold")
    args = parser.parse_args()

    base = Path(args.out) / args.evidence_id
    report = {
        "evidence_id": args.evidence_id,
        "item": {"name": args.item},
        "summary": args.summary,
        "artifacts": [],
    }
    metrics = {"evidence_id": args.evidence_id, "metrics": {}}
    stamp = {
        "evidence_id": args.evidence_id,
        "created_at": datetime.now(UTC).isoformat(),
    }

    write_json(base / "report.json", report)
    write_json(base / "metrics.json", metrics)
    write_json(base / "stamp.json", stamp)


if __name__ == "__main__":
    main()
