from __future__ import annotations

import json
from dataclasses import dataclass
from pathlib import Path

ITEM_ID = "innovator-vl-2601.19325"


@dataclass(frozen=True)
class EvalConfig:
    """Feature flags: deny-by-default for risky components."""

    enable_judge: bool = False
    enable_rl_modules: bool = False
    enable_token_efficiency: bool = False


def _write_json(path: Path, payload: dict) -> None:
    path.write_text(json.dumps(payload, indent=2, sort_keys=True) + "\n")


def write_evidence(root: Path) -> None:
    evidence_dir = root / "evidence"
    evidence_dir.mkdir(parents=True, exist_ok=True)

    report = {
        "item": ITEM_ID,
        "status": "skeleton",
        "notes": [],
    }
    metrics = {
        "metrics": {},
        "warnings": ["no model connected; skeleton only"],
    }

    _write_json(evidence_dir / "report.json", report)
    _write_json(evidence_dir / "metrics.json", metrics)


def main() -> None:
    """
    Minimal harness entrypoint.

    Writes report.json + metrics.json deterministically.
    Timestamp and commit info MUST go only to stamp.json.
    """

    root = Path(__file__).resolve().parents[1]
    write_evidence(root)


if __name__ == "__main__":
    main()
