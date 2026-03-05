from __future__ import annotations

import hashlib
import json
from dataclasses import asdict, dataclass
from pathlib import Path
from statistics import mean
from typing import Iterable, Sequence

from .coordination_schema import CoordinationEvent, validate_event_stream


@dataclass(frozen=True)
class CoordinationResult:
    coordination_score: float
    handoff_completeness_ratio: float
    context_consistency_rate: float
    conflict_resolution_latency_ms: float


def _deterministic_digest(events: Iterable[CoordinationEvent]) -> str:
    payload = [asdict(event) for event in events]
    encoded = json.dumps(payload, sort_keys=True, separators=(",", ":")).encode("utf-8")
    return hashlib.sha256(encoded).hexdigest()


def score_coordination(events: Sequence[CoordinationEvent]) -> CoordinationResult:
    validate_event_stream(events)

    handoff_ratio = sum(1 for event in events if event.handoff_complete) / len(events)

    distinct_hashes = len({event.context_hash for event in events})
    context_consistency_rate = 1.0 if distinct_hashes <= 1 else 1.0 / distinct_hashes

    conflict_latency = mean(event.conflict_resolved_ms for event in events)
    latency_penalty = min(conflict_latency / 1000.0, 1.0)

    score = (
        0.5 * handoff_ratio
        + 0.35 * context_consistency_rate
        + 0.15 * (1.0 - latency_penalty)
    )

    return CoordinationResult(
        coordination_score=round(score, 6),
        handoff_completeness_ratio=round(handoff_ratio, 6),
        context_consistency_rate=round(context_consistency_rate, 6),
        conflict_resolution_latency_ms=round(float(conflict_latency), 3),
    )


def write_coordination_artifacts(
    events: Sequence[CoordinationEvent],
    output_dir: str | Path = "artifacts",
) -> CoordinationResult:
    result = score_coordination(events)
    artifact_path = Path(output_dir)
    artifact_path.mkdir(parents=True, exist_ok=True)

    digest = _deterministic_digest(events)

    report = {
        "evidence_id": events[0].evidence_id,
        "digest": digest,
        "summary": "Deterministic coordination quality report.",
        "coordination_score": result.coordination_score,
    }

    metrics = {
        "coordination_score": result.coordination_score,
        "handoff_completeness_ratio": result.handoff_completeness_ratio,
        "context_consistency_rate": result.context_consistency_rate,
        "conflict_resolution_latency_ms": result.conflict_resolution_latency_ms,
    }

    stamp = {
        "run_id": digest,
        "event_count": len(events),
    }

    (artifact_path / "coordination_report.json").write_text(
        json.dumps(report, indent=2, sort_keys=True),
        encoding="utf-8",
    )
    (artifact_path / "coordination_metrics.json").write_text(
        json.dumps(metrics, indent=2, sort_keys=True),
        encoding="utf-8",
    )
    (artifact_path / "stamp.json").write_text(
        json.dumps(stamp, indent=2, sort_keys=True),
        encoding="utf-8",
    )

    return result
