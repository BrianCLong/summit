"""Pipeline entrypoint for decentralized AI assurance evaluation."""

from __future__ import annotations

import json
import os
from pathlib import Path
from typing import Any

from summit.subsumption.decentralized_ai.scorecard import DecentralizedAIScorecard


def run(evidence_bundle: dict[str, Any], output_dir: Path) -> dict[str, Any]:
    if os.getenv("ENABLE_DAI_SUBSUMPTION", "false").lower() != "true":
        raise RuntimeError("ENABLE_DAI_SUBSUMPTION must be true to run decentralized AI pipeline")

    output_dir.mkdir(parents=True, exist_ok=True)
    artifacts = DecentralizedAIScorecard(version="v0").evaluate(evidence_bundle)

    for name in ["report", "metrics", "stamp"]:
        output_path = output_dir / f"{name}.json"
        output_path.write_text(
            json.dumps(artifacts[name], sort_keys=True, indent=2) + "\n",
            encoding="utf-8",
        )

    return artifacts
