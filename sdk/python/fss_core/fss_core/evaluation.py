"""Offline evaluation helpers for the freshness scorer."""

from __future__ import annotations

import json
from dataclasses import dataclass
from datetime import datetime
from pathlib import Path
from typing import Sequence

from .freshness import ContentRecord, FreshnessConfig, FreshnessScorer


@dataclass(frozen=True)
class EvaluationResult:
    """Aggregate metrics for an evaluation run."""

    kernel: str
    total_questions: int
    baseline_accuracy: float
    reranked_accuracy: float


def load_dataset(path: str | Path) -> list[dict]:
    dataset_path = Path(path)
    with dataset_path.open("r", encoding="utf-8") as handle:
        payload = json.load(handle)
    if not isinstance(payload, list):
        raise ValueError("Dataset must be a list of questions")
    return payload


def _candidate_from_payload(payload: dict) -> tuple[str, float, ContentRecord]:
    record = ContentRecord(
        source=payload["metadata"]["source"],
        published_at=datetime.fromisoformat(
            payload["metadata"]["published_at"].replace("Z", "+00:00")
        ),
        last_verified_at=(
            datetime.fromisoformat(payload["metadata"]["last_verified_at"].replace("Z", "+00:00"))
            if payload["metadata"].get("last_verified_at")
            else None
        ),
    )
    return payload["id"], float(payload["relevance"]), record


def evaluate_dataset(
    dataset: Sequence[dict],
    config: FreshnessConfig,
    as_of: datetime,
    freshness_weight: float = 1.0,
) -> EvaluationResult:
    scorer = FreshnessScorer(config=config, now=as_of)
    baseline_hits = 0
    reranked_hits = 0

    for row in dataset:
        candidates = [_candidate_from_payload(item) for item in row["candidates"]]
        correct_id = row["correct_answer_id"]
        # Baseline chooses the highest relevance score.
        baseline_choice = max(candidates, key=lambda item: item[1])[0]
        reranked = scorer.rerank(candidates, freshness_weight=freshness_weight)
        reranked_choice = reranked[0].candidate_id
        if baseline_choice == correct_id:
            baseline_hits += 1
        if reranked_choice == correct_id:
            reranked_hits += 1

    total = len(dataset)
    return EvaluationResult(
        kernel=config.kernel.value,
        total_questions=total,
        baseline_accuracy=baseline_hits / total if total else 0.0,
        reranked_accuracy=reranked_hits / total if total else 0.0,
    )
