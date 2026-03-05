import json
from pathlib import Path
from typing import Iterable, List


def evaluate(scores: Iterable[float], threshold: float = 0.8) -> dict:
    values: List[float] = sorted(float(score) for score in scores)
    average = sum(values) / len(values) if values else 0.0
    return {
        "scores": values,
        "average": round(average, 3),
        "threshold": threshold,
        "pass": average >= threshold,
    }


def write_eval_report(path: Path, report: dict) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", encoding="utf-8") as handle:
        json.dump(report, handle, sort_keys=True, indent=2)
        handle.write("\n")
