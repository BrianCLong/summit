import json
import os
from pathlib import Path
from summit.schemas.explanation import ExplanationReport, ExplainMetrics, Stamp

def write_explain_bundle(path: str, report: ExplanationReport, metrics: ExplainMetrics) -> None:
    # Deterministic relative path for artifact storage
    # Use basename to avoid directory traversal
    safe_name = os.path.basename(path)
    if not safe_name:
        raise ValueError("Invalid path for writing artifact bundle.")

    base_dir = Path("artifacts/summit/explain") / safe_name
    base_dir.mkdir(parents=True, exist_ok=True)

    with open(base_dir / "report.json", "w", encoding="utf-8") as f:
        f.write(report.model_dump_json(indent=2))

    with open(base_dir / "metrics.json", "w", encoding="utf-8") as f:
        f.write(metrics.model_dump_json(indent=2))

    stamp = Stamp(
        evidence_id="SUMMIT:STAMP:0001",
        path=path
    )
    with open(base_dir / "stamp.json", "w", encoding="utf-8") as f:
        f.write(stamp.model_dump_json(indent=2))
