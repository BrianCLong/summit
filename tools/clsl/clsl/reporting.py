from __future__ import annotations

from pathlib import Path
from typing import Dict, Sequence

from .evaluator import EvaluationRun
from .utils import dump_json


def export_summary(runs: Sequence[EvaluationRun], output_path: Path) -> Path:
  payload = []
  for run in runs:
    payload.append(
        {
            "run": run.name,
            "thresholds": run.thresholds,
            "auc": run.auc,
            "breakpoints": run.breakpoints,
        }
    )
  dump_json(output_path, payload)
  return output_path
