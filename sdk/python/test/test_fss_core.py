from __future__ import annotations

import sys
from pathlib import Path
from datetime import datetime, timezone

sys.path.append(str(Path(__file__).resolve().parents[1] / "fss_core"))

from fss_core import (
    ContentRecord,
    DecayKernel,
    FreshnessConfig,
    FreshnessScorer,
    evaluate_dataset,
)


def test_exponential_and_hyperbolic_decay_consistency() -> None:
    config_exp = FreshnessConfig(
        default_half_life_hours=48,
        source_half_lives={"official": 24},
        kernel=DecayKernel.EXPONENTIAL,
    )
    config_hyp = config_exp.model_copy(update={"kernel": DecayKernel.HYPERBOLIC})
    now = datetime(2025, 2, 1, tzinfo=timezone.utc)
    record = ContentRecord(
        source="official",
        published_at=datetime(2025, 1, 30, tzinfo=timezone.utc),
        last_verified_at=datetime(2025, 1, 29, tzinfo=timezone.utc),
    )
    exp_score = FreshnessScorer(config_exp, now=now).score(record)
    hyp_score = FreshnessScorer(config_hyp, now=now).score(record)
    assert 0 < exp_score < hyp_score <= 1


def test_last_verified_makes_record_fresher() -> None:
    config = FreshnessConfig(default_half_life_hours=72, source_half_lives={})
    now = datetime(2025, 2, 1, tzinfo=timezone.utc)
    stale = ContentRecord(
        source="newswire",
        published_at=datetime(2025, 1, 20, tzinfo=timezone.utc),
    )
    verified = ContentRecord(
        source="newswire",
        published_at=datetime(2025, 1, 20, tzinfo=timezone.utc),
        last_verified_at=datetime(2025, 1, 29, tzinfo=timezone.utc),
    )
    scorer = FreshnessScorer(config=config, now=now)
    assert scorer.score(verified) > scorer.score(stale)


def test_reranking_improves_accuracy() -> None:
    dataset = [
        {
            "correct_answer_id": "fresh",
            "candidates": [
                {
                    "id": "stale",
                    "relevance": 0.95,
                    "metadata": {
                        "source": "newswire",
                        "published_at": "2024-04-01T00:00:00Z",
                        "last_verified_at": "2024-04-02T00:00:00Z",
                    },
                },
                {
                    "id": "fresh",
                    "relevance": 0.9,
                    "metadata": {
                        "source": "official",
                        "published_at": "2025-01-20T00:00:00Z",
                        "last_verified_at": "2025-01-21T00:00:00Z",
                    },
                },
            ],
        }
    ]
    config = FreshnessConfig(
        default_half_life_hours=72,
        source_half_lives={"official": 36, "newswire": 18},
        kernel=DecayKernel.EXPONENTIAL,
    )
    result = evaluate_dataset(
        dataset=dataset,
        config=config,
        as_of=datetime(2025, 2, 1, tzinfo=timezone.utc),
        freshness_weight=1.0,
    )
    assert result.baseline_accuracy == 0.0
    assert result.reranked_accuracy == 1.0
