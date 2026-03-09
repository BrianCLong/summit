from __future__ import annotations
from pathlib import Path
import json

def write_evidence_bundle(out_dir: Path, report: dict, metrics: dict, stamp: dict) -> None:
    out_dir.mkdir(parents=True, exist_ok=True)
    (out_dir / "report.json").write_text(json.dumps(report, indent=2, sort_keys=True) + "\n", encoding="utf-8")
    (out_dir / "metrics.json").write_text(json.dumps(metrics, indent=2, sort_keys=True) + "\n", encoding="utf-8")
    (out_dir / "stamp.json").write_text(json.dumps(stamp, indent=2, sort_keys=True) + "\n", encoding="utf-8")
