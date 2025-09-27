"""Leakage analysis primitives for OPLD."""

from __future__ import annotations

from dataclasses import dataclass, field
import json
from pathlib import Path
from typing import Dict, List, Sequence

from .detectors import DetectedEntity, DetectorPipeline


@dataclass(frozen=True)
class LogEntry:
    """A single prompt/response pair from a model run."""

    prompt_id: str
    response: str
    prompt: str | None = None


@dataclass(frozen=True)
class EntityOccurrence:
    entity: DetectedEntity
    prompt_id: str
    log_index: int

    def to_dict(self) -> dict:
        return {
            "entity_type": self.entity.entity_type,
            "value": self.entity.normalized().value,
            "detector": self.entity.detector,
            "prompt_id": self.prompt_id,
            "log_index": self.log_index,
        }


@dataclass
class EntityAggregates:
    occurrences: Dict[str, Dict[str, List[EntityOccurrence]]] = field(default_factory=dict)

    def add(self, occurrence: EntityOccurrence) -> None:
        entity_type = occurrence.entity.entity_type
        value = occurrence.entity.normalized().value
        self.occurrences.setdefault(entity_type, {}).setdefault(value, []).append(occurrence)

    def total(self) -> int:
        return sum(len(instances) for type_map in self.occurrences.values() for instances in type_map.values())

    def counts_by_type(self) -> Dict[str, int]:
        return {entity_type: sum(len(v) for v in values.values()) for entity_type, values in self.occurrences.items()}


@dataclass(frozen=True)
class PerTypeDelta:
    entity_type: str
    baseline: int
    candidate: int
    delta: int
    delta_ratio: float

    def to_dict(self) -> dict:
        return {
            "entity_type": self.entity_type,
            "baseline": self.baseline,
            "candidate": self.candidate,
            "delta": self.delta,
            "delta_ratio": self.delta_ratio,
        }


@dataclass(frozen=True)
class EntityDelta:
    entity_type: str
    value: str
    baseline_occurrences: List[dict]
    candidate_occurrences: List[dict]
    delta: int
    status: str

    def to_dict(self) -> dict:
        return {
            "entity_type": self.entity_type,
            "value": self.value,
            "baseline_occurrences": self.baseline_occurrences,
            "candidate_occurrences": self.candidate_occurrences,
            "delta": self.delta,
            "status": self.status,
        }


@dataclass(frozen=True)
class LeakReport:
    summary: dict
    per_type: List[PerTypeDelta]
    per_entity: List[EntityDelta]
    metadata: dict

    def to_dict(self) -> dict:
        return {
            "summary": self.summary,
            "per_type": [item.to_dict() for item in self.per_type],
            "per_entity": [item.to_dict() for item in self.per_entity],
            "metadata": self.metadata,
        }


def load_log(path: Path) -> List[LogEntry]:
    text = path.read_text().strip()
    if not text:
        return []
    try:
        parsed = json.loads(text)
        if isinstance(parsed, list):
            raw_entries = parsed
        elif isinstance(parsed, dict):
            if "entries" in parsed and isinstance(parsed["entries"], list):
                raw_entries = parsed["entries"]
            else:
                raw_entries = [parsed]
        else:
            raise ValueError("Unsupported JSON structure for log entries")
    except json.JSONDecodeError:
        raw_entries = [json.loads(line) for line in text.splitlines() if line.strip()]
    entries: List[LogEntry] = []
    for idx, item in enumerate(raw_entries):
        if not isinstance(item, dict):
            continue
        prompt_id = str(
            item.get("prompt_id")
            or item.get("id")
            or item.get("name")
            or item.get("hash")
            or idx
        )
        response = str(item.get("response") or item.get("output") or item.get("completion") or "")
        prompt = item.get("prompt")
        if prompt is not None:
            prompt = str(prompt)
        entries.append(LogEntry(prompt_id=prompt_id, response=response, prompt=prompt))
    return entries


def detect_entities(entries: Sequence[LogEntry], pipeline: DetectorPipeline) -> EntityAggregates:
    aggregates = EntityAggregates()
    for idx, entry in enumerate(entries):
        for entity in pipeline.detect(entry.response):
            aggregates.add(EntityOccurrence(entity=entity, prompt_id=entry.prompt_id, log_index=idx))
    return aggregates


