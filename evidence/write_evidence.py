import json
from pathlib import Path
from typing import Any, Dict, Iterable

NEVER_LOG_FIELDS = {"pii", "secret", "access_token", "private_financials"}


def redact_fields(payload: dict[str, Any], fields: Iterable[str]) -> dict[str, Any]:
    return {key: value for key, value in payload.items() if key not in fields}


def write_json(path: Path, payload: dict[str, Any]) -> None:
    path.write_text(json.dumps(payload, sort_keys=True) + "\n")


def write_evidence_bundle(
    base_dir: Path,
    evidence_id: str,
    report: dict[str, Any],
    metrics: dict[str, Any],
    stamp: dict[str, Any]
) -> dict[str, str]:
    evidence_dir = base_dir / evidence_id
    evidence_dir.mkdir(parents=True, exist_ok=True)

    sanitized_report = redact_fields(report, NEVER_LOG_FIELDS)
    sanitized_metrics = redact_fields(metrics, NEVER_LOG_FIELDS)

    report_path = evidence_dir / "report.json"
    metrics_path = evidence_dir / "metrics.json"
    stamp_path = evidence_dir / "stamp.json"

    write_json(report_path, sanitized_report)
    write_json(metrics_path, sanitized_metrics)
    write_json(stamp_path, stamp)

    return {
        "report": str(report_path),
        "metrics": str(metrics_path),
        "stamp": str(stamp_path)
    }
