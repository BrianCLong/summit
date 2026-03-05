"""Artifact emission for deterministic explainability reports."""

from __future__ import annotations

import hashlib
import json
from pathlib import Path
from typing import Any

from .engine import ExplainResult
from .schema import validate_metrics_shape, validate_report_shape


def _canonical_json(payload: dict[str, Any]) -> str:
    return json.dumps(payload, sort_keys=True, indent=2) + "\n"


def write_artifacts(
    output_dir: str | Path,
    model_id: str,
    feature_names: list[str],
    result: ExplainResult,
) -> tuple[Path, Path, Path]:
    out = Path(output_dir)
    out.mkdir(parents=True, exist_ok=True)

    report = {
        "evidence_id": result.evidence_id,
        "model_id": model_id,
        "feature_names": feature_names,
        "feature_importance": result.feature_importance,
        "interaction_matrix": result.interaction_matrix,
        "decision_breakdown": result.decision_breakdown,
    }
    validate_report_shape(report)
    validate_metrics_shape(result.metrics)

    report_text = _canonical_json(report)
    metrics_text = _canonical_json(result.metrics)

    report_path = out / "report.json"
    metrics_path = out / "metrics.json"
    report_path.write_text(report_text, encoding="utf-8")
    metrics_path.write_text(metrics_text, encoding="utf-8")

    stamp_hash = hashlib.sha256((report_text + metrics_text).encode("utf-8")).hexdigest()
    stamp = {"artifact_sha256": stamp_hash}
    stamp_text = _canonical_json(stamp)
    stamp_path = out / "stamp.json"
    stamp_path.write_text(stamp_text, encoding="utf-8")

    return report_path, metrics_path, stamp_path
