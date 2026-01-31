import json
from dataclasses import dataclass
from pathlib import Path


@dataclass(frozen=True)
class CogWarRun:
    run_id: str
    out_dir: Path

def write_metrics(run: CogWarRun, metrics: dict) -> None:
    run.out_dir.mkdir(parents=True, exist_ok=True)
    (run.out_dir / "metrics.json").write_text(json.dumps(metrics, indent=2, sort_keys=True))
