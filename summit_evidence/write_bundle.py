"""Write deterministic evidence bundles for OSS LLM exposure gates."""

from __future__ import annotations

import argparse
import json
from dataclasses import dataclass
from datetime import UTC, datetime, timezone
from pathlib import Path
from typing import Dict, List


@dataclass(frozen=True)
class EvidenceFinding:
    evidence_id: str
    severity: str
    summary: str


def build_bundle(mode: str, findings: list[EvidenceFinding] | None = None) -> dict[str, dict]:
    """Build evidence bundle payloads as Python dictionaries."""
    findings = findings or []
    report = {
        "item": {
            "slug": "ossllm-exposure",
            "source": "public-research",
            "date": "2026-01-29",
        },
        "run": {
            "mode": mode,
            "environment": "local",
        },
        "findings": [
            {
                "evidence_id": finding.evidence_id,
                "severity": finding.severity,
                "summary": finding.summary,
            }
            for finding in findings
        ],
    }

    metrics = {
        "schema_version": "1.0",
        "counters": {
            "evidence.findings.count": float(len(findings)),
        },
        "gauges": {},
    }

    stamp = {
        "generated_at": datetime.now(UTC).isoformat(),
        "mode": mode,
    }

    index = {
        "bundle_id": "EVD-OSSLLM-MISUSE-BUNDLE-001",
        "artifacts": {
            "report": "report.json",
            "metrics": "metrics.json",
            "stamp": "stamp.json",
        },
    }

    return {
        "report": report,
        "metrics": metrics,
        "stamp": stamp,
        "index": index,
    }


def _write_json(path: Path, payload: dict) -> None:
    path.write_text(json.dumps(payload, indent=2, sort_keys=True) + "\n", encoding="utf-8")


def write_bundle(out_dir: Path, mode: str) -> dict[str, dict]:
    """Write evidence bundle JSON files to the output directory."""
    out_dir.mkdir(parents=True, exist_ok=True)
    bundle = build_bundle(mode=mode)

    _write_json(out_dir / "report.json", bundle["report"])
    _write_json(out_dir / "metrics.json", bundle["metrics"])
    _write_json(out_dir / "stamp.json", bundle["stamp"])
    _write_json(out_dir / "index.json", bundle["index"])
    return bundle


def main() -> None:
    parser = argparse.ArgumentParser(description="Write Summit evidence bundle.")
    parser.add_argument("--out", type=Path, default=Path("evidence"))
    parser.add_argument("--mode", type=str, default="audit")
    args = parser.parse_args()

    write_bundle(out_dir=args.out, mode=args.mode)


if __name__ == "__main__":
    main()
