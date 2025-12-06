"""Telemetry ingestion and validation utilities for scaling orchestrator."""
from __future__ import annotations

import json
from pathlib import Path
from typing import Iterable, Iterator, List

from .core import Config, Experiment, Metrics
from .validation import ValidationError, validate_record


class IngestionError(RuntimeError):
    """Raised when telemetry ingestion fails."""


def load_jsonl(path: Path) -> Iterator[dict]:
    """Stream JSON objects from a JSONL file."""

    with path.open("r", encoding="utf-8") as handle:
        for line_number, line in enumerate(handle, start=1):
            if not line.strip():
                continue
            try:
                yield json.loads(line)
            except json.JSONDecodeError as exc:
                raise IngestionError(f"Invalid JSON at line {line_number}: {exc}") from exc


def parse_experiment(record: dict) -> Experiment:
    """Convert a validated raw record into an :class:`Experiment`."""

    config_dict = record["config"]
    metrics_dict = record["metrics"]
    config = Config(
        model_family=config_dict.get("model_family", "unknown"),
        parameters=float(config_dict.get("parameters", 0.0)),
        depth=config_dict.get("depth"),
        width=config_dict.get("width"),
        context_length=config_dict.get("context_length"),
        moe=bool(config_dict.get("moe", False)),
        data_mix=config_dict.get("data_mix", {}),
        learning_rate=config_dict.get("learning_rate"),
        lr_schedule=config_dict.get("lr_schedule"),
        curriculum=bool(config_dict.get("curriculum", False)),
        runtime=config_dict.get("runtime", {}),
    )

    metrics = Metrics(
        training_loss=metrics_dict.get("training_loss"),
        reasoning_score=metrics_dict.get("reasoning_score"),
        tool_success_rate=metrics_dict.get("tool_success_rate"),
        safety_score=metrics_dict.get("safety_score"),
        hallucination_rate=metrics_dict.get("hallucination_rate"),
        latency_p95_ms=metrics_dict.get("latency_p95_ms"),
        tokens_processed=metrics_dict.get("tokens_processed"),
        flops=metrics_dict.get("flops"),
    )

    return Experiment(
        id=str(record["id"]),
        config=config,
        metrics=metrics,
        hardware=record.get("hardware", {}),
        budget=record.get("budget", {}),
        tags=tuple(record.get("tags", ())),
    )


def ingest(path: Path, schema_path: Path) -> List[Experiment]:
    """Load, validate, and parse experiments from a JSONL file."""

    records: List[Experiment] = []
    for record in load_jsonl(path):
        try:
            validate_record(record, schema_path)
        except ValidationError as exc:
            raise IngestionError(f"Validation failed for experiment {record.get('id')}: {exc}") from exc
        records.append(parse_experiment(record))
    return records


def load_many(paths: Iterable[Path], schema_path: Path) -> List[Experiment]:
    """Load multiple JSONL files of experiments."""

    experiments: List[Experiment] = []
    for path in paths:
        experiments.extend(ingest(path, schema_path))
    return experiments
