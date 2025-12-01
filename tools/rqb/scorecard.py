"""Scorecard export helpers."""

from __future__ import annotations

import json
from pathlib import Path
from typing import Union

from .evaluation import BenchmarkResult


def export_scorecard(result: BenchmarkResult, destination: Union[str, Path]) -> Path:
    """Write the benchmark result to a JSON scorecard."""

    path = Path(destination)
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", encoding="utf-8") as handle:
        json.dump(result.to_dict(), handle, indent=2, sort_keys=True)
    return path
