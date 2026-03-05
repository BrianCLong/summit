"""Evidence writer for deterministic agent operations."""

from __future__ import annotations

import json
from dataclasses import dataclass
from datetime import UTC, datetime, timezone
from pathlib import Path
from typing import Any, Mapping


class EvidenceWriterError(ValueError):
    """Raised when evidence artifacts violate determinism constraints."""


def _ensure_no_timestamp_fields(payload: Mapping[str, Any], label: str) -> None:
    for key in payload.keys():
        if "timestamp" in key.lower() or key.lower() in {"created_at", "createdat"}:
            raise EvidenceWriterError(
                f"{label} contains timestamp field '{key}'. Use stamp.json only."
            )


def _write_json(path: Path, payload: Mapping[str, Any]) -> None:
    path.write_text(
        json.dumps(payload, indent=2, sort_keys=True) + "\n",
        encoding="utf-8",
    )


@dataclass(frozen=True)
class EvidenceWriter:
    base_dir: Path

    def write_bundle(
        self,
        *,
        run_id: str,
        evidence_id: str,
        report: Mapping[str, Any],
        metrics: Mapping[str, Any],
    ) -> dict[str, Path]:
        _ensure_no_timestamp_fields(report, "report")
        _ensure_no_timestamp_fields(metrics, "metrics")

        run_dir = self.base_dir / run_id
        run_dir.mkdir(parents=True, exist_ok=True)

        report_payload = {**report, "evidence_id": evidence_id}
        metrics_payload = {**metrics, "evidence_id": evidence_id}
        stamp_payload = {
            "evidence_id": evidence_id,
            "run_id": run_id,
            "created_at": datetime.now(UTC).isoformat(),
        }

        report_path = run_dir / "report.json"
        metrics_path = run_dir / "metrics.json"
        stamp_path = run_dir / "stamp.json"
        _write_json(report_path, report_payload)
        _write_json(metrics_path, metrics_payload)
        _write_json(stamp_path, stamp_payload)

        index_path = self.base_dir / "index.json"
        index_payload = {
            "evidence": [
                {
                    "evidence_id": evidence_id,
                    "files": [
                        str(report_path.relative_to(self.base_dir)),
                        str(metrics_path.relative_to(self.base_dir)),
                        str(stamp_path.relative_to(self.base_dir)),
                    ],
                }
            ]
        }
        _write_json(index_path, index_payload)

        return {
            "index": index_path,
            "report": report_path,
            "metrics": metrics_path,
            "stamp": stamp_path,
        }


def write_evidence_bundle(
    *,
    base_dir: Path,
    run_id: str,
    evidence_id: str,
    report: Mapping[str, Any],
    metrics: Mapping[str, Any],
) -> dict[str, Path]:
    return EvidenceWriter(base_dir=base_dir).write_bundle(
        run_id=run_id,
        evidence_id=evidence_id,
        report=report,
        metrics=metrics,
    )