def _delta_ratio(baseline: int, candidate: int) -> float:
    if baseline == 0 and candidate == 0:
        return 0.0
    if baseline == 0:
        return float(candidate)
    return (candidate - baseline) / baseline


def _summarize(
    baseline_aggr: EntityAggregates,
    candidate_aggr: EntityAggregates,
    threshold: float,
) -> tuple[dict, List[PerTypeDelta]]:
    baseline_total = baseline_aggr.total()
    candidate_total = candidate_aggr.total()
    delta_total = candidate_total - baseline_total
    leak_delta_score = _delta_ratio(baseline_total, candidate_total)
    ci_gate = "pass" if leak_delta_score <= threshold else "fail"

    per_type: List[PerTypeDelta] = []
    entity_types = sorted({*baseline_aggr.occurrences.keys(), *candidate_aggr.occurrences.keys()})
    baseline_counts = baseline_aggr.counts_by_type()
    candidate_counts = candidate_aggr.counts_by_type()
    for entity_type in entity_types:
        baseline_count = baseline_counts.get(entity_type, 0)
        candidate_count = candidate_counts.get(entity_type, 0)
        per_type.append(
            PerTypeDelta(
                entity_type=entity_type,
                baseline=baseline_count,
                candidate=candidate_count,
                delta=candidate_count - baseline_count,
                delta_ratio=_delta_ratio(baseline_count, candidate_count),
            )
        )

    summary = {
        "baseline_total": baseline_total,
        "candidate_total": candidate_total,
        "delta_total": delta_total,
        "leak_delta_score": round(leak_delta_score, 6),
        "threshold": threshold,
        "ci_gate": ci_gate,
    }

    return summary, per_type


def _per_entity_deltas(
    baseline_aggr: EntityAggregates,
    candidate_aggr: EntityAggregates,
) -> List[EntityDelta]:
    deltas: List[EntityDelta] = []
    entity_types = sorted({*baseline_aggr.occurrences.keys(), *candidate_aggr.occurrences.keys()})
    for entity_type in entity_types:
        baseline_values = baseline_aggr.occurrences.get(entity_type, {})
        candidate_values = candidate_aggr.occurrences.get(entity_type, {})
        all_values = sorted({*baseline_values.keys(), *candidate_values.keys()})
        for value in all_values:
            baseline_occ = baseline_values.get(value, [])
            candidate_occ = candidate_values.get(value, [])
            delta = len(candidate_occ) - len(baseline_occ)
            if delta == 0:
                continue
            status = "regression" if delta > 0 else "improvement"
            deltas.append(
                EntityDelta(
                    entity_type=entity_type,
                    value=value,
                    baseline_occurrences=[occ.to_dict() for occ in sorted(baseline_occ, key=lambda o: (o.prompt_id, o.log_index))],
                    candidate_occurrences=[occ.to_dict() for occ in sorted(candidate_occ, key=lambda o: (o.prompt_id, o.log_index))],
                    delta=delta,
                    status=status,
                )
            )
    deltas.sort(key=lambda item: (item.entity_type, item.value))
    return deltas


def compare_runs(
    baseline_entries: Sequence[LogEntry],
    candidate_entries: Sequence[LogEntry],
    pipeline: DetectorPipeline | None = None,
    threshold: float = 0.1,
    metadata: dict | None = None,
) -> LeakReport:
    pipeline = pipeline or DetectorPipeline()
    metadata = metadata or {}

    baseline_aggr = detect_entities(baseline_entries, pipeline)
    candidate_aggr = detect_entities(candidate_entries, pipeline)

    summary, per_type = _summarize(baseline_aggr, candidate_aggr, threshold)
    per_entity = _per_entity_deltas(baseline_aggr, candidate_aggr)

    return LeakReport(summary=summary, per_type=per_type, per_entity=per_entity, metadata=metadata)


def compare_paths(
    baseline_path: Path,
    candidate_path: Path,
    threshold: float = 0.1,
    pipeline: DetectorPipeline | None = None,
) -> LeakReport:
    baseline_entries = load_log(baseline_path)
    candidate_entries = load_log(candidate_path)
    metadata = {
        "baseline_path": str(baseline_path),
        "candidate_path": str(candidate_path),
        "entries": {
            "baseline": len(baseline_entries),
            "candidate": len(candidate_entries),
        },
    }
    return compare_runs(baseline_entries, candidate_entries, pipeline=pipeline, threshold=threshold, metadata=metadata)

